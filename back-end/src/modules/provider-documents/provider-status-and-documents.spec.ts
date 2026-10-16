import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppModule } from '../../app.module';
import { StateRepository } from '../state/state.repository';

// supertest ships without type declarations in this project (no @types/supertest), so it is loaded untyped.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: (server: unknown) => any = require('supertest');

// HTTP-level tests through the real AppModule (guards, pipes, multer, controllers, services) on a temporary
// state file and a temporary private document directory. No real data is touched.
const PASSWORD = 'Pass@123';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n', 'latin1');
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64, 1)]);
const doc = (providerId: string, index: number, documentType: string) => ({ documentId: `DOC-${providerId}-${index}`, documentType, documentName: `${documentType}.png`, documentUrl: `local-document://${providerId}/DOC-${providerId}-${index}`, required: true, documentStatus: 'Pending' });
const fixture = () => [
  {
    key: 'serveEaseData',
    updatedAt: '2026-01-01T00:00:00.000Z',
    value: {
      categories: [{ id: 'plumbing', name: 'Plumbing', icon: '🔧', subServices: ['Tap Repair'] }],
      providers: [{ id: 'fixers', name: 'Fixers', category: 'plumbing', subServices: ['Tap Repair'], years: 3, rating: 4.5, reviews: 10, distance: '1 km', startingPrice: 300, location: 'Chennai', jobsDone: 5, availableToday: true, verified: true, cityId: 1, image: 'x.jpg', ownerProviderId: 'PROACT' }],
      popularServices: [],
      users: [
        { id: 'PROACT', role: 'provider', fullName: 'Active Pro', email: 'active@example.test', providerCatalogId: 'fixers', approvalStatus: 'Active', verificationStatus: 'Verified', accountStatus: 'Active', status: 'Active', password: PASSWORD },
        { id: 'PROOTHER', role: 'provider', fullName: 'Other Pro', email: 'other@example.test', accountStatus: 'Active', password: PASSWORD },
        { id: 'PROPEND', role: 'provider', fullName: 'Pending Pro', email: 'pending@example.test', accountStatus: 'Under Verification', approvalStatus: 'Pending Approval', verificationStatus: 'Pending', documents: [doc('PROPEND', 1, 'ID Proof'), doc('PROPEND', 2, 'Address Proof'), doc('PROPEND', 3, 'Profile Photo')], password: PASSWORD },
        { id: 'PROPEND2', role: 'provider', fullName: 'Pending Two', email: 'pending2@example.test', accountStatus: 'Under Verification', documents: [doc('PROPEND2', 1, 'ID Proof')], password: PASSWORD },
        { id: 'PROREJ', role: 'provider', fullName: 'Rejected Pro', email: 'rejected@example.test', accountStatus: 'Verification Rejected', password: PASSWORD },
        { id: 'CUS900', role: 'customer', email: 'customer@example.test', accountStatus: 'Active', password: PASSWORD },
        { id: 'SU900', role: 'superuser', email: 'super@example.test', password: PASSWORD },
      ],
      providerApprovalRequests: [],
    },
  },
  {
    key: 'serveEaseEmployeeModuleData',
    updatedAt: '2026-01-01T00:00:00.000Z',
    value: { employees: [
      { employeeId: 'EMP-CO-9', name: 'Customer Ops', department: 'Customer Operations', password: PASSWORD },
      { employeeId: 'EMP-PO-9', name: 'Provider Ops', department: 'Provider Operations', password: PASSWORD },
      { employeeId: 'EMP-SUP-9', name: 'Support Agent', department: 'Support', password: PASSWORD },
    ] },
  },
];

describe('Provider suspension and verification documents (HTTP)', () => {
  const previous = { state: process.env.SERVEEASE_STATE_FILE, documents: process.env.SERVEEASE_DOCUMENT_DIR };
  let dir: string;
  let stateFile: string;
  let documentDir: string;
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
  const login = async (body: Record<string, string>) => {
    const response = await http().post('/api/auth/login').send({ password: PASSWORD, ...body });
    return { status: response.status, message: response.body.message, token: response.body.data?.token as string };
  };
  const employee = async (employeeId: string, department: string) => (await login({ role: 'employee', employeeId, department })).token;
  const user = async (role: string, email: string) => (await login({ role, email })).token;
  const auth = (token?: string) => (token ? { Authorization: `Bearer ${token}` } : {});
  const setStatus = (token: string | undefined, id: string, body: Record<string, unknown>, headers: Record<string, string> = {}) => http().patch(`/api/employee/provider-operations/providers/${id}/status`).set({ ...auth(token), ...headers }).send(body);
  const upload = (token: string | undefined, documentId: string, file: Buffer, filename: string, contentType: string) => http().post(`/api/provider/verification-documents/${documentId}/file`).set(auth(token)).attach('file', file, { filename, contentType });
  const preview = (token: string | undefined, providerId: string, documentId: string) => http().get(`/api/employee/provider-operations/providers/${providerId}/documents/${documentId}/preview`).set(auth(token)).buffer(true).parse((response: NodeJS.ReadableStream, done: (error: Error | null, body: Buffer) => void) => { const chunks: Buffer[] = []; response.on('data', (chunk: Buffer) => chunks.push(chunk)); response.on('end', () => done(null, Buffer.concat(chunks))); });
  const disk = () => JSON.parse(readFileSync(stateFile, 'utf8')) as Array<{ key: string; value: any }>;
  const account = (id: string) => disk().find((entry) => entry.key === 'serveEaseData')!.value.users.find((item: { id: string }) => item.id === id);
  const storedFiles = () => (existsSync(documentDir) ? readdirSync(documentDir) : []);

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'serveease-provider-files-'));
    stateFile = join(dir, 'state.json');
    documentDir = join(dir, 'provider-documents');
    writeFileSync(stateFile, JSON.stringify(fixture()), 'utf8');
    process.env.SERVEEASE_STATE_FILE = stateFile;
    delete process.env.SERVEEASE_DOCUMENT_DIR;
    app = await boot();
  });
  afterEach(async () => {
    await app?.close();
    rmSync(dir, { recursive: true, force: true });
  });
  afterAll(() => {
    jest.restoreAllMocks();
    if (previous.state === undefined) delete process.env.SERVEEASE_STATE_FILE; else process.env.SERVEEASE_STATE_FILE = previous.state;
    if (previous.documents === undefined) delete process.env.SERVEEASE_DOCUMENT_DIR; else process.env.SERVEEASE_DOCUMENT_DIR = previous.documents;
  });

  describe('provider suspension', () => {
    it('lets Provider Operations suspend and reactivate, ends the provider\'s sessions and blocks sign-in while suspended', async () => {
      const po = await employee('EMP-PO-9', 'Provider Operations');
      const providerSession = await user('provider', 'active@example.test');
      const otherProvider = await user('provider', 'other@example.test');
      expect((await http().get('/api/bookings/provider').set(auth(providerSession))).status).toBe(200);

      const credentialBefore = account('PROACT').passwordHash;
      expect(credentialBefore).toEqual(expect.any(String));
      const suspended = await setStatus(po, 'PROACT', { status: 'Suspended', reason: 'Repeated no-shows', remarks: 'Ops review' });
      expect(suspended.status).toBe(200);
      expect(suspended.body.data).toMatchObject({ changed: true, provider: { id: 'PROACT', accountStatus: 'Suspended', verificationStatus: 'Verified' } });
      expect(suspended.body.data.history[0]).toMatchObject({ action: 'Provider suspended', previousStatus: 'Active', newStatus: 'Suspended', reason: 'Repeated no-shows', remarks: 'Ops review', performedBy: 'Provider Operations' });
      expect(JSON.stringify(suspended.body)).not.toMatch(/password|Pass@123|performedById/);
      expect(account('PROACT')).toMatchObject({ accountStatus: 'Suspended', status: 'Suspended', verificationStatus: 'Verified', suspensionReason: 'Repeated no-shows', role: 'provider', email: 'active@example.test', providerCatalogId: 'fixers', passwordHash: credentialBefore });

      // Existing session: protected provider actions and session restore are refused.
      const blocked = await http().get('/api/bookings/provider').set(auth(providerSession));
      expect(blocked.status).toBe(403);
      expect((await http().get('/api/auth/session').set(auth(providerSession))).status).toBeGreaterThanOrEqual(400);
      // New sign-in is refused with a clear message, after the password check.
      expect(await login({ role: 'provider', email: 'active@example.test' })).toMatchObject({ status: 403, message: expect.stringContaining('currently suspended') });
      expect((await http().post('/api/auth/login').send({ role: 'provider', email: 'active@example.test', password: 'Wrong@123' })).status).toBe(401);
      // Unrelated sessions keep working; public discovery is unchanged.
      expect((await http().get('/api/bookings/provider').set(auth(otherProvider))).status).toBe(200);
      expect((await http().get('/api/employee/provider-operations/providers').set(auth(po))).status).toBe(200);

      expect((await setStatus(po, 'PROACT', { status: 'Suspended', reason: 'Again' })).body.data.changed).toBe(false);
      expect(account('PROACT').statusHistory).toHaveLength(1);

      const activated = await setStatus(po, 'PROACT', { status: 'Active', reason: 'Review closed' });
      expect(activated.body.data).toMatchObject({ changed: true, provider: { accountStatus: 'Active' } });
      expect(account('PROACT').suspensionReason).toBeUndefined();
      expect((await http().get('/api/auth/session').set(auth(providerSession))).status).toBeGreaterThanOrEqual(400);
      const fresh = await user('provider', 'active@example.test');
      expect((await http().get('/api/bookings/provider').set(auth(fresh))).status).toBe(200);
    });

    it('persists the status across a restart', async () => {
      const po = await employee('EMP-PO-9', 'Provider Operations');
      expect((await setStatus(po, 'PROACT', { status: 'Suspended', reason: 'Restart check' })).status).toBe(200);
      await app.close();
      app = await boot();
      const again = await employee('EMP-PO-9', 'Provider Operations');
      expect((await http().get('/api/employee/provider-operations/providers/PROACT').set(auth(again))).body.data.provider.accountStatus).toBe('Suspended');
      expect((await login({ role: 'provider', email: 'active@example.test' })).status).toBe(403);
    });

    it('allows a superuser and refuses every other caller, including spoofed headers', async () => {
      const su = await user('superuser', 'super@example.test');
      expect((await setStatus(su, 'PROOTHER', { status: 'Suspended', reason: 'Superuser check' })).status).toBe(200);
      expect(account('PROOTHER').statusHistory[0]).toMatchObject({ performedBy: 'Superuser', performedById: 'SU900' });

      const callers = [await employee('EMP-CO-9', 'Customer Operations'), await employee('EMP-SUP-9', 'Support'), await user('customer', 'customer@example.test'), await user('provider', 'active@example.test'), undefined];
      for (const token of callers) {
        const response = await setStatus(token, 'PROACT', { status: 'Suspended', reason: 'Not allowed' }, { role: 'admin', department: 'Provider Operations', 'user-id': 'SU900' });
        expect(response.status).toBe(403);
      }
      expect(account('PROACT').accountStatus).toBe('Active');
    });

    it('validates ids, targets and the request body', async () => {
      const po = await employee('EMP-PO-9', 'Provider Operations');
      expect((await setStatus(po, 'bad id!', { status: 'Suspended', reason: 'x' })).status).toBe(400);
      expect((await setStatus(po, 'PRO404', { status: 'Suspended', reason: 'x' })).status).toBe(404);
      expect((await setStatus(po, 'CUS900', { status: 'Suspended', reason: 'x' })).status).toBe(404);
      expect((await setStatus(po, 'SU900', { status: 'Suspended', reason: 'x' })).status).toBe(404);
      expect((await setStatus(po, 'PROPEND', { status: 'Suspended', reason: 'x' })).status).toBe(409);
      expect((await setStatus(po, 'PROREJ', { status: 'Active', reason: 'x' })).status).toBe(409);
      for (const body of [{ status: 'Blocked', reason: 'x' }, { status: 'Suspended' }, { status: 'Suspended', reason: '   ' }, { status: 'Suspended', reason: 'x', role: 'superuser' }, { status: 'Suspended', reason: 'x'.repeat(501) }]) {
        expect((await setStatus(po, 'PROACT', body)).status).toBe(400);
      }
      expect(account('PROACT').accountStatus).toBe('Active');
      expect(account('PROPEND').accountStatus).toBe('Under Verification');
    });
  });

  describe('verification document upload and preview', () => {
    it('stores a real PNG privately and streams it only to Provider Operations with safe headers', async () => {
      const provider = await user('provider', 'pending@example.test');
      const uploaded = await upload(provider, 'DOC-PROPEND-1', PNG, 'my id.png', 'image/png');
      expect(uploaded.status).toBe(201);
      expect(uploaded.body.data).toEqual({ documentId: 'DOC-PROPEND-1', documentType: 'ID Proof', documentName: 'my id.png', documentStatus: 'Pending', required: true, rejectionReason: null, recordOrigin: 'account', state: 'stored', hasFile: true, fileType: 'image/png', fileSize: PNG.length, source: 'secure-upload', uploadedAt: expect.any(String), unavailableReason: null, message: null });
      expect(JSON.stringify(uploaded.body)).not.toMatch(/storageKey|sourceReference|sha256|provider-documents|[0-9a-f]{64}/);

      const files = storedFiles();
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^[0-9a-f]{64}\.png$/);
      expect(readFileSync(join(documentDir, files[0])).equals(PNG)).toBe(true);
      const stateText = readFileSync(stateFile, 'utf8');
      expect(stateText).not.toContain(PNG.toString('base64'));
      expect(stateText).not.toContain(documentDir.replace(/\\/g, '\\\\'));

      const po = await employee('EMP-PO-9', 'Provider Operations');
      const detail = await http().get('/api/employee/provider-operations/providers/PROPEND').set(auth(po));
      expect(detail.body.data.documents.map((item: { hasFile: boolean }) => item.hasFile)).toEqual([true, false, false]);
      expect(detail.body.data.documents[0]).toMatchObject({ documentName: 'my id.png', fileType: 'image/png' });
      expect(JSON.stringify(detail.body)).not.toMatch(/storageKey|local-document/);
      expect(JSON.stringify((await http().get('/api/auth/session').set(auth(provider))).body)).not.toMatch(/storageKey/);

      const response = await preview(po, 'PROPEND', 'DOC-PROPEND-1');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
      expect(response.headers['content-disposition']).toBe('inline; filename="my id.png"; filename*=UTF-8\'\'my%20id.png');
      expect(response.headers['cache-control']).toBe('private, no-store, max-age=0');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toContain('sandbox');
      expect((response.body as Buffer).equals(PNG)).toBe(true);

      const su = await user('superuser', 'super@example.test');
      expect((await preview(su, 'PROPEND', 'DOC-PROPEND-1')).status).toBe(200);
    });

    it('accepts a PDF and streams it as application/pdf; replacing a file removes the old one', async () => {
      const provider = await user('provider', 'pending@example.test');
      expect((await upload(provider, 'DOC-PROPEND-2', PNG, 'first.png', 'image/png')).status).toBe(201);
      const first = storedFiles();
      expect((await upload(provider, 'DOC-PROPEND-2', PDF, 'address.pdf', 'application/pdf')).status).toBe(201);
      const after = storedFiles();
      expect(after).toHaveLength(1);
      expect(after[0]).not.toBe(first[0]);
      const response = await preview(await employee('EMP-PO-9', 'Provider Operations'), 'PROPEND', 'DOC-PROPEND-2');
      expect(response.headers['content-type']).toBe('application/pdf');
      expect((response.body as Buffer).equals(PDF)).toBe(true);
    });

    it('rejects unsupported, spoofed, oversized, empty and malformed uploads without storing anything', async () => {
      const provider = await user('provider', 'pending@example.test');
      const cases = [
        await upload(provider, 'DOC-PROPEND-1', EXE, 'tool.exe', 'application/octet-stream'),
        await upload(provider, 'DOC-PROPEND-1', EXE, 'photo.png', 'image/png'),
        await upload(provider, 'DOC-PROPEND-1', Buffer.from('<svg onload=alert(1)>'), 'photo.png', 'image/png'),
        await upload(provider, 'DOC-PROPEND-1', PDF, 'photo.png', 'image/png'),
        await upload(provider, 'DOC-PROPEND-1', PNG, 'photo.png', 'application/pdf'),
        await upload(provider, 'DOC-PROPEND-1', PNG, 'photo.exe', 'image/png'),
        await upload(provider, 'DOC-PROPEND-1', Buffer.alloc(0), 'empty.png', 'image/png'),
        await http().post('/api/provider/verification-documents/DOC-PROPEND-1/file').set(auth(provider)),
        await http().post('/api/provider/verification-documents/DOC-PROPEND-1/file').set({ ...auth(provider), 'Content-Type': 'multipart/form-data; boundary=xyz' }).send('--xyz\r\nnot a valid part'),
        await http().post('/api/provider/verification-documents/DOC-PROPEND-1/file').set(auth(provider)).field('ownerId', 'PROOTHER').attach('file', PNG, { filename: 'a.png', contentType: 'image/png' }),
      ];
      for (const response of cases) expect(response.status).toBe(400);
      const oversized = await upload(provider, 'DOC-PROPEND-1', Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]), 'big.png', 'image/png');
      expect(oversized.status).toBe(413);
      expect(storedFiles()).toHaveLength(0);
    });

    it('allows uploads only by the owning provider, for its own documents, while under verification', async () => {
      const callers = [await employee('EMP-PO-9', 'Provider Operations'), await employee('EMP-CO-9', 'Customer Operations'), await user('customer', 'customer@example.test'), await user('superuser', 'super@example.test'), undefined];
      for (const token of callers) expect((await upload(token, 'DOC-PROPEND-1', PNG, 'a.png', 'image/png')).status).toBe(403);
      const other = await user('provider', 'pending2@example.test');
      expect((await upload(other, 'DOC-PROPEND-1', PNG, 'a.png', 'image/png')).status).toBe(404);
      expect((await upload(other, '..%2F..%2Fstate.json', PNG, 'a.png', 'image/png')).status).toBe(400);
      const active = await user('provider', 'active@example.test');
      expect((await upload(active, 'DOC-PROPEND-1', PNG, 'a.png', 'image/png')).status).toBe(409);
      expect(storedFiles()).toHaveLength(0);
    });

    it('refuses previews to other departments, roles and spoofed headers, and across providers or documents', async () => {
      await upload(await user('provider', 'pending@example.test'), 'DOC-PROPEND-1', PNG, 'a.png', 'image/png');
      const callers = [await employee('EMP-CO-9', 'Customer Operations'), await employee('EMP-SUP-9', 'Support'), await user('customer', 'customer@example.test'), await user('provider', 'pending@example.test'), undefined];
      for (const token of callers) {
        const response = await preview(token, 'PROPEND', 'DOC-PROPEND-1').set({ role: 'admin', department: 'Provider Operations' });
        expect(response.status).toBe(403);
      }
      const po = await employee('EMP-PO-9', 'Provider Operations');
      expect((await preview(po, 'PROPEND2', 'DOC-PROPEND-1')).status).toBe(404);
      expect((await preview(po, 'PROPEND', 'DOC-PROPEND2-1')).status).toBe(404);
      expect((await preview(po, 'PROPEND', '..%2F..%2Fstate.json')).status).toBe(400);
      expect((await preview(po, '..', 'DOC-PROPEND-1')).status).toBe(404);
      expect((await preview(po, 'PROPEND', 'DOC-PROPEND-404')).status).toBe(404);
    });

    it('explains legacy metadata-only documents and files missing from disk', async () => {
      const po = await employee('EMP-PO-9', 'Provider Operations');
      const legacy = await preview(po, 'PROPEND', 'DOC-PROPEND-3');
      expect(legacy.status).toBe(404);
      expect(JSON.parse(legacy.text || (legacy.body as Buffer).toString()).message).toBe("This document's file was kept only in the web browser where the provider registered on the original ServeEase site. It was never sent to the server, so it cannot be previewed until it is imported from that browser.");

      await upload(await user('provider', 'pending@example.test'), 'DOC-PROPEND-1', PNG, 'a.png', 'image/png');
      unlinkSync(join(documentDir, storedFiles()[0]));
      const missing = await preview(po, 'PROPEND', 'DOC-PROPEND-1');
      expect(missing.status).toBe(404);
      expect(JSON.parse((missing.body as Buffer).toString()).message).toBe('The stored file for this document is missing from the server.');
    });

    it('keeps the file and its record across a restart', async () => {
      await upload(await user('provider', 'pending@example.test'), 'DOC-PROPEND-1', PNG, 'a.png', 'image/png');
      await app.close();
      app = await boot();
      const response = await preview(await employee('EMP-PO-9', 'Provider Operations'), 'PROPEND', 'DOC-PROPEND-1');
      expect(response.status).toBe(200);
      expect((response.body as Buffer).equals(PNG)).toBe(true);
    });

    it('removes the stored file when its record cannot be saved', async () => {
      const provider = await user('provider', 'pending@example.test');
      const failure = jest.spyOn(StateRepository.prototype, 'create').mockImplementationOnce(() => { throw new Error('disk full'); });
      const response = await upload(provider, 'DOC-PROPEND-1', PNG, 'a.png', 'image/png');
      failure.mockRestore();
      expect(response.status).toBe(500);
      expect(storedFiles()).toHaveLength(0);
      expect(disk().some((entry) => entry.key === 'serveEaseProviderDocumentFiles')).toBe(false);
    });

    it('gives registered documents server-controlled ids that the upload can target', async () => {
      const registered = await http().post('/api/auth/register').send({
        role: 'provider', fullName: 'New Provider', email: 'new@example.test', phone: '9000000777', password: 'Strong@1234',
        organisationName: 'New Co', serviceType: 'Plumbing', experience: 2, cityId: 1, address: 'Some Street 1', idProofType: 'PAN',
        documents: [{ documentType: 'idProof', documentName: 'id.png', required: true, documentId: 'DOC-PROPEND-1' }, { documentType: 'profilePhoto', documentName: 'me.png', required: true }],
      });
      expect(registered.status).toBe(201);
      const { token, user: created } = registered.body.data;
      expect(created.documents.map((item: { documentId: string }) => item.documentId)).toEqual([`DOC-${created.id}-1`, `DOC-${created.id}-2`]);
      expect((await upload(token, `DOC-${created.id}-2`, PNG, 'me.png', 'image/png')).status).toBe(201);
      expect((await upload(token, 'DOC-PROPEND-1', PNG, 'me.png', 'image/png')).status).toBe(404);
    });
  });
});
