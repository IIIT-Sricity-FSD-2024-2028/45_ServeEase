import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppModule } from '../../app.module';

// supertest ships without type declarations in this project, so it is loaded untyped.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: (server: unknown) => any = require('supertest');

// Customer discovery follows provider verification while the server is running: approval, rejection,
// suspension, reactivation and service changes all show in GET /catalog at once. Temporary state only.
const PASSWORD = 'Pass@123';
const document = (id: string) => [{ documentId: `DOC-${id}-1`, documentType: 'ID Proof', documentName: 'id.jpg', documentStatus: 'Pending' }];
const account = (id: string, email: string, extra: Record<string, unknown> = {}) => ({ id, role: 'provider', fullName: `Owner ${id}`, organisationName: `Org ${id}`, email, phone: '9000000000', serviceType: 'Salon at Home', experience: 4, cityId: 3, cityName: 'Hyderabad', password: PASSWORD, documents: document(id), approvalStatus: 'Pending Approval', verificationStatus: 'Pending', accountStatus: 'Under Verification', status: 'Under Verification', ...extra });
const active = { approvalStatus: 'Active', verificationStatus: 'Verified', accountStatus: 'Active', status: 'Active', verified: true };
const listing = (id: string, owner: string, email: string, category: string, cityId: number, extra: Record<string, unknown> = {}) => ({ id, name: `Listing ${id}`, category, subServices: ['Haircut'], years: 5, rating: 4.5, reviews: 3, distance: '1 km', startingPrice: 300, location: 'Chennai', jobsDone: 2, availableToday: true, verified: true, cityId, image: 'assets/images/plumbing/plumbing1.jpg.jpeg', ownerProviderId: owner, ownerProviderEmail: email, accountStatus: 'Active', servicePricing: { Haircut: 300 }, services: [{ id: 'S1', name: 'Haircut', price: 300, status: 'Active' }], ...extra });
const state = () => [
  { key: 'serveEaseData', updatedAt: '2026-01-01T00:00:00.000Z', value: {
    categories: [{ id: 'salon-at-home', name: 'Salon at Home', subServices: ['Haircut'] }, { id: 'plumbing', name: 'Plumbing', subServices: ['Tap'] }],
    popularServices: [],
    providers: [
      listing('base-plumbing-1', 'PROBASE', 'base@example.test', 'plumbing', 1),
      listing('shared-a-plumbing-1', 'PROSHARED', 'a@example.test', 'plumbing', 1),
      listing('shared-b-plumbing-2', 'PROSHARED', 'b@example.test', 'plumbing', 2),
    ],
    users: [
      { id: 'CUS700', role: 'customer', fullName: 'Cus', email: 'cus@example.test', phone: '9000000700', accountStatus: 'Active', status: 'Active', password: PASSWORD },
      account('PROBASE', 'base@example.test', { ...active, serviceType: 'Plumbing', cityId: 1, cityName: 'Chennai' }),
      account('PRONEW', 'new@example.test'),
      account('PROREJ', 'rej@example.test'),
      account('PROWAIT', 'wait@example.test'),
      account('PROSHARED', 'a@example.test', { ...active, serviceType: 'Plumbing' }),
      account('PROSHARED', 'b@example.test', { ...active, serviceType: 'Plumbing', accountStatus: 'Suspended', status: 'Suspended', approvalStatus: 'Suspended' }),
      { id: 'SU700', role: 'superuser', email: 'super@example.test', password: PASSWORD },
    ],
  } },
  { key: 'serveEaseEmployeeModuleData', updatedAt: '2026-01-01T00:00:00.000Z', value: { employees: [{ employeeId: 'EMP-PO-7', name: 'Provider Ops', department: 'Provider Operations', password: PASSWORD }] } },
];

describe('Verified provider discovery (HTTP)', () => {
  const previous = process.env.SERVEEASE_STATE_FILE;
  let dir: string;
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = async (body: Record<string, string>) => (await http().post('/api/auth/login').send({ password: PASSWORD, ...body })).body.data.token as string;
  const po = () => login({ role: 'employee', employeeId: 'EMP-PO-7', department: 'Provider Operations' });
  const decide = async (id: string, decision: string, reason?: string) => http().patch(`/api/employee/provider-operations/providers/${id}/verification`).set(auth(await po())).send({ decision, ...(reason ? { reason } : {}) });
  const setStatus = async (id: string, status: string) => http().patch(`/api/employee/provider-operations/providers/${id}/status`).set(auth(await po())).send({ status, reason: 'Fixture review' });
  const catalog = async () => (await http().get('/api/catalog').set({ role: 'user' })).body.data.providers as Array<Record<string, any>>;
  const ownedBy = async (owner: string) => (await catalog()).filter((item) => item.ownerProviderId === owner);
  const addService = async (providerId: string, email: string, body: Record<string, unknown>) => http().post(`/api/catalog/providers/${providerId}/services`).set(auth(await login({ role: 'provider', email }))).send(body);
  const book = async (providerId: string) => http().post('/api/bookings/customer').set(auth(await login({ role: 'customer', email: 'cus@example.test' }))).send({ service: 'Haircut', providerId, date: '2030-01-03', time: '10:00 AM - 12:00 PM', address: '1 Example Road' });

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'serveease-discovery-'));
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

  it('lists nothing for a pending provider, even once it has services', async () => {
    expect((await addService('PRONEW', 'new@example.test', { name: 'Haircut', category: 'Salon at Home', price: 450 })).status).toBe(201);
    expect(await ownedBy('PRONEW')).toEqual([]);
    expect((await book('PRONEW')).status).toBe(404);
  });

  it('shows an approved provider in the right category and city with the right services, without a restart', async () => {
    expect((await decide('PRONEW', 'approve')).status).toBe(200);
    const [item, ...rest] = await ownedBy('PRONEW');
    expect(rest).toEqual([]);
    expect(item).toMatchObject({ id: 'org-pronew-salon-at-home-3', name: 'Org PRONEW', category: 'salon-at-home', cityId: 3, location: 'Hyderabad', startingPrice: 450, ownerProviderEmail: 'new@example.test', accountStatus: 'Active', verified: true, subServices: ['Haircut'], servicePricing: { Haircut: 450 }, rating: 0, reviews: 0, availableToday: false });
    expect(item.services).toEqual([expect.objectContaining({ name: 'Haircut', price: 450, status: 'Active' })]);
    expect(JSON.stringify(item)).not.toMatch(/password|documents|phone|9000000000/i);
    const single = await http().get(`/api/catalog/providers/${item.id}`).set({ role: 'user' });
    expect(single.body.data.ownerProviderId).toBe('PRONEW');
  });

  it('is idempotent: repeated reads and a repeated approval change nothing', async () => {
    const before = await catalog();
    expect((await catalog()).length).toBe(before.length);
    expect((await decide('PRONEW', 'approve')).status).toBe(409);
    const after = await catalog();
    expect(after).toEqual(before);
    expect(after.filter((item) => item.ownerProviderId === 'PRONEW')).toHaveLength(1);
  });

  it('adds a listing for a new city or category the provider really serves, and nowhere else', async () => {
    expect((await addService('PRONEW', 'new@example.test', { name: 'Tap Repair', category: 'Plumbing', price: 200, cityId: 3, cityName: 'Hyderabad' })).status).toBe(201);
    const owned = await ownedBy('PRONEW');
    expect(owned.map((item) => `${item.category}|${item.cityId}`).sort()).toEqual(['plumbing|3', 'salon-at-home|3']);
    // A zero-priced service has no bookable price, so it creates nothing.
    await addService('PRONEW', 'new@example.test', { name: 'Free', category: 'Plumbing', price: 0, cityId: 4, cityName: 'Delhi' });
    expect((await ownedBy('PRONEW')).length).toBe(2);
  });

  it('keeps rejected and still-pending providers out of discovery and bookings', async () => {
    await addService('PROREJ', 'rej@example.test', { name: 'Haircut', category: 'Salon at Home', price: 300 });
    await addService('PROWAIT', 'wait@example.test', { name: 'Haircut', category: 'Salon at Home', price: 300 });
    expect((await decide('PROREJ', 'reject', 'Blurred identity proof')).status).toBe(200);
    expect(await ownedBy('PROREJ')).toEqual([]);
    expect(await ownedBy('PROWAIT')).toEqual([]);
    expect((await book('PROREJ')).status).toBe(404);
  });

  it('hides and blocks a suspended provider at once, and restores them on reactivation', async () => {
    expect((await book('org-pronew-salon-at-home-3')).body.message ?? '').not.toMatch(/not currently available/);
    expect((await setStatus('PRONEW', 'Suspended')).status).toBe(200);
    expect(await ownedBy('PRONEW')).toEqual([]);
    expect((await book('org-pronew-salon-at-home-3')).status).toBe(404);
    // A synced listing that is still present is held back by its owner's account, not by the listing's own flags.
    const stale = await book('shared-b-plumbing-2');
    expect(stale.status).toBe(409);
    expect(stale.body.message).toMatch(/not currently available/);
    expect((await setStatus('PRONEW', 'Active')).status).toBe(200);
    (await ownedBy('PRONEW')).forEach((item) => expect(item.accountStatus).toBe('Active'));
    expect((await book('org-pronew-salon-at-home-3')).body.message ?? '').not.toMatch(/not currently available/);
  });

  it('applies a synced listing\'s owner status from the right account when an id is shared', async () => {
    const listings = await catalog();
    expect(listings.find((item) => item.id === 'shared-a-plumbing-1')).toMatchObject({ accountStatus: 'Active', verified: true });
    expect(listings.find((item) => item.id === 'shared-b-plumbing-2')).toMatchObject({ accountStatus: 'Suspended' });
    expect(listings.find((item) => item.id === 'base-plumbing-1')).toMatchObject({ accountStatus: 'Active', rating: 4.5, reviews: 3, availableToday: true, startingPrice: 300 });
  });

  it('never duplicates the synced listing of a provider who already has one', async () => {
    await addService('PROBASE', 'base@example.test', { name: 'Tap', category: 'Plumbing', price: 150, cityId: 1, cityName: 'Chennai' });
    expect((await ownedBy('PROBASE')).map((item) => item.id)).toEqual(['base-plumbing-1']);
  });
});
