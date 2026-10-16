import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppModule } from '../../app.module';
import { StateRepository } from '../state/state.repository';

// supertest ships without type declarations in this project, so it is loaded untyped.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: (server: unknown) => any = require('supertest');

// Suspended customer/provider login and session rejection over HTTP, on a temporary state file only.
const PASSWORD = 'Pass@123';
const provider = (id: string, email: string) => ({ id, role: 'provider', fullName: `Pro ${id}`, organisationName: `Org ${id}`, email, accountStatus: 'Active', verificationStatus: 'Verified', approvalStatus: 'Active', status: 'Active', password: PASSWORD, documents: [] });
const customer = (id: string, email: string) => ({ id, role: 'customer', fullName: `Cus ${id}`, email, accountStatus: 'Active', status: 'Active', password: PASSWORD });
const state = () => [
  { key: 'serveEaseData', updatedAt: '2026-01-01T00:00:00.000Z', value: { users: [
    customer('CUS800', 'asha@example.test'), customer('CUS801', 'quiet@example.test'),
    provider('PRO800', 'pro@example.test'), provider('PRO801', 'quietpro@example.test'),
    { id: 'SU800', role: 'superuser', email: 'super@example.test', password: PASSWORD },
  ] } },
  { key: 'serveEaseEmployeeModuleData', updatedAt: '2026-01-01T00:00:00.000Z', value: { employees: [
    { employeeId: 'EMP-CO-8', name: 'Customer Ops', department: 'Customer Operations', password: PASSWORD },
    { employeeId: 'EMP-PO-8', name: 'Provider Ops', department: 'Provider Operations', password: PASSWORD },
  ] } },
];

describe('Suspended account login and sessions (HTTP)', () => {
  const previous = process.env.SERVEEASE_STATE_FILE;
  let dir: string;
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const login = (body: Record<string, string>) => http().post('/api/auth/login').send({ password: PASSWORD, ...body });
  const customerLogin = (password = PASSWORD) => login({ identifier: 'asha@example.test', password });
  const providerLogin = (password = PASSWORD) => login({ identifier: 'PRO800', password });
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const employee = async (identifier: string) => (await login({ identifier })).body.data.token as string;
  const co = () => employee('EMP-CO-8');
  const po = () => employee('EMP-PO-8');
  const setCustomer = async (id: string, status: string, reason: string) => http().patch(`/api/employee/customer-operations/customers/${id}/status`).set(auth(await co())).send({ status, reason });
  const setProvider = async (id: string, status: string, reason: string) => http().patch(`/api/employee/provider-operations/providers/${id}/status`).set(auth(await po())).send({ status, reason });

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'serveease-suspended-'));
    const file = join(dir, 'state.json');
    writeFileSync(file, JSON.stringify(state()));
    process.env.SERVEEASE_STATE_FILE = file;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    if (previous === undefined) delete process.env.SERVEEASE_STATE_FILE; else process.env.SERVEEASE_STATE_FILE = previous;
    rmSync(dir, { recursive: true, force: true });
  });

  it('answers a suspended customer with 403, a stable code and the recorded reason, and issues no session', async () => {
    const live = (await customerLogin()).body.data.token as string;
    expect((await setCustomer('CUS800', 'Blocked', 'Chargeback investigation')).status).toBe(200);
    const response = await customerLogin();
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ statusCode: 403, error: 'Forbidden', message: expect.stringContaining('currently suspended'), code: 'CUSTOMER_ACCOUNT_SUSPENDED', reason: 'Chargeback investigation' });
    expect(JSON.stringify(response.body)).not.toMatch(/token|password|hash|asha@example|CUS800/i);
    // Suspending ends the customer's sessions at once.
    expect((await http().get('/api/auth/session').set(auth(live))).status).toBe(401);
  });

  it('rejects a live session with the structured 403 when the stored status turns suspended, then discards it', async () => {
    const live = (await login({ identifier: 'quiet@example.test' })).body.data.token as string;
    const repository = app.get(StateRepository);
    const value = repository.findById('serveEaseData')!.value as { users: Array<Record<string, any>> };
    const record = value.users.find((user) => user.id === 'CUS801')!;
    Object.assign(record, { accountStatus: 'Blocked', status: 'Blocked', blockReason: 'Stored out of band' });
    repository.update('serveEaseData', { value });
    const rejected = await http().get('/api/auth/session').set(auth(live));
    expect(rejected.status).toBe(403);
    expect(rejected.body).toMatchObject({ code: 'CUSTOMER_ACCOUNT_SUSPENDED', reason: 'Stored out of band' });
    expect((await http().get('/api/auth/session').set(auth(live))).status).toBe(401);
    Object.assign(record, { accountStatus: 'Active', status: 'Active' });
    delete record.blockReason;
    repository.update('serveEaseData', { value });
  });

  it('answers a suspended provider with the provider code and reason', async () => {
    expect((await setProvider('PRO800', 'Suspended', 'Repeated no-shows')).status).toBe(200);
    const response = await providerLogin();
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ statusCode: 403, code: 'PROVIDER_ACCOUNT_SUSPENDED', reason: 'Repeated no-shows' });
    expect(response.body.data).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/token|password|hash|pro@example|PRO800/i);
  });

  it('reads the reason from the record only; caller-supplied reasons are refused or ignored', async () => {
    await setCustomer('CUS801', 'Blocked', 'Policy review');
    const body = { identifier: 'quiet@example.test', password: PASSWORD };
    expect((await http().post('/api/auth/login').send({ ...body, reason: 'forged' })).status).toBe(400);
    const real = await http().post('/api/auth/login').set('x-suspension-reason', 'forged').send(body);
    expect(real.status).toBe(403);
    expect(real.body.reason).toBe('Policy review');
  });

  it('never reveals the suspension to a wrong password or to a provider email', async () => {
    for (const response of [await customerLogin('Wrong@123'), await providerLogin('Wrong@123'), await login({ identifier: 'pro@example.test' })]) {
      expect(response.status).toBe(401);
      expect(response.body.code).toBeUndefined();
      expect(response.body.reason).toBeUndefined();
      expect(response.body.message).toBe('Invalid credentials. Check your email or ServeEase ID and password.');
    }
  });

  it('keeps unrelated 403 responses free of the suspension code', async () => {
    const forbidden = await http().patch('/api/employee/customer-operations/customers/CUS800/status').set(auth(await po())).send({ status: 'Active', reason: 'not my department' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBeUndefined();
  });

  it('lets a reactivated account sign in afresh without reviving a session invalidated by suspension', async () => {
    const stale = (await login({ identifier: 'PRO801' })).body.data.token as string;
    await setProvider('PRO801', 'Suspended', 'Second review');
    expect((await http().get('/api/auth/session').set(auth(stale))).status).toBe(401);
    await setProvider('PRO801', 'Active', 'Review closed');
    expect((await http().get('/api/auth/session').set(auth(stale))).status).toBe(401);
    const fresh = await login({ identifier: 'PRO801' });
    expect(fresh.status).toBe(201);
    expect((await http().get('/api/auth/session').set(auth(fresh.body.data.token))).status).toBe(200);
    expect((await setCustomer('CUS800', 'Active', 'Cleared')).status).toBe(200);
    expect((await customerLogin()).status).toBe(201);
  });
});
