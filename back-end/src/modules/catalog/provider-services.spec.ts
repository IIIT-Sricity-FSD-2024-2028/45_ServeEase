import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppModule } from '../../app.module';
import { StateRepository } from '../state/state.repository';

// supertest ships without type declarations in this project, so it is loaded untyped.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: (server: unknown) => any = require('supertest');

// Registration → saved services → Provider Operations count → discovery, and the one account→services mapping
// for every saved shape. Temporary state only.
const PASSWORD = 'Pass@123';
const active = { approvalStatus: 'Active', verificationStatus: 'Verified', accountStatus: 'Active', status: 'Active', verified: true };
const account = (id: string, email: string, extra: Record<string, unknown> = {}) => ({ id, role: 'provider', fullName: `Owner ${id}`, organisationName: `Org ${id}`, email, phone: '9000000000', serviceType: 'Plumbing', experience: 2, cityId: 1, cityName: 'Chennai', location: 'Chennai', password: PASSWORD, documents: [{ documentId: `DOC-${id}-1`, documentType: 'ID Proof', documentName: 'id.jpg', documentStatus: 'Pending' }], ...active, ...extra });
const listing = (id: string, extra: Record<string, unknown>) => ({ id, name: `Listing ${id}`, category: 'plumbing', subServices: ['Tap Repair'], years: 3, rating: 4, reviews: 2, distance: '1 km', startingPrice: 300, location: 'Chennai', jobsDone: 1, availableToday: true, verified: true, cityId: 1, image: 'assets/images/plumbing/plumbing1.jpg.jpeg', accountStatus: 'Active', ...extra });
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PHOTO_KEY = `${'a'.repeat(64)}.png`;
const ID_KEY = `${'b'.repeat(64)}.png`;
const photoRecord = (providerAccountId: string, ownerEmail: string, documentType: string, storageKey: string) => ({ documentId: `DOC-${providerAccountId}-9`, providerAccountId, ownerEmail, providerListingId: null, documentType, verificationStatus: 'Pending', originalFilename: 'me.png', mimeType: 'image/png', size: PNG.length, sha256: storageKey.slice(0, 64), storageKey, source: 'secure-upload', sourceReference: null, recordOrigin: 'account', migrationState: 'migrated', state: 'stored', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', history: [] });
const state = () => [
  { key: 'serveEaseProviderDocumentRegistry', updatedAt: '2026-01-01T00:00:00.000Z', value: { version: 1, documents: [photoRecord('PROLEG', 'leg@example.test', 'profilePhoto', PHOTO_KEY), photoRecord('PROSEED', 'seed@example.test', 'idProof', ID_KEY)] } },
  { key: 'serveEaseData', updatedAt: '2026-01-01T00:00:00.000Z', value: {
    categories: [{ id: 'salon-at-home', name: 'Salon at Home', subServices: ['Haircut', 'Facial'] }, { id: 'plumbing', name: 'Plumbing', subServices: ['Tap Repair', 'Pipe Fitting'] }],
    popularServices: [],
    providers: [
      // Registered through the app: listing id carries `-category-city`, the account's providerCatalogId is the base id.
      listing('legacy-co-plumbing-1', { ownerProviderId: 'PROLEG', ownerProviderEmail: 'leg@example.test', services: [{ id: 'S1', name: 'Tap Repair', price: 300, status: 'Active' }] }),
      // Seed provider: no owner id on the listing, services only as subServices + servicePricing.
      listing('seed-plumber-1', { subServices: ['Tap Repair', 'Pipe Fitting'], servicePricing: { 'Tap Repair': 300, 'Pipe Fitting': 500 } }),
      listing('shared-a-plumbing-1', { ownerProviderId: 'PROSH', ownerProviderEmail: 'a@example.test', services: [{ id: 'A1', name: 'Tap Repair', price: 300, status: 'Active' }, { id: 'A2', name: 'Pipe Fitting', price: 500, status: 'Active' }] }),
      listing('shared-b-plumbing-2', { cityId: 2, location: 'Bangalore', ownerProviderId: 'PROSH', ownerProviderEmail: 'b@example.test', services: [{ id: 'B1', name: 'Tap Repair', price: 350, status: 'Active' }] }),
    ],
    users: [
      { id: 'CUS600', role: 'customer', fullName: 'Cus', email: 'cus@example.test', phone: '9000000600', accountStatus: 'Active', status: 'Active', password: PASSWORD },
      account('PROLEG', 'leg@example.test', { providerCatalogId: 'legacy-co' }),
      account('PROSEED', 'seed@example.test', { providerCatalogId: 'seed-plumber-1' }),
      account('PROSH', 'a@example.test', { providerCatalogId: 'shared-a-plumbing-1' }),
      account('PROSH', 'b@example.test', { providerCatalogId: 'shared-b-plumbing-2', cityId: 2, cityName: 'Bangalore' }),
      account('PROEMPTY', 'empty@example.test'),
      { id: 'SU600', role: 'superuser', email: 'super@example.test', password: PASSWORD },
    ],
  } },
  // Records stored under a shared id cannot be told apart, so they must not be attributed to either account.
  { key: 'serveEaseProviderServices:PROLEG', updatedAt: '2026-01-01T00:00:00.000Z', value: { providerId: 'PROLEG', services: [{ id: 'SVC001', name: 'Tap Repair', category: 'plumbing', price: 300, status: 'Active', isActive: true }] } },
  { key: 'serveEaseProviderServices:PROSH', updatedAt: '2026-01-01T00:00:00.000Z', value: { providerId: 'PROSH', services: [{ id: 'X1', name: 'Pipe Fitting', category: 'plumbing', price: 999, status: 'Active', isActive: true }] } },
  { key: 'serveEaseEmployeeModuleData', updatedAt: '2026-01-01T00:00:00.000Z', value: { employees: [{ employeeId: 'EMP-PO-6', name: 'Provider Ops', department: 'Provider Operations', password: PASSWORD }] } },
];

describe('Provider services: registration, counts and discovery (HTTP)', () => {
  const previous = process.env.SERVEEASE_STATE_FILE;
  const previousDocs = process.env.SERVEEASE_DOCUMENT_DIR;
  let dir: string;
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = async (body: Record<string, string>) => (await http().post('/api/auth/login').send({ password: PASSWORD, ...body })).body.data.token as string;
  const po = () => login({ role: 'employee', employeeId: 'EMP-PO-6', department: 'Provider Operations' });
  const opsList = async () => (await http().get('/api/employee/provider-operations/providers').set(auth(await po()))).body.data.providers as Array<Record<string, any>>;
  const opsDetail = async (id: string, listingId?: string) => (await http().get(`/api/employee/provider-operations/providers/${id}${listingId ? `?listing=${listingId}` : ''}`).set(auth(await po()))).body.data;
  const catalog = async () => (await http().get('/api/catalog').set({ role: 'user' })).body.data.providers as Array<Record<string, any>>;
  const register = (body: Record<string, unknown>) => http().post('/api/auth/register').send({ role: 'provider', fullName: 'Hema Kumar', email: 'hema@example.test', phone: '9876543210', password: PASSWORD, organisationName: 'Glow Studio', serviceType: 'Salon at Home', experience: 3, cityId: 3, address: '12 Charminar Road', idProofType: 'Aadhaar', documents: [{ documentType: 'idProof', documentName: 'id.jpg', documentStatus: 'Pending selection' }], ...body });
  const saved = (id: string) => (app.get(StateRepository).findById(`serveEaseProviderServices:${id}`)?.value as { services: Array<Record<string, any>> } | undefined)?.services;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'serveease-services-'));
    const file = join(dir, 'state.json');
    writeFileSync(file, JSON.stringify(state()));
    process.env.SERVEEASE_STATE_FILE = file;
    mkdirSync(join(dir, 'docs'));
    writeFileSync(join(dir, 'docs', PHOTO_KEY), PNG);
    writeFileSync(join(dir, 'docs', ID_KEY), PNG);
    process.env.SERVEEASE_DOCUMENT_DIR = join(dir, 'docs');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    if (previousDocs === undefined) delete process.env.SERVEEASE_DOCUMENT_DIR; else process.env.SERVEEASE_DOCUMENT_DIR = previousDocs;
    if (previous === undefined) delete process.env.SERVEEASE_STATE_FILE; else process.env.SERVEEASE_STATE_FILE = previous;
    rmSync(dir, { recursive: true, force: true });
  });

  it('counts services for every saved shape through one mapping, never from an unrelated record', async () => {
    const byEmail = Object.fromEntries((await opsList()).map((provider) => [provider.email, provider.serviceCount]));
    // Saved records are authoritative even though the account's providerCatalogId ('legacy-co') names no listing.
    expect(byEmail['leg@example.test']).toBe(1);
    // A seed provider has only its listing's sub-services.
    expect(byEmail['seed@example.test']).toBe(2);
    // Shared id: each account takes its own listing, never the id-keyed record that belongs to neither.
    expect(byEmail['a@example.test']).toBe(2);
    expect(byEmail['b@example.test']).toBe(1);
    // Genuinely nothing saved: zero, not a guess.
    expect(byEmail['empty@example.test']).toBe(0);
    const detail = await opsDetail('PROLEG');
    expect(detail.services).toEqual([expect.objectContaining({ name: 'Tap Repair', price: 300, status: 'Active' })]);
    const shared = await opsDetail('PROSH', 'shared-b-plumbing-2');
    expect(shared.services.map((service: Record<string, any>) => [service.name, service.price])).toEqual([['Tap Repair', 350]]);
  });

  it('saves the services chosen at registration, with the provider\'s own prices and nothing else', async () => {
    const response = await register({ services: [{ name: 'haircut', price: 450 }, { name: 'Facial', price: 600.5 }] });
    expect(response.status).toBe(201);
    const id = response.body.data.user.id as string;
    expect(saved(id)).toEqual([
      expect.objectContaining({ id: 'SVC001', name: 'Haircut', category: 'Salon at Home', price: 450, cityId: 3, cityName: 'Hyderabad', status: 'Active', isActive: true }),
      expect.objectContaining({ id: 'SVC002', name: 'Facial', price: 600.5, status: 'Active' }),
    ]);
    expect(response.body.data.user).toMatchObject({ serviceType: 'Salon at Home', cityId: 3, accountStatus: 'Under Verification' });
  });

  it('shows a registered provider in Provider Operations at once, and in discovery only once approved', async () => {
    const email = 'ops@example.test';
    const id = (await register({ email, phone: '9876500000', organisationName: 'Ops Salon', services: [{ name: 'Haircut', price: 500 }] })).body.data.user.id as string;
    expect((await opsList()).find((provider) => provider.email === email)).toMatchObject({ id, serviceCount: 1, accountStatus: 'Under Verification' });
    expect((await catalog()).filter((item) => item.ownerProviderId === id)).toEqual([]);
    const token = await po();
    expect((await http().patch(`/api/employee/provider-operations/providers/${id}/verification`).set(auth(token)).send({ decision: 'approve' })).status).toBe(200);
    const found = (await catalog()).filter((item) => item.ownerProviderId === id);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ category: 'salon-at-home', cityId: 3, startingPrice: 500, subServices: ['Haircut'], servicePricing: { Haircut: 500 }, accountStatus: 'Active' });
    expect((await catalog()).filter((item) => item.ownerProviderId === id)).toHaveLength(1);
    expect((await opsList()).find((provider) => provider.id === id)?.serviceCount).toBe(1);
  });

  it('saves no service for a category alone, and the provider stays out of discovery', async () => {
    const response = await register({ email: 'bare@example.test', phone: '9876500001' });
    expect(response.status).toBe(201);
    const id = response.body.data.user.id as string;
    expect(saved(id)).toBeUndefined();
    expect((await opsList()).find((provider) => provider.id === id)?.serviceCount).toBe(0);
    await http().patch(`/api/employee/provider-operations/providers/${id}/verification`).set(auth(await po())).send({ decision: 'approve' });
    expect((await catalog()).filter((item) => item.ownerProviderId === id)).toEqual([]);
  });

  it('refuses services that are not the category\'s, duplicated, unpriced, or sent for a customer, and saves nothing', async () => {
    const before = app.get(StateRepository).findAll().length;
    for (const services of [[{ name: 'Tap Repair', price: 100 }], [{ name: 'Haircut', price: 100 }, { name: 'HAIRCUT', price: 120 }], [{ name: 'Haircut', price: 0 }], [{ name: 'Haircut' }], [{ name: 'Haircut', price: 100, extra: 1 }]]) {
      const response = await register({ email: 'bad@example.test', phone: '9876500002', services });
      expect(response.status).toBe(400);
    }
    expect((await register({ email: 'bad@example.test', phone: '9876500002', serviceType: 'Unknown', services: [{ name: 'Haircut', price: 100 }] })).status).toBe(400);
    expect(app.get(StateRepository).findAll().length).toBe(before);
    expect((await opsList()).some((provider) => provider.email === 'bad@example.test')).toBe(false);
  });

  it('keeps a pending, rejected or suspended provider unlisted and unbookable', async () => {
    const make = async (email: string, phone: string) => (await register({ email, phone, organisationName: `Org ${phone}`, services: [{ name: 'Haircut', price: 400 }] })).body.data.user.id as string;
    const pending = await make('pend@example.test', '9876500003');
    const rejected = await make('rej@example.test', '9876500004');
    const suspended = await make('sus@example.test', '9876500005');
    const token = await po();
    await http().patch(`/api/employee/provider-operations/providers/${rejected}/verification`).set(auth(token)).send({ decision: 'reject', reason: 'Blurred identity proof' });
    await http().patch(`/api/employee/provider-operations/providers/${suspended}/verification`).set(auth(token)).send({ decision: 'approve' });
    expect((await catalog()).some((item) => item.ownerProviderId === suspended)).toBe(true);
    await http().patch(`/api/employee/provider-operations/providers/${suspended}/status`).set(auth(token)).send({ status: 'Suspended', reason: 'Fixture review' });
    for (const id of [pending, rejected, suspended]) expect((await catalog()).filter((item) => item.ownerProviderId === id)).toEqual([]);
    const customer = await login({ role: 'customer', email: 'cus@example.test' });
    const book = (providerId: string) => http().post('/api/bookings/customer').set(auth(customer)).send({ service: 'Haircut', providerId, date: '2030-01-03', time: '10:00 AM - 12:00 PM', address: '1 Example Road' });
    for (const id of [pending, rejected, suspended]) expect((await book(id)).status).toBe(404);
  });

  it('holds a seed provider\'s listing back once its own account is suspended', async () => {
    expect((await catalog()).find((item) => item.id === 'seed-plumber-1')).toMatchObject({ accountStatus: 'Active' });
    const stateRepository = app.get(StateRepository);
    const value = stateRepository.findById('serveEaseData')!.value as { users: Array<Record<string, any>> };
    Object.assign(value.users.find((user) => user.id === 'PROSEED')!, { accountStatus: 'Suspended', status: 'Suspended', approvalStatus: 'Suspended' });
    stateRepository.update('serveEaseData', { value });
    expect((await catalog()).find((item) => item.id === 'seed-plumber-1')).toMatchObject({ accountStatus: 'Suspended' });
    const customer = await login({ role: 'customer', email: 'cus@example.test' });
    const response = await http().post('/api/bookings/customer').set(auth(customer)).send({ service: 'Tap Repair', providerId: 'seed-plumber-1', date: '2030-01-03', time: '10:00 AM - 12:00 PM', address: '1 Example Road' });
    expect(response.status).toBe(409);
    Object.assign(value.users.find((user) => user.id === 'PROSEED')!, { accountStatus: 'Active', status: 'Active', approvalStatus: 'Active' });
    stateRepository.update('serveEaseData', { value });
  });

  it('shows the approved provider own submitted photo through a public image route, and nothing else from the document store', async () => {
    const listings = await catalog();
    const mine = listings.find((item) => item.id === 'legacy-co-plumbing-1')!;
    expect(mine.profilePhoto).toBe('/catalog/providers/legacy-co-plumbing-1/photo');
    // The ID proof of another provider is not a profile photo, so that listing keeps its own image.
    expect(listings.find((item) => item.id === 'seed-plumber-1')!.profilePhoto).toBeUndefined();
    expect(JSON.stringify(listings)).not.toMatch(/storageKey|a{64}|b{64}/);
    const image = await http().get('/api/catalog/providers/legacy-co-plumbing-1/photo').buffer(true).parse((res: NodeJS.ReadableStream, done: (error: Error | null, body: Buffer) => void) => { const chunks: Buffer[] = []; res.on('data', (chunk: Buffer) => chunks.push(chunk)); res.on('end', () => done(null, Buffer.concat(chunks))); });
    expect(image.status).toBe(200);
    expect(image.headers['content-type']).toBe('image/png');
    expect(image.headers['x-content-type-options']).toBe('nosniff');
    expect(image.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(Buffer.compare(image.body, PNG)).toBe(0);
    for (const id of ['seed-plumber-1', 'shared-a-plumbing-1', 'no-such-listing', '..%2F..%2Fstate']) expect((await http().get(`/api/catalog/providers/${id}/photo`)).status).toBe(404);
  });

  it('shows the photo of a newly approved provider, and stops serving it once they are suspended', async () => {
    const id = (await register({ email: 'photo@example.test', phone: '9876500010', organisationName: 'Photo Salon', services: [{ name: 'Haircut', price: 400 }] })).body.data.user.id as string;
    const stateRepository = app.get(StateRepository);
    const registry = stateRepository.findById('serveEaseProviderDocumentRegistry')!.value as { documents: Array<Record<string, any>> };
    registry.documents.push(photoRecord(id, 'photo@example.test', 'profilePhoto', PHOTO_KEY));
    stateRepository.update('serveEaseProviderDocumentRegistry', { value: registry });
    const token = await po();
    const listingId = 'photo-salon-salon-at-home-3';
    expect((await http().get(`/api/catalog/providers/${listingId}/photo`)).status).toBe(404);
    await http().patch(`/api/employee/provider-operations/providers/${id}/verification`).set(auth(token)).send({ decision: 'approve' });
    expect((await catalog()).find((item) => item.id === listingId)!.profilePhoto).toBe(`/catalog/providers/${listingId}/photo`);
    expect((await http().get(`/api/catalog/providers/${listingId}/photo`)).status).toBe(200);
    await http().patch(`/api/employee/provider-operations/providers/${id}/status`).set(auth(token)).send({ status: 'Suspended', reason: 'Fixture review' });
    expect((await http().get(`/api/catalog/providers/${listingId}/photo`)).status).toBe(404);
  });
});
