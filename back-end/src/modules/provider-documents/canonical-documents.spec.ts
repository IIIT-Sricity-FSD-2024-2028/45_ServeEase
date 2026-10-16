import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppModule } from '../../app.module';
import { StateRepository } from '../state/state.repository';

// supertest ships without type declarations in this project (no @types/supertest), so it is loaded untyped.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: (server: unknown) => any = require('supertest');

// Canonical provider document registry over HTTP: discovery of every source shape, migration (dry-run,
// apply, idempotent rerun, deduplication, interruption, rollback, restart), browser import and access rules.
// Temporary state, uploads and document folders only.
const PASSWORD = 'Pass@123';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 7)]);
const PDF = Buffer.from('%PDF-1.4\n%%EOF\n', 'latin1');
const NAMES = {
  idJpeg: '1788202645898-29bc9160-7594-4524-96a5-fa33ce82c2b8.jpeg',
  addressPdf: '1788202645859-742cea73-94ec-4680-a26e-cf38a44dedf0.pdf',
  photoPng: '1788204838143-7d1ed47c-7ec0-4815-856f-15b8b84292d1.jpeg',
  script: '1788204439713-69576d3b-af21-458f-9c86-b98469ca0c6d.jpeg',
  oversized: '1788204439705-abe4ccdb-3167-45e4-8d9a-e7b83bf02672.pdf',
  gone: '1788183199452-02705def-b8a2-4abd-bfb9-db00ea0c0e06.pdf',
  sameBytes: '1791900856000-5fe25fe0-f26c-47eb-84ee-9f37d8bef13d.jpg',
};
const doc = (providerId: string, index: number, documentType: string, documentName: string, documentUrl?: string) => ({ documentId: `DOC-${providerId}-${index}`, documentType, documentName, ...(documentUrl === undefined ? {} : { documentUrl }), required: true, documentStatus: 'Pending' });
const fixture = () => [
  {
    key: 'serveEaseData',
    updatedAt: '2026-01-01T00:00:00.000Z',
    value: {
      categories: [], providers: [], popularServices: [],
      users: [
        // Documents only on the approval request (as PRO144/PRO145 in the real data).
        { id: 'PROLEG', role: 'provider', fullName: 'Legacy Pro', email: 'legacy@example.test', accountStatus: 'Active', password: PASSWORD },
        // Documents kept only in the registering browser (as PRO138-PRO140).
        { id: 'PROLOCAL', role: 'provider', fullName: 'Local Pro', email: 'local@example.test', accountStatus: 'Active', documents: [
          doc('PROLOCAL', 1, 'ID Proof - Aadhaar', 'homecleaning 4.jpg.jpeg', 'local-document://PROLOCAL/DOC-PROLOCAL-1'),
          doc('PROLOCAL', 2, 'Address Proof', 'bill.pdf', 'local-document://SOMEONEELSE/DOC-PROLOCAL-2'),
        ], password: PASSWORD },
        // Account documents win over a conflicting approval request; its file has the same bytes as PROLEG's ID.
        { id: 'PROACC', role: 'provider', fullName: 'Account Pro', email: 'account@example.test', accountStatus: 'Active', documents: [doc('PROACC', 1, 'ID Proof', 'same.jpg', `/uploads/verification/${NAMES.sameBytes}`)], password: PASSWORD },
        // A new signup whose file has not been uploaded yet.
        { id: 'PRONEW', role: 'provider', fullName: 'New Pro', email: 'new@example.test', accountStatus: 'Under Verification', documents: [doc('PRONEW', 1, 'ID Proof', 'id.png')], password: PASSWORD },
        { id: 'CUS900', role: 'customer', email: 'customer@example.test', accountStatus: 'Active', password: PASSWORD },
        { id: 'SU900', role: 'superuser', email: 'super@example.test', password: PASSWORD },
      ],
      providerApprovalRequests: [
        { id: 'PROLEG', email: 'impostor@example.test', documents: [doc('PROLEG', 9, 'ID Proof', 'wrong.jpg', `/uploads/verification/${NAMES.sameBytes}`)] },
        { id: 'PROLEG', email: 'legacy@example.test', documents: [
          doc('PROLEG', 1, 'ID Proof - PAN', 'pan card.jpeg', `/uploads/verification/${NAMES.idJpeg}`),
          doc('PROLEG', 2, 'Address Proof', 'bill.pdf', `/uploads/verification/${NAMES.addressPdf}`),
          doc('PROLEG', 3, 'Profile Photo', 'me.jpeg', `/uploads/profiles/${NAMES.photoPng}`),
          doc('PROLEG', 4, 'Skill Certificate', 'cert.jpeg', `/uploads/verification/${NAMES.script}`),
          doc('PROLEG', 5, 'Experience Proof', 'gone.pdf', `/uploads/verification/${NAMES.gone}`),
          doc('PROLEG', 6, 'ID Proof', 'escape.pdf', '/uploads/verification/../../data/state.json'),
          doc('PROLEG', 7, 'ID Proof', 'seed.pdf', '/documents/providers/PROLEG/id-proof.pdf'),
          doc('PROLEG', 8, 'Address Proof', 'huge.pdf', `/uploads/verification/${NAMES.oversized}`),
        ] },
        { id: 'PROACC', email: 'account@example.test', documents: [doc('PROACC', 1, 'ID Proof', 'other.jpg', `/uploads/verification/${NAMES.idJpeg}`)] },
        { id: 'PROGHOST', email: 'ghost@example.test', documents: [doc('PROGHOST', 1, 'ID Proof', 'ghost.pdf', `/uploads/verification/${NAMES.addressPdf}`)] },
      ],
    },
  },
  { key: 'serveEaseCanonicalBookings', updatedAt: '2026-01-01T00:00:00.000Z', value: { bookings: [{ id: 'BOOK-1', status: 'Pending' }] } },
  {
    key: 'serveEaseEmployeeModuleData',
    updatedAt: '2026-01-01T00:00:00.000Z',
    value: { employees: [
      { employeeId: 'EMP-PO-9', name: 'Provider Ops', department: 'Provider Operations', password: PASSWORD },
      { employeeId: 'EMP-CO-9', name: 'Customer Ops', department: 'Customer Operations', password: PASSWORD },
      { employeeId: 'EMP-SUP-9', name: 'Support Agent', department: 'Support', password: PASSWORD },
    ] },
  },
];

describe('Canonical provider documents (HTTP)', () => {
  const previous = { state: process.env.SERVEEASE_STATE_FILE, uploads: process.env.SERVEEASE_UPLOADS_DIR, documents: process.env.SERVEEASE_DOCUMENT_DIR };
  let dir: string;
  let uploads: string;
  let documents: string;
  let stateFile: string;
  let app: INestApplication;

  const boot = async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const next = moduleRef.createNestApplication({ logger: false });
    next.setGlobalPrefix('api');
    next.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await next.init();
    return next;
  };
  const http = () => request(app.getHttpServer());
  const auth = (tok?: string) => (tok ? { Authorization: `Bearer ${tok}` } : {});
  const token = async (body: Record<string, string>) => (await http().post('/api/auth/login').send({ password: PASSWORD, ...body })).body.data?.token as string;
  const po = () => token({ role: 'employee', employeeId: 'EMP-PO-9', department: 'Provider Operations' });
  const su = () => token({ role: 'superuser', email: 'super@example.test' });
  const binary = (call: any) => call.buffer(true).parse((response: NodeJS.ReadableStream, done: (error: Error | null, body: Buffer) => void) => { const chunks: Buffer[] = []; response.on('data', (chunk: Buffer) => chunks.push(chunk)); response.on('end', () => done(null, Buffer.concat(chunks))); });
  const preview = (tok: string | undefined, providerId: string, documentId: string) => binary(http().get(`/api/employee/provider-operations/providers/${providerId}/documents/${documentId}/preview`).set(auth(tok)));
  const json = (response: { body: Buffer }) => JSON.parse(response.body.toString());
  const list = async (tok: string, providerId: string) => (await http().get(`/api/employee/provider-operations/providers/${providerId}/documents`).set(auth(tok))).body.data as Array<Record<string, any>>;
  const migrate = (tok: string | undefined, apply?: boolean) => http().post('/api/admin/provider-documents/migrations').set(auth(tok)).send(apply === undefined ? {} : { apply });
  const stored = () => (existsSync(documents) ? readdirSync(documents).filter((name) => /^[0-9a-f]{64}\./.test(name)) : []);
  const disk = () => JSON.parse(readFileSync(stateFile, 'utf8')) as Array<{ key: string; value: any }>;
  const without = (entries: Array<{ key: string; value: any }>, key: string) => entries.filter((entry) => entry.key !== key).map(({ key: name, value }) => ({ key: name, value }));
  const importAs = (path: string, tok: string | undefined, bytes: Buffer, filename: string, contentType: string) => http().post(path).set(auth(tok)).attach('file', bytes, { filename, contentType });

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'serveease-canonical-docs-'));
    uploads = join(dir, 'uploads');
    documents = join(dir, 'provider-documents');
    stateFile = join(dir, 'state.json');
    mkdirSync(join(uploads, 'verification'), { recursive: true });
    mkdirSync(join(uploads, 'profiles'), { recursive: true });
    writeFileSync(join(uploads, 'verification', NAMES.idJpeg), JPEG);
    writeFileSync(join(uploads, 'verification', NAMES.addressPdf), PDF);
    writeFileSync(join(uploads, 'profiles', NAMES.photoPng), PNG); // .jpeg name, PNG bytes: the type comes from the bytes
    writeFileSync(join(uploads, 'verification', NAMES.script), Buffer.from('<script>alert(1)</script>'));
    writeFileSync(join(uploads, 'verification', NAMES.oversized), Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]));
    writeFileSync(join(uploads, 'verification', NAMES.sameBytes), JPEG); // identical bytes to idJpeg
    writeFileSync(stateFile, JSON.stringify(fixture()), 'utf8');
    process.env.SERVEEASE_STATE_FILE = stateFile;
    process.env.SERVEEASE_UPLOADS_DIR = uploads;
    delete process.env.SERVEEASE_DOCUMENT_DIR;
    app = await boot();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await app?.close();
    rmSync(dir, { recursive: true, force: true });
  });
  afterAll(() => {
    jest.restoreAllMocks();
    for (const [key, value] of [['SERVEEASE_STATE_FILE', previous.state], ['SERVEEASE_UPLOADS_DIR', previous.uploads], ['SERVEEASE_DOCUMENT_DIR', previous.documents]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  it('resolves every source shape to one canonical state, using the right owner, before any migration', async () => {
    const tok = await po();
    const states = (await list(tok, 'PROLEG')).map((item) => [item.documentId, item.recordOrigin, item.state, item.hasFile]);
    expect(states).toEqual([
      ['DOC-PROLEG-1', 'approval-request', 'pending-migration', false],
      ['DOC-PROLEG-2', 'approval-request', 'pending-migration', false],
      ['DOC-PROLEG-3', 'approval-request', 'pending-migration', false],
      ['DOC-PROLEG-4', 'approval-request', 'unsupported-source', false],
      ['DOC-PROLEG-5', 'approval-request', 'missing-source', false],
      ['DOC-PROLEG-6', 'approval-request', 'metadata-only', false],
      ['DOC-PROLEG-7', 'approval-request', 'metadata-only', false],
      ['DOC-PROLEG-8', 'approval-request', 'unsupported-source', false],
    ]);
    expect((await list(tok, 'PROLOCAL')).map((item) => item.state)).toEqual(['awaiting-browser-import', 'metadata-only']);
    expect((await list(tok, 'PRONEW')).map((item) => item.state)).toEqual(['awaiting-upload']);
    expect((await list(tok, 'PROACC')).map((item) => [item.documentName, item.recordOrigin])).toEqual([['same.jpg', 'account']]);
    const body = JSON.stringify(await list(tok, 'PROLEG'));
    expect(body).not.toMatch(/uploads|1788|documentUrl|storageKey|sourceReference|wrong\.jpg/);

    // Nothing is served from legacy paths at runtime: only canonical storage counts.
    const pending = await preview(tok, 'PROLEG', 'DOC-PROLEG-1');
    expect(pending.status).toBe(404);
    expect(json(pending)).toMatchObject({ state: 'pending-migration' });
    expect(json(await preview(tok, 'PROLOCAL', 'DOC-PROLOCAL-1'))).toMatchObject({ state: 'awaiting-browser-import' });
    expect(json(await preview(tok, 'PROLEG', 'DOC-PROLEG-9'))).toMatchObject({ state: 'not-found' });
  });

  it('dry-run reports without writing anything', async () => {
    const superuser = await su(); // signing in upgrades the stored password hash, so snapshot afterwards
    const before = readFileSync(stateFile, 'utf8');
    const report = (await migrate(superuser)).body.data;
    expect(report.mode).toBe('dry-run');
    expect(report.counts).toMatchObject({ migrated: 3, deduplicated: 1, 'awaiting-browser-import': 1, 'awaiting-upload': 1, 'missing-source': 1, 'unsupported-source': 2, 'metadata-only': 3, conflicts: 1, orphanRequests: 2 });
    // A request whose id matches but whose email does not belong to that account has no owner either.
    expect(report.orphanRequests).toEqual([{ providerId: 'PROLEG', email: 'impostor@example.test', documents: 1 }, { providerId: 'PROGHOST', email: 'ghost@example.test', documents: 1 }]);
    expect(report.conflicts[0]).toMatch(/PROACC\/DOC-PROACC-1: the approval request references a different file/);
    expect(report.backup).toBeNull();
    expect(readFileSync(stateFile, 'utf8')).toBe(before);
    expect(existsSync(documents)).toBe(false);
  });

  it('applies the migration: verified private copies, shared identical bytes, unchanged unrelated state, restart persistence', async () => {
    const superuser = await su(); // signing in upgrades the stored password hash, so snapshot afterwards
    const before = disk();
    const report = (await migrate(superuser, true)).body.data;
    expect(report.mode).toBe('apply');
    expect(report.consistency).toMatchObject({ registryRecords: 4, missingStoredFiles: [], unreferencedStoredFiles: 0 });
    expect(stored().sort()).toHaveLength(3); // JPEG shared by PROLEG/1 and PROACC/1, PDF, PNG
    expect(existsSync(report.backup.stateBackup)).toBe(true);
    expect(JSON.parse(readFileSync(report.backup.journal, 'utf8')).status).toBe('completed');
    // Sources are kept; only the registry entry was added to the state.
    expect(existsSync(join(uploads, 'verification', NAMES.idJpeg))).toBe(true);
    expect(without(disk(), 'serveEaseProviderDocumentRegistry')).toEqual(without(before, 'serveEaseProviderDocumentRegistry'));

    const tok = await po();
    const jpeg = await preview(tok, 'PROLEG', 'DOC-PROLEG-1');
    expect([jpeg.status, jpeg.headers['content-type'], (jpeg.body as Buffer).equals(JPEG)]).toEqual([200, 'image/jpeg', true]);
    expect(jpeg.headers['content-disposition']).toBe('inline; filename="pan card.jpeg"; filename*=UTF-8\'\'pan%20card.jpeg');
    expect(jpeg.headers['cache-control']).toBe('private, no-store, max-age=0');
    expect(jpeg.headers['x-content-type-options']).toBe('nosniff');
    expect(jpeg.headers['content-security-policy']).toContain('sandbox');
    expect((await preview(tok, 'PROLEG', 'DOC-PROLEG-3')).headers['content-type']).toBe('image/png');
    const shared = await preview(tok, 'PROACC', 'DOC-PROACC-1');
    expect([shared.status, (shared.body as Buffer).equals(JPEG)]).toEqual([200, true]);
    expect((await preview(tok, 'PROACC', 'DOC-PROLEG-1')).status).toBe(404); // shared bytes, separate ownership
    expect((await list(tok, 'PROLEG'))[0]).toMatchObject({ state: 'stored', hasFile: true, source: 'legacy-server-upload', fileType: 'image/jpeg' });

    await app.close();
    app = await boot();
    const again = await preview(await po(), 'PROLEG', 'DOC-PROLEG-2');
    expect([again.status, (again.body as Buffer).equals(PDF)]).toEqual([200, true]);
  });

  it('is idempotent and survives an interrupted run', async () => {
    const tok = await su();
    const failure = jest.spyOn(StateRepository.prototype, 'create').mockImplementationOnce(() => { throw new Error('disk full'); });
    expect((await migrate(tok, true)).status).toBe(500);
    failure.mockRestore();
    const journals = readdirSync(join(documents, 'migrations'));
    expect(JSON.parse(readFileSync(join(documents, 'migrations', journals[0]), 'utf8')).status).toBe('started');
    expect(stored()).toHaveLength(3); // copies were written before the failure

    const retry = (await migrate(tok, true)).body.data;
    expect(retry.counts).toMatchObject({ deduplicated: 4 });
    expect(stored()).toHaveLength(3);
    const rerun = (await migrate(tok, true)).body.data;
    expect(rerun.counts['already-canonical']).toBe(4);
    expect(rerun.counts.migrated ?? 0).toBe(0);
    expect(stored()).toHaveLength(3);
  });

  it('rolls an applied run back to the previous registry', async () => {
    const tok = await su();
    const report = (await migrate(tok, true)).body.data;
    const rollback = (await http().post(`/api/admin/provider-documents/migrations/${report.runId}/rollback`).set(auth(tok))).body.data;
    expect(rollback).toMatchObject({ rolledBack: true, registryRecords: 0, removedFiles: 3 });
    expect(stored()).toHaveLength(0);
    expect(json(await preview(await po(), 'PROLEG', 'DOC-PROLEG-1'))).toMatchObject({ state: 'pending-migration' });
    expect((await http().post(`/api/admin/provider-documents/migrations/${report.runId}/rollback`).set(auth(tok))).body.data.rolledBack).toBe(false);
    expect((await http().post('/api/admin/provider-documents/migrations/..%2F..%2Fstate/rollback').set(auth(tok))).status).toBe(400);
  });

  it('lets only superusers run migrations', async () => {
    for (const tok of [await po(), await token({ role: 'employee', employeeId: 'EMP-CO-9', department: 'Customer Operations' }), await token({ role: 'provider', email: 'legacy@example.test' }), await token({ role: 'customer', email: 'customer@example.test' }), undefined]) {
      expect((await migrate(tok, true)).status).toBe(403);
    }
    expect(existsSync(documents)).toBe(false);
  });

  it('imports a browser-kept file only for the exact document it belongs to', async () => {
    const tok = await po();
    const path = '/api/employee/provider-operations/providers/PROLOCAL/documents/DOC-PROLOCAL-1/browser-import';
    expect((await importAs(path, tok, JPEG, 'other name.jpeg', 'image/jpeg')).status).toBe(400); // recorded name differs
    expect((await importAs(path, tok, PDF, 'homecleaning 4.jpg.jpeg', 'image/jpeg')).status).toBe(400); // bytes are a PDF
    expect((await importAs('/api/employee/provider-operations/providers/PROLOCAL/documents/DOC-PROLOCAL-2/browser-import', tok, JPEG, 'bill.pdf', 'image/jpeg')).status).toBe(400);
    expect((await importAs('/api/employee/provider-operations/providers/PROLEG/documents/DOC-PROLEG-1/browser-import', tok, JPEG, 'pan card.jpeg', 'image/jpeg')).status).toBe(409); // not a browser record
    for (const other of [await token({ role: 'employee', employeeId: 'EMP-CO-9', department: 'Customer Operations' }), await token({ role: 'customer', email: 'customer@example.test' }), undefined]) {
      expect((await importAs(path, other, JPEG, 'homecleaning 4.jpg.jpeg', 'image/jpeg')).status).toBe(403);
    }

    const imported = await importAs(path, tok, JPEG, 'homecleaning 4.jpg.jpeg', 'image/jpeg').set({ Origin: 'http://localhost:3000' });
    expect(imported.status).toBe(201);
    expect(imported.body.data).toMatchObject({ imported: true, document: { state: 'stored', source: 'browser-import', documentName: 'homecleaning 4.jpg.jpeg' } });
    const shown = await preview(tok, 'PROLOCAL', 'DOC-PROLOCAL-1');
    expect([shown.status, (shown.body as Buffer).equals(JPEG)]).toEqual([200, true]);
    expect((await importAs(path, tok, JPEG, 'homecleaning 4.jpg.jpeg', 'image/jpeg')).body.data.imported).toBe(false); // same bytes again
    expect((await importAs(path, tok, PNG, 'homecleaning 4.jpg.jpeg', 'image/png')).status).toBe(400); // name says .jpeg, bytes are PNG
    const registry = disk().find((entry) => entry.key === 'serveEaseProviderDocumentRegistry')!.value.documents[0];
    expect(registry).toMatchObject({ providerAccountId: 'PROLOCAL', ownerEmail: 'local@example.test', source: 'browser-import', sourceReference: 'browser:http://localhost:3000' });
    expect(registry.history[0]).toMatchObject({ action: 'imported-from-browser', actor: 'Provider Operations (EMP-PO-9)' });
  });

  it('gives providers their own documents only, including their own browser import', async () => {
    const owner = await token({ role: 'provider', email: 'local@example.test' });
    const ownList = await http().get('/api/provider/verification-documents').set(auth(owner));
    expect(ownList.body.data.map((item: Record<string, string>) => item.documentId)).toEqual(['DOC-PROLOCAL-1', 'DOC-PROLOCAL-2']);
    expect((await importAs('/api/provider/verification-documents/DOC-PROLOCAL-1/browser-import', owner, JPEG, 'homecleaning 4.jpg.jpeg', 'image/jpeg')).status).toBe(201);
    const own = await binary(http().get('/api/provider/verification-documents/DOC-PROLOCAL-1/file').set(auth(owner)));
    expect([own.status, (own.body as Buffer).equals(JPEG)]).toEqual([200, true]);
    const stranger = await token({ role: 'provider', email: 'legacy@example.test' });
    expect((await binary(http().get('/api/provider/verification-documents/DOC-PROLOCAL-1/file').set(auth(stranger)))).status).toBe(404);
    expect((await importAs('/api/provider/verification-documents/DOC-PROLOCAL-1/browser-import', stranger, JPEG, 'homecleaning 4.jpg.jpeg', 'image/jpeg')).status).toBe(404);
    expect((await binary(http().get('/api/provider/verification-documents/DOC-PROLOCAL-1/file').set(auth(await po())))).status).toBe(403);
  });

  it('refuses previews to other departments, roles and spoofed headers', async () => {
    await migrate(await su(), true);
    for (const tok of [await token({ role: 'employee', employeeId: 'EMP-CO-9', department: 'Customer Operations' }), await token({ role: 'employee', employeeId: 'EMP-SUP-9', department: 'Support' }), await token({ role: 'customer', email: 'customer@example.test' }), await token({ role: 'provider', email: 'legacy@example.test' }), undefined]) {
      expect((await preview(tok, 'PROLEG', 'DOC-PROLEG-1').set({ role: 'admin', department: 'Provider Operations' })).status).toBe(403);
      expect((await http().get('/api/employee/provider-operations/providers/PROLEG/documents').set(auth(tok))).status).toBe(403);
    }
    expect((await preview(await su(), 'PROLEG', 'DOC-PROLEG-1')).status).toBe(200);
  });
});
