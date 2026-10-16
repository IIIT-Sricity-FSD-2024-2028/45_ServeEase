import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { profilePhotoRecord } from './profile-photo';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { providerAccountStatus } from '../../common/provider-account-status';
import { StateRepository } from '../state/state.repository';

// ---------------------------------------------------------------------------------------------------------
// Canonical provider document registry.
//
// Every verification document a provider has is identified by (provider account id, owner email, document
// id); the email keeps the few accounts that share an id apart. Its metadata comes from the provider account
// (or, when the account has none, from the provider's approval request: same id and email), exactly as the
// original front end's mergeProvider() resolved it. Its bytes exist only when a canonical registry record
// points at a file in private storage. Every source of bytes (secure upload, the original front end's
// server uploads, a file imported from the browser that holds a `local-document://` record) goes through
// the same validation and is written to the same content-addressed store; nothing else is ever served.
// ---------------------------------------------------------------------------------------------------------

type Account = Record<string, any>;
export type DocumentState =
  | 'stored'                  // bytes are in private canonical storage
  | 'pending-migration'       // an original server upload exists and can be migrated
  | 'awaiting-browser-import' // bytes were kept only in the registering browser's localStorage
  | 'awaiting-upload'         // registered metadata, no file uploaded yet
  | 'missing-source'          // the referenced server upload is gone
  | 'unsupported-source'      // the referenced server upload is not a PNG/JPEG/WebP/PDF document
  | 'storage-missing'         // the registry points at a stored file that is no longer on disk
  | 'metadata-only';          // only a placeholder reference was recorded
export type DocumentSource = 'secure-upload' | 'legacy-server-upload' | 'browser-import';
export type RecordOrigin = 'account' | 'approval-request';
type HistoryEvent = { at: string; action: string; actor: string; detail?: string };

export type CanonicalDocument = {
  documentId: string;
  providerAccountId: string;
  ownerEmail: string;
  providerListingId: string | null;
  documentType: string | null;
  verificationStatus: string | null;
  originalFilename: string;
  mimeType: string;
  size: number;
  sha256: string;
  storageKey: string;
  source: DocumentSource;
  sourceReference: string | null; // internal provenance (legacy path / browser origin); never returned
  recordOrigin: RecordOrigin;
  createdAt: string;
  updatedAt: string;
  history: HistoryEvent[];
};
type Registry = { version: 1; documents: CanonicalDocument[] };
type Actor = { userId: string; role: string; department?: string | null; email?: string };

const ACCOUNTS_KEY = 'serveEaseData';
export const REGISTRY_KEY = 'serveEaseProviderDocumentRegistry';
// Records written by the first version of the secure upload; read as stored records and folded into the
// registry by the migration.
export const DOCUMENT_FILES_KEY = 'serveEaseProviderDocumentFiles';

// Content-addressed keys (sha256) and the uuid keys of the first secure-upload version.
const STORAGE_KEY_PATTERN = /^(?:[0-9a-f]{64}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(png|jpg|pdf|webp)$/;
// Server-side files written by the original front end's uploads (multer `<timestamp>-<uuid><ext>`). Only this
// exact shape is accepted as a legacy reference, so a document URL can never point anywhere else on disk.
const LEGACY_UPLOAD_URL = /^\/uploads\/(verification|profiles)\/(\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:pdf|jpe?g|png|webp))$/i;
const BROWSER_REFERENCE = (account: Account, documentId: string) => `local-document://${account.id}/${documentId}`;

type FileType = { mimeType: string; extension: string; extensions: string[]; matches: (bytes: Buffer) => boolean };
const FILE_TYPES: FileType[] = [
  { mimeType: 'image/png', extension: '.png', extensions: ['.png'], matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mimeType: 'image/jpeg', extension: '.jpg', extensions: ['.jpg', '.jpeg'], matches: (bytes) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { mimeType: 'application/pdf', extension: '.pdf', extensions: ['.pdf'], matches: (bytes) => bytes.subarray(0, 5).toString('latin1') === '%PDF-' },
];
// The original front end accepted WebP for profile photos, so legacy files and browser imports may be WebP.
const WEBP: FileType = { mimeType: 'image/webp', extension: '.webp', extensions: ['.webp'], matches: (bytes) => bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP' };

export const maxDocumentBytes = () => {
  const configured = Number(process.env.SERVEEASE_DOCUMENT_MAX_BYTES);
  return Number.isInteger(configured) && configured > 0 ? configured : 5 * 1024 * 1024;
};
export const uploadsDirectory = () => resolve(process.env.SERVEEASE_UPLOADS_DIR || join(process.cwd(), 'uploads'));

// Private directory next to the persisted state file (back-end/data by default). It is outside every
// statically served folder, so files are reachable only through the authenticated API.
export function documentDirectory(): string {
  if (process.env.SERVEEASE_DOCUMENT_DIR) return resolve(process.env.SERVEEASE_DOCUMENT_DIR);
  if (process.env.SERVEEASE_STATE_FILE) return join(dirname(resolve(process.env.SERVEEASE_STATE_FILE)), 'provider-documents');
  const cwd = process.cwd();
  return resolve(cwd.toLowerCase().endsWith('back-end') ? cwd : resolve(cwd, 'back-end'), 'data', 'provider-documents');
}
const stateFilePath = () => {
  if (process.env.SERVEEASE_STATE_FILE) return resolve(process.env.SERVEEASE_STATE_FILE);
  const cwd = process.cwd();
  return resolve(cwd.toLowerCase().endsWith('back-end') ? cwd : resolve(cwd, 'back-end'), 'data', 'state.json');
};

const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();
const text = (value: unknown): string | null => (value === undefined || value === null || String(value).trim() === '' ? null : String(value).trim());
// Display name only: no directories, control characters or quotes, bounded length.
const safeName = (value: string) => basename(String(value || 'document')).replace(/[\u0000-\u001f\u007f"\\/<>:|?*]/g, '_').slice(0, 200) || 'document';
const now = () => new Date().toISOString();
const actorLabel = (actor: Actor) => (actor.role === 'superuser' ? `Superuser (${actor.userId})` : actor.role === 'provider' ? `Provider (${actor.userId})` : actor.role === 'support' ? `${actor.department || 'Employee'} (${actor.userId})` : String(actor.userId || 'system'));

const STATE_MESSAGES: Record<Exclude<DocumentState, 'stored'>, string> = {
  'pending-migration': 'This document was uploaded with the original ServeEase site and has not been moved to secure storage yet. Run the provider document migration to make it viewable.',
  'awaiting-browser-import': "This document's file was kept only in the web browser where the provider registered on the original ServeEase site. It was never sent to the server, so it cannot be previewed until it is imported from that browser.",
  'awaiting-upload': 'No file has been uploaded for this document yet.',
  'missing-source': 'The file uploaded for this document is missing from the server.',
  'unsupported-source': 'The stored file for this document is not a PNG, JPEG, WebP or PDF document, so it cannot be previewed.',
  'storage-missing': 'The stored file for this document is missing from the server.',
  'metadata-only': 'No file was uploaded for this document. Only its details were recorded, so there is nothing to preview.',
};

type Discovered = { document: Account; documentId: string; origin: RecordOrigin };
type SourceInfo = { state: Exclude<DocumentState, 'stored' | 'storage-missing'>; legacy?: { path: string; type: FileType; size: number; reference: string } };

export type MigrationOutcome = 'already-canonical' | 'migrated' | 'deduplicated' | 'awaiting-browser-import' | 'awaiting-upload' | 'missing-source' | 'unsupported-source' | 'metadata-only' | 'storage-missing' | 'failed';
export type MigrationResult = { providerAccountId: string; ownerEmail: string; documentId: string; documentName: string | null; origin: RecordOrigin; outcome: MigrationOutcome; reason: string };
export type MigrationReport = {
  runId: string;
  mode: 'dry-run' | 'apply';
  startedAt: string;
  finishedAt: string;
  counts: Record<string, number>;
  results: MigrationResult[];
  conflicts: string[];
  orphanRequests: Array<{ providerId: string; email: string | null; documents: number }>;
  consistency: { registryRecords: number; storedFiles: number; missingStoredFiles: string[]; unreferencedStoredFiles: number };
  backup: { stateBackup: string; journal: string } | null;
  rollback: string | null;
};

@Injectable()
export class ProviderDocumentsService {
  constructor(private readonly state: StateRepository) {}

  // ----- metadata -----------------------------------------------------------------------------------------

  // One provider's documents in canonical form. Never contains paths, storage keys or bytes.
  list(account: Account) {
    const registry = this.registryDocuments();
    return this.discover(account).documents.map((item) => this.view(account, item, registry));
  }

  metadata(account: Account, documentId: string) {
    const item = this.discover(account).documents.find((entry) => entry.documentId === documentId);
    if (!item) throw new NotFoundException(`Verification document "${documentId}" was not found for this provider.`);
    return this.view(account, item, this.registryDocuments());
  }

  // ----- bytes ----------------------------------------------------------------------------------------------

  // The canonical file behind one document. Only stored registry records are ever served; every other state
  // is reported with its reason (and the state) so callers can tell missing bytes from other failures.
  file(account: Account, documentId: string) {
    const item = this.discover(account).documents.find((entry) => entry.documentId === documentId);
    if (!item) throw new NotFoundException({ statusCode: 404, error: 'Not Found', message: `Verification document "${documentId}" was not found for this provider.`, state: 'not-found' });
    const record = this.recordFor(account, documentId);
    if (record) {
      const path = this.pathFor(record.storageKey);
      if (existsSync(path) && statSync(path).isFile()) return { path, mimeType: record.mimeType, size: record.size, originalFilename: record.originalFilename };
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', message: STATE_MESSAGES['storage-missing'], state: 'storage-missing' });
    }
    const source = this.sourceState(account, item.document, item.documentId);
    throw new NotFoundException({ statusCode: 404, error: 'Not Found', message: STATE_MESSAGES[source.state], state: source.state });
  }

  // The image file of the profile photo this provider submitted, for the public listing of an approved provider.
  // Callers decide eligibility; only a stored image record with an existing file is ever returned.
  publicProfilePhoto(account: Account) {
    const record = profilePhotoRecord(this.registryDocuments(), account);
    if (!record) return undefined;
    const path = this.pathFor(record.storageKey);
    return existsSync(path) && statSync(path).isFile() ? { path, mimeType: record.mimeType, size: record.size } : undefined;
  }

  // The signed-in provider's current profile photo, wherever it was recorded: the canonical stored image first,
  // then the image the original site kept on the account or listing (a data URL) or in its profile uploads.
  ownProviderPhoto(principal: { userId: string; email: string; providerCatalogId?: string }): { path?: string; bytes?: Buffer; mimeType: string; size: number } | undefined {
    const account = this.ownAccount(principal);
    const stored = this.publicProfilePhoto(account);
    if (stored) return stored;
    const listings = (this.state.findById(ACCOUNTS_KEY)?.value as { providers?: Account[] } | undefined)?.providers;
    const references = [account.profilePhoto, ...(Array.isArray(listings) ? listings : []).filter((listing) => String(listing?.ownerProviderId) === String(account.id)).map((listing) => listing.profilePhoto)];
    for (const reference of references) {
      const value = String(reference ?? '').trim();
      const data = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/);
      if (data) { const bytes = Buffer.from(data[2], 'base64'); return { bytes, mimeType: data[1], size: bytes.length }; }
      const legacy = value.match(/\/uploads\/profiles\/(\d{13}-[0-9a-f-]{36}\.(?:jpe?g|png|webp))$/i);
      if (legacy) {
        const directory = resolve(uploadsDirectory(), 'profiles');
        const path = resolve(directory, legacy[1]);
        if (path.startsWith(directory + sep) && existsSync(path) && statSync(path).isFile()) {
          const type = this.typeOf(readFileSync(path).subarray(0, 16));
          if (type?.mimeType.startsWith('image/')) return { path, mimeType: type.mimeType, size: statSync(path).size };
        }
      }
    }
    return undefined;
  }

  // ----- writes ---------------------------------------------------------------------------------------------

  // A provider replaces their own profile photo at any time (not only during verification). The image is
  // validated like every other document, stored canonically, and becomes the photo customers see on the
  // provider's listing. The profile-photo document is created on the account if it never had one.
  replaceProfilePhoto(principal: Actor & { email: string; providerCatalogId?: string }, file: Express.Multer.File | undefined) {
    const type = this.validateUpload(file, true);
    if (!type.mimeType.startsWith('image/')) throw new BadRequestException('Upload a JPG or PNG image.');
    const account = this.ownAccount(principal);
    const isPhoto = (entry: { document: Account }) => text(entry.document.documentType || entry.document.type || entry.document.label)?.replace(/[^a-z]/gi, '').toLowerCase() === 'profilephoto';
    let item = this.discover(account).documents.find(isPhoto);
    if (!item) {
      const existing = this.discover(account).documents.map((entry) => entry.document);
      const documentId = `DOC-${account.id}-PHOTO`;
      account.documents = [...existing, { documentId, documentType: 'Profile Photo', documentName: safeName(file!.originalname), documentUrl: '', required: false, documentStatus: 'Uploaded', rejectionReason: '' }];
      this.saveAccounts();
      item = this.discover(account).documents.find(isPhoto);
    }
    if (!item) throw new ConflictException('Your profile photo could not be recorded.');
    const stored = this.storeAndRegister(account, item, file!.buffer, type, {
      source: 'secure-upload', sourceReference: null, originalFilename: safeName(file!.originalname),
      event: { action: 'profile-photo-replaced', actor: actorLabel({ ...principal, role: 'provider' }) },
    });
    item.document.documentName = safeName(file!.originalname);
    this.saveAccounts();
    return this.view(account, item, this.registryDocuments(), stored);
  }

  private saveAccounts() {
    const entry = this.state.findById(ACCOUNTS_KEY);
    if (entry) this.state.update(ACCOUNTS_KEY, { value: entry.value as Record<string, unknown> });
  }

  // A provider uploads the file for one of their own documents while their account is under verification.
  // Ownership comes from the session principal, never from the request.
  upload(principal: Actor & { email: string; providerCatalogId?: string }, documentId: string, file: Express.Multer.File | undefined) {
    const type = this.validateUpload(file, true);
    const account = this.ownAccount(principal);
    if (providerAccountStatus(account) !== 'Under Verification') {
      throw new ConflictException('Verification documents can only be uploaded while the account is under verification.');
    }
    const item = this.discover(account).documents.find((entry) => entry.documentId === documentId);
    if (!item) throw new NotFoundException(`Verification document "${documentId}" was not found on your account.`);
    const stored = this.storeAndRegister(account, item, file!.buffer, type, {
      source: 'secure-upload', sourceReference: null, originalFilename: safeName(file!.originalname),
      event: { action: 'uploaded', actor: actorLabel({ ...principal, role: 'provider' }) },
    });
    return this.view(account, item, this.registryDocuments(), stored);
  }

  // Imports the bytes of a `local-document://` record from the browser that holds them (original front end,
  // same origin as that browser's localStorage). Only records that reference exactly this provider and
  // document are accepted; the recorded file name must match; provenance is kept in the record's history.
  importFromBrowser(account: Account, documentId: string, file: Express.Multer.File | undefined, actor: Actor, origin: string | null) {
    const type = this.validateUpload(file, false);
    const item = this.discover(account).documents.find((entry) => entry.documentId === documentId);
    if (!item) throw new NotFoundException(`Verification document "${documentId}" was not found for this provider.`);
    if (String(item.document.documentUrl ?? '') !== BROWSER_REFERENCE(account, documentId)) {
      throw new ConflictException('Only documents that were kept in the registering browser can be imported from a browser.');
    }
    const existing = this.recordFor(account, documentId);
    const sha256 = createHash('sha256').update(file!.buffer).digest('hex');
    if (existing && existing.sha256 === sha256) return { imported: false, document: this.view(account, item, this.registryDocuments()) };
    if (existing) throw new ConflictException('This document already has a stored file; it was not replaced.');
    const recordedName = text(item.document.documentName);
    if (recordedName && safeName(file!.originalname) !== safeName(recordedName)) {
      throw new BadRequestException(`The file from this browser ("${safeName(file!.originalname)}") does not match the recorded document "${recordedName}".`);
    }
    const stored = this.storeAndRegister(account, item, file!.buffer, type, {
      source: 'browser-import', sourceReference: origin ? `browser:${String(origin).slice(0, 100)}` : 'browser',
      originalFilename: safeName(recordedName || file!.originalname),
      event: { action: 'imported-from-browser', actor: actorLabel(actor), detail: origin ? `origin ${String(origin).slice(0, 100)}` : undefined },
    });
    return { imported: true, document: this.view(account, item, this.registryDocuments(), stored) };
  }

  // ----- migration ------------------------------------------------------------------------------------------

  // Idempotent consolidation of every recoverable file into canonical storage. Dry-run unless `apply`.
  // Apply: backs up the state file, journals the run, copies and verifies each file (content-addressed, so
  // retries and interrupted runs never duplicate bytes), then writes the registry in a single update.
  migrate({ apply, actor }: { apply: boolean; actor: string }): MigrationReport {
    const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
    const startedAt = now();
    const previousRegistry = this.readRegistry();
    const registry = this.registryDocuments();
    const next = [...registry];
    const results: MigrationResult[] = [];
    const conflicts: string[] = [];
    const created: string[] = [];
    const planned = new Set<string>(registry.map((record) => record.storageKey)); // content keys stored or planned in this run
    let backup: MigrationReport['backup'] = null;

    if (apply) {
      const migrations = join(documentDirectory(), 'migrations');
      mkdirSync(migrations, { recursive: true });
      const stateBackup = join(dirname(stateFilePath()), 'backups', `state-before-documents-${runId}.json`);
      mkdirSync(dirname(stateBackup), { recursive: true });
      if (existsSync(stateFilePath())) copyFileSync(stateFilePath(), stateBackup);
      backup = { stateBackup, journal: join(migrations, `${runId}.json`) };
      this.writeJournal(backup.journal, { runId, status: 'started', startedAt, actor, previousRegistry, created });
    }

    for (const account of this.providerAccounts()) {
      const discovered = this.discover(account);
      conflicts.push(...discovered.conflicts);
      for (const item of discovered.documents) {
        const base = { providerAccountId: String(account.id), ownerEmail: lower(account.email), documentId: item.documentId, documentName: text(item.document.documentName), origin: item.origin };
        const existing = next.find((record) => this.sameDocument(record, account, item.documentId));
        if (existing) {
          const path = this.pathFor(existing.storageKey);
          const ok = existsSync(path) && statSync(path).isFile();
          results.push({ ...base, outcome: ok ? 'already-canonical' : 'storage-missing', reason: ok ? `Stored (${existing.source}).` : STATE_MESSAGES['storage-missing'] });
          continue;
        }
        const source = this.sourceState(account, item.document, item.documentId);
        if (source.state !== 'pending-migration') {
          results.push({ ...base, outcome: source.state, reason: STATE_MESSAGES[source.state] });
          continue;
        }
        if (!source.legacy) continue;
        try {
          const bytes = readFileSync(source.legacy.path);
          const sha256 = createHash('sha256').update(bytes).digest('hex');
          const storageKey = `${sha256}${source.legacy.type.extension}`;
          const duplicate = planned.has(storageKey) || existsSync(this.pathFor(storageKey));
          planned.add(storageKey);
          if (apply) {
            if (this.writeContent(storageKey, bytes)) { created.push(storageKey); this.writeJournal(backup!.journal, { runId, status: 'started', startedAt, actor, previousRegistry, created }); }
            next.push(this.newRecord(account, item, { storageKey, sha256, size: bytes.length, mimeType: source.legacy.type.mimeType, source: 'legacy-server-upload', sourceReference: source.legacy.reference, originalFilename: safeName(text(item.document.documentName) || basename(source.legacy.path)), event: { action: 'migrated', actor, detail: `from ${source.legacy.reference}` } }));
          }
          results.push({ ...base, outcome: duplicate ? 'deduplicated' : 'migrated', reason: `${apply ? 'Copied' : 'Will copy'} ${source.legacy.reference} (${source.legacy.type.mimeType}, ${bytes.length} bytes)${duplicate ? '; identical bytes are already stored and are shared, ownership is not' : ''}.` });
        } catch (error) {
          results.push({ ...base, outcome: 'failed', reason: `Could not read the source file: ${(error as Error).message}` });
        }
      }
    }

    if (apply && (next.length !== registry.length || !this.readRegistryExact())) {
      this.saveRegistry(next);
    }
    const orphanRequests = this.orphanRequests();
    const counts: Record<string, number> = { discovered: results.length };
    for (const result of results) counts[result.outcome] = (counts[result.outcome] || 0) + 1;
    counts.conflicts = conflicts.length;
    counts.orphanRequests = orphanRequests.length;
    const report: MigrationReport = {
      runId, mode: apply ? 'apply' : 'dry-run', startedAt, finishedAt: now(), counts, results, conflicts, orphanRequests,
      consistency: this.consistency(apply ? next : registry), backup,
      rollback: apply ? `npm run documents:migrate -- --rollback ${runId}  (or POST /api/admin/provider-documents/migrations/${runId}/rollback)` : null,
    };
    if (apply) this.writeJournal(backup!.journal, { runId, status: 'completed', startedAt, finishedAt: report.finishedAt, actor, previousRegistry, created, counts });
    return report;
  }

  // Restores the registry as it was before a migration run and removes files that run created and nothing
  // references any more. Source files are never touched by migration, so nothing else needs restoring.
  rollback(runId: string) {
    if (!/^[0-9TZ-]{20,40}-[0-9a-f]{8}$/.test(runId)) throw new BadRequestException('Invalid migration run id.');
    const journalPath = join(documentDirectory(), 'migrations', `${runId}.json`);
    if (!existsSync(journalPath)) throw new NotFoundException(`Migration run "${runId}" was not found.`);
    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { previousRegistry: Registry | null; created: string[]; status: string };
    if (journal.status === 'rolled-back') return { runId, rolledBack: false, reason: 'Already rolled back.' };
    const restored = journal.previousRegistry?.documents || [];
    if (journal.previousRegistry) this.saveRegistry(restored);
    else if (this.state.findById(REGISTRY_KEY)) this.state.delete(REGISTRY_KEY);
    const removed = (journal.created || []).filter((key) => !restored.some((record) => record.storageKey === key));
    removed.forEach((key) => this.removeQuietly(key));
    this.writeJournal(journalPath, { ...journal, status: 'rolled-back', rolledBackAt: now() });
    return { runId, rolledBack: true, registryRecords: restored.length, removedFiles: removed.length };
  }

  // ----- discovery and resolution -------------------------------------------------------------------------

  // The provider's documents: the account's own list, else the approval request(s) with the same id and email
  // (original mergeProvider()). Request entries that disagree with the account's are reported as conflicts.
  private discover(account: Account): { documents: Discovered[]; conflicts: string[] } {
    const conflicts: string[] = [];
    const normalise = (list: unknown, origin: RecordOrigin) => (Array.isArray(list) ? list : [])
      .filter((document) => document && typeof document === 'object')
      .map((document: Account, index: number) => ({ document, documentId: text(document.documentId) || `document-${index + 1}`, origin }));
    const own = normalise(account.documents, 'account');
    const fromRequests = this.approvalRequests().filter((request) => this.ownsRequest(account, request)).flatMap((request) => normalise(request.documents, 'approval-request'));
    const chosen = own.length ? own : fromRequests;
    const seen = new Map<string, Discovered>();
    for (const item of chosen) {
      if (seen.has(item.documentId)) { conflicts.push(`${account.id}/${item.documentId}: duplicate document id on the ${item.origin}; the first entry is used.`); continue; }
      seen.set(item.documentId, item);
    }
    if (own.length) {
      for (const item of fromRequests) {
        const mine = seen.get(item.documentId);
        if (mine && String(mine.document.documentUrl ?? '') !== String(item.document.documentUrl ?? '')) {
          conflicts.push(`${account.id}/${item.documentId}: the approval request references a different file than the account; the account record is used.`);
        }
      }
    }
    return { documents: [...seen.values()], conflicts };
  }

  private sourceState(account: Account, document: Account, documentId: string): SourceInfo {
    const url = String(document?.documentUrl ?? '').trim();
    if (url.startsWith('local-document://')) return { state: url === BROWSER_REFERENCE(account, documentId) ? 'awaiting-browser-import' : 'metadata-only' };
    const match = url.match(LEGACY_UPLOAD_URL);
    if (match) {
      const directory = resolve(uploadsDirectory(), match[1].toLowerCase());
      const path = resolve(directory, match[2]);
      if (!path.startsWith(directory + sep) || !existsSync(path) || !statSync(path).isFile()) return { state: 'missing-source' };
      const size = statSync(path).size;
      if (!size || size > maxDocumentBytes()) return { state: 'unsupported-source' };
      const type = this.typeOf(readFileSync(path).subarray(0, 16));
      if (!type) return { state: 'unsupported-source' };
      return { state: 'pending-migration', legacy: { path, type, size, reference: `/uploads/${match[1].toLowerCase()}/${match[2]}` } };
    }
    if (!url) return { state: 'awaiting-upload' };
    return { state: 'metadata-only' };
  }

  private view(account: Account, item: Discovered, registry: CanonicalDocument[], stored?: CanonicalDocument) {
    const record = stored || registry.find((entry) => this.sameDocument(entry, account, item.documentId));
    let state: DocumentState;
    if (record) state = existsSync(this.pathFor(record.storageKey)) ? 'stored' : 'storage-missing';
    else state = this.sourceState(account, item.document, item.documentId).state;
    return {
      documentId: item.documentId,
      documentType: text(item.document.documentType || item.document.type || item.document.label),
      documentName: text(record?.originalFilename || item.document.documentName || item.document.fileName || item.document.name),
      documentStatus: text(item.document.documentStatus || item.document.status),
      required: item.document.required === true,
      rejectionReason: text(item.document.rejectionReason),
      recordOrigin: item.origin,
      state,
      hasFile: state === 'stored',
      fileType: state === 'stored' ? record!.mimeType : null,
      fileSize: state === 'stored' ? record!.size : null,
      source: record?.source ?? null,
      uploadedAt: text(record?.updatedAt || item.document.uploadedAt),
      unavailableReason: state === 'stored' ? null : state,
      message: state === 'stored' ? null : STATE_MESSAGES[state],
    };
  }

  // ----- storage --------------------------------------------------------------------------------------------

  private storeAndRegister(account: Account, item: Discovered, bytes: Buffer, type: FileType, options: { source: DocumentSource; sourceReference: string | null; originalFilename: string; event: Omit<HistoryEvent, 'at'> }) {
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const storageKey = `${sha256}${type.extension}`;
    const createdFile = this.writeContent(storageKey, bytes);
    const registry = this.registryDocuments();
    const previous = registry.find((record) => this.sameDocument(record, account, item.documentId));
    const record = this.newRecord(account, item, { storageKey, sha256, size: bytes.length, mimeType: type.mimeType, ...options }, previous);
    const next = [...registry.filter((entry) => entry !== previous), record];
    try {
      this.saveRegistry(next);
    } catch (error) {
      // The record was not persisted: remove a file this call created so no orphan is left behind.
      if (createdFile && !registry.some((entry) => entry.storageKey === storageKey)) this.removeQuietly(storageKey);
      throw error;
    }
    if (previous && previous.storageKey !== storageKey && !next.some((entry) => entry.storageKey === previous.storageKey)) this.removeQuietly(previous.storageKey);
    return record;
  }

  private newRecord(account: Account, item: Discovered, file: { storageKey: string; sha256: string; size: number; mimeType: string; source: DocumentSource; sourceReference: string | null; originalFilename: string; event: Omit<HistoryEvent, 'at'> }, previous?: CanonicalDocument): CanonicalDocument {
    const at = now();
    return {
      documentId: item.documentId,
      providerAccountId: String(account.id),
      ownerEmail: lower(account.email),
      providerListingId: text(account.providerCatalogId),
      documentType: text(item.document.documentType),
      verificationStatus: text(item.document.documentStatus || item.document.status),
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      size: file.size,
      sha256: file.sha256,
      storageKey: file.storageKey,
      source: file.source,
      sourceReference: file.sourceReference,
      recordOrigin: item.origin,
      createdAt: previous?.createdAt || at,
      updatedAt: at,
      history: [{ at, ...file.event }, ...(previous?.history || [])].slice(0, 50),
    };
  }

  // Writes bytes under a content-addressed key (temp file + rename). Returns false when identical bytes
  // were already stored (deduplicated).
  private writeContent(storageKey: string, bytes: Buffer): boolean {
    const target = this.pathFor(storageKey);
    if (existsSync(target)) {
      if (createHash('sha256').update(readFileSync(target)).digest('hex') === storageKey.slice(0, 64)) return false;
      unlinkSync(target); // a corrupted copy under a content key is replaced
    }
    mkdirSync(documentDirectory(), { recursive: true });
    const temporary = `${target}.tmp-${randomUUID()}`;
    writeFileSync(temporary, bytes, { flag: 'wx' });
    renameSync(temporary, target);
    if (createHash('sha256').update(readFileSync(target)).digest('hex') !== storageKey.slice(0, 64)) {
      unlinkSync(target);
      throw new Error('The stored copy failed verification.');
    }
    return true;
  }

  // Only server-generated keys are ever turned into a path, and the result must stay inside the directory.
  private pathFor(storageKey: string): string {
    if (!STORAGE_KEY_PATTERN.test(storageKey)) throw new NotFoundException(STATE_MESSAGES['storage-missing']);
    const directory = documentDirectory();
    const path = resolve(directory, storageKey);
    if (!path.startsWith(directory + sep)) throw new NotFoundException(STATE_MESSAGES['storage-missing']);
    return path;
  }

  private removeQuietly(storageKey: string) {
    try { unlinkSync(this.pathFor(storageKey)); } catch { /* already gone */ }
  }

  // ----- validation ---------------------------------------------------------------------------------------

  private validateUpload(file: Express.Multer.File | undefined, checkDeclaredType: boolean): FileType {
    if (!file || !Buffer.isBuffer(file.buffer) || !file.size) throw new BadRequestException('A non-empty file is required.');
    if (file.size > maxDocumentBytes()) throw new BadRequestException(`The file is larger than the ${Math.floor(maxDocumentBytes() / (1024 * 1024))} MB limit.`);
    const extension = extname(String(file.originalname || '')).toLowerCase();
    const type = this.typeOf(file.buffer, checkDeclaredType ? FILE_TYPES : [...FILE_TYPES, WEBP]);
    if (!type) throw new BadRequestException('Unsupported file. Upload a PNG, JPEG or PDF document.');
    if (!type.extensions.includes(extension)) throw new BadRequestException('The file name extension does not match the file contents.');
    const declared = lower(file.mimetype);
    if (declared !== type.mimeType && !(type.mimeType === 'image/jpeg' && declared === 'image/jpg')) {
      throw new BadRequestException('The declared file type does not match the file contents.');
    }
    return type;
  }

  private typeOf(bytes: Buffer, types: FileType[] = [...FILE_TYPES, WEBP]) {
    return types.find((candidate) => candidate.matches(bytes)) || null;
  }

  // ----- state access ---------------------------------------------------------------------------------------

  private ownAccount(principal: { userId: string; email: string; providerCatalogId?: string }): Account {
    const matches = this.providerAccounts().filter((account) => String(account.id) === String(principal.userId)
      && lower(account.email) === lower(principal.email)
      && (!principal.providerCatalogId || String(account.providerCatalogId || '') === principal.providerCatalogId));
    if (matches.length !== 1) throw new ForbiddenException('Your provider account could not be identified.');
    return matches[0];
  }

  // The signed-in provider's own account (provider-side document routes).
  ownProviderAccount(principal: { userId: string; email: string; providerCatalogId?: string }) {
    return this.ownAccount(principal);
  }

  private providerAccounts(): Account[] {
    const value = this.state.findById(ACCOUNTS_KEY)?.value as { users?: Account[] } | undefined;
    return (Array.isArray(value?.users) ? value!.users! : []).filter((account) => account?.role === 'provider');
  }

  private approvalRequests(): Account[] {
    const value = this.state.findById(ACCOUNTS_KEY)?.value as { providerApprovalRequests?: Account[] } | undefined;
    return Array.isArray(value?.providerApprovalRequests) ? value!.providerApprovalRequests!.filter((request) => request && typeof request === 'object') : [];
  }

  private ownsRequest(account: Account, request: Account) {
    return String(request.id ?? request.providerId ?? '') === String(account.id) && lower(account.email) !== '' && lower(request.email) === lower(account.email);
  }

  private orphanRequests() {
    const accounts = this.providerAccounts();
    return this.approvalRequests()
      .filter((request) => Array.isArray(request.documents) && request.documents.length && !accounts.some((account) => this.ownsRequest(account, request)))
      .map((request) => ({ providerId: String(request.id ?? request.providerId ?? ''), email: text(request.email), documents: request.documents.length }));
  }

  private sameDocument(record: CanonicalDocument, account: Account, documentId: string) {
    return record.providerAccountId === String(account.id) && record.ownerEmail === lower(account.email) && record.documentId === documentId;
  }

  private recordFor(account: Account, documentId: string) {
    return this.registryDocuments().find((record) => this.sameDocument(record, account, documentId));
  }

  private readRegistry(): Registry | null {
    const value = this.state.findById(REGISTRY_KEY)?.value as Registry | undefined;
    return value && Array.isArray(value.documents) ? JSON.parse(JSON.stringify(value)) as Registry : null;
  }
  private readRegistryExact() { return Boolean(this.state.findById(REGISTRY_KEY)); }

  // Registry records plus records from the first secure-upload version that are not in the registry yet.
  private registryDocuments(): CanonicalDocument[] {
    const documents = (this.readRegistry()?.documents || []).filter((record) => record && STORAGE_KEY_PATTERN.test(String(record.storageKey)));
    const firstVersion = this.state.findById(DOCUMENT_FILES_KEY)?.value as { files?: Array<Record<string, any>> } | undefined;
    for (const file of Array.isArray(firstVersion?.files) ? firstVersion!.files! : []) {
      if (!file || !STORAGE_KEY_PATTERN.test(String(file.storageKey))) continue;
      if (documents.some((record) => record.providerAccountId === String(file.providerId) && record.ownerEmail === lower(file.ownerEmail) && record.documentId === String(file.documentId))) continue;
      documents.push({
        documentId: String(file.documentId), providerAccountId: String(file.providerId), ownerEmail: lower(file.ownerEmail), providerListingId: null,
        documentType: null, verificationStatus: null, originalFilename: safeName(String(file.originalFilename || 'document')), mimeType: String(file.mimeType),
        size: Number(file.size) || 0, sha256: String(file.sha256 || ''), storageKey: String(file.storageKey), source: 'secure-upload', sourceReference: null,
        recordOrigin: 'account', createdAt: String(file.uploadedAt || now()), updatedAt: String(file.uploadedAt || now()), history: [{ at: String(file.uploadedAt || now()), action: 'uploaded', actor: `Provider (${file.providerId})` }],
      });
    }
    return documents;
  }

  private saveRegistry(documents: CanonicalDocument[]) {
    const value: Registry = { version: 1, documents };
    if (this.state.findById(REGISTRY_KEY)) this.state.update(REGISTRY_KEY, { value: value as unknown as Record<string, unknown> });
    else this.state.create({ key: REGISTRY_KEY, value: value as unknown as Record<string, unknown> });
  }

  private consistency(records: CanonicalDocument[]) {
    const directory = documentDirectory();
    const files = existsSync(directory) ? readdirSync(directory).filter((name) => STORAGE_KEY_PATTERN.test(name)) : [];
    return {
      registryRecords: records.length,
      storedFiles: files.length,
      missingStoredFiles: records.filter((record) => !files.includes(record.storageKey)).map((record) => `${record.providerAccountId}/${record.documentId}`),
      unreferencedStoredFiles: files.filter((name) => !records.some((record) => record.storageKey === name)).length,
    };
  }

  private writeJournal(path: string, journal: Record<string, unknown>) {
    const temporary = `${path}.tmp`;
    writeFileSync(temporary, JSON.stringify(journal, null, 2), 'utf8');
    renameSync(temporary, path);
  }
}
