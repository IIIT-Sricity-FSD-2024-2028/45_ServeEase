import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { StateRepository } from '../state/state.repository';
import { CatalogRepository } from './catalog.repository';
import { CatalogService } from './catalog.service';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const provider = (overrides: Record<string, unknown>) => ({
  id: 'fresh-space-cleaning', name: 'Fresh Space Cleaning', category: 'home-cleaning', subServices: ['Kitchen Cleaning'],
  years: 6, rating: 4.8, reviews: 392, distance: '3.0 km', startingPrice: 699, location: 'Chennai, Tamil Nadu',
  jobsDone: 932, availableToday: true, verified: true, cityId: 1, image: 'assets/images/home-cleaning/clean2.jpg',
  ...overrides,
});

// Mirrors the persisted serveEaseData entry: catalog data plus records that must never reach the catalog.
const savedState = () => [
  { key: 'serveEaseSelectedCity', value: { id: 1, name: 'Chennai' }, updatedAt: '2026-10-01T00:00:00.000Z' },
  {
    key: 'serveEaseData',
    updatedAt: '2026-10-01T00:00:00.000Z',
    value: {
      categories: [
        { id: 'home-cleaning', name: 'Home Cleaning', icon: '🧹', subServices: ['Kitchen Cleaning', 'Bathroom Cleaning'] },
        { id: 'salon-at-home', name: 'Salon at Home', icon: '💇', subServices: ['Haircut & Styling'] },
      ],
      providers: [
        provider({}),
        provider({
          id: 'beauty-express', name: 'Beauty Express', category: 'salon-at-home', subServices: ['Haircut & Styling'], cityId: 2,
          location: 'Bangalore, Karnataka', startingPrice: 399, servicePricing: { 'Haircut & Styling': 399 },
          services: [{ id: 'SVC001', name: 'Haircut & Styling', price: 399, status: 'Active' }],
        }),
        provider({
          id: 'roshan-clean-care-home-cleaning-1', name: 'Roshan Clean Care', ownerProviderId: 'PRO150', ownerProviderEmail: 'roshan@example.com',
          accountStatus: 'Suspended', status: 'Suspended', image: PNG, profilePhoto: PNG, phone: '9876543210', statusHistory: [{ status: 'Suspended' }],
          services: [{ id: 'SVC-1', name: 'Kitchen Cleaning', price: 650, status: 'Active' }], servicePricing: { 'Kitchen Cleaning': 650 },
        }),
        provider({ id: 'broken-provider', name: '' }),
        'not-a-provider',
      ],
      popularServices: [{ title: 'Full Home Cleaning', price: '₹999', rating: 4.9, categoryId: 'home-cleaning' }],
      users: [{ id: 'CUS001', email: 'user@serveease.com', passwordHash: 'secret' }],
      providerApprovalRequests: [{ id: 'REQ-1' }],
    },
  },
];

describe('Catalog initialization from persisted state', () => {
  let dir: string;
  let stateFile: string;
  const previousStateFile = process.env.SERVEEASE_STATE_FILE;

  const writeState = (value: unknown) => writeFileSync(stateFile, typeof value === 'string' ? value : JSON.stringify(value, null, 2), 'utf8');
  const repositories = () => {
    const state = new StateRepository();
    return { state, catalog: new CatalogRepository(state) };
  };

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => {
    jest.restoreAllMocks();
    if (previousStateFile === undefined) delete process.env.SERVEEASE_STATE_FILE;
    else process.env.SERVEEASE_STATE_FILE = previousStateFile;
  });
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'serveease-catalog-'));
    stateFile = join(dir, 'state.json');
    process.env.SERVEEASE_STATE_FILE = stateFile;
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('populates the catalog through the Nest module lifecycle at startup', async () => {
    writeState(savedState());
    const moduleRef = await Test.createTestingModule({ providers: [StateRepository, CatalogRepository, CatalogService] }).compile();
    await moduleRef.init();
    const service = moduleRef.get(CatalogService);

    const catalog = service.findAll();
    expect(catalog.categories.map((category) => category.id)).toEqual(['home-cleaning', 'salon-at-home']);
    expect(catalog.providers.map((item) => item.id)).toEqual(['fresh-space-cleaning', 'beauty-express', 'roshan-clean-care-home-cleaning-1']);
    expect(catalog.popularServices).toHaveLength(1);
    expect(service.findById('beauty-express')).toMatchObject({ cityId: 2, category: 'salon-at-home', startingPrice: 399, servicePricing: { 'Haircut & Styling': 399 } });
    await moduleRef.close();
  });

  it('keeps the fields discovery, profile, availability and booking rely on', () => {
    writeState(savedState());
    const { catalog } = repositories();
    expect(catalog.initializeFromState()).toBe(true);

    const owned = catalog.findById('roshan-clean-care-home-cleaning-1')!;
    expect(owned).toMatchObject({ ownerProviderId: 'PRO150', ownerProviderEmail: 'roshan@example.com', accountStatus: 'Suspended', verified: true, cityId: 1 });
    expect(owned.services).toEqual([{ id: 'SVC-1', name: 'Kitchen Cleaning', price: 650, status: 'Active' }]);
    // Same image rules as the frontend sync: data-URL images fall back, valid photos are kept.
    expect(owned.image).toBe('assets/images/home-cleaning/clean1.jpg');
    expect(owned.profilePhoto).toBe(PNG);
    // Fields outside the sync contract (contact details, history, users) are not exposed.
    expect(owned).not.toHaveProperty('phone');
    expect(owned).not.toHaveProperty('statusHistory');
    expect(JSON.stringify(catalog.findAll())).not.toContain('passwordHash');
  });

  it('is idempotent and never writes to the state file', () => {
    writeState(savedState());
    const before = readFileSync(stateFile, 'utf8');
    const { state, catalog } = repositories();
    catalog.initializeFromState();
    const first = JSON.stringify(catalog.findAll());
    catalog.initializeFromState();
    catalog.initializeFromState();

    expect(JSON.stringify(catalog.findAll())).toBe(first);
    expect(catalog.findAll().providers).toHaveLength(3);
    expect(readFileSync(stateFile, 'utf8')).toBe(before);
    expect(state.findAll().map((entry) => entry.key)).toEqual(['serveEaseSelectedCity', 'serveEaseData']);

    // A restart (fresh repositories over the same file) produces the same catalog.
    const restarted = repositories().catalog;
    restarted.initializeFromState();
    expect(JSON.stringify(restarted.findAll())).toBe(first);
  });

  it('skips invalid records and reports them', () => {
    writeState(savedState());
    const warn = jest.spyOn(Logger.prototype, 'warn');
    warn.mockClear();
    const { catalog } = repositories();
    catalog.initializeFromState();
    expect(catalog.findById('broken-provider')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('skipped 2 invalid record(s)'));
  });

  it.each([
    ['the state file is missing', null],
    ['the state file is not valid JSON', '{ not json'],
    ['there is no serveEaseData entry', [{ key: 'serveEaseSelectedCity', value: { id: 1 } }]],
    ['serveEaseData has no provider array', [{ key: 'serveEaseData', value: { categories: [], providers: 'none' } }]],
    ['every provider is invalid', [{ key: 'serveEaseData', value: { categories: savedState()[1].value!.categories, providers: [{ id: 'x' }] } }]],
  ])('leaves the catalog empty and logs the reason when %s', (_label, content) => {
    if (content !== null) writeState(content);
    const error = jest.spyOn(Logger.prototype, 'error');
    const warn = jest.spyOn(Logger.prototype, 'warn');
    error.mockClear();
    warn.mockClear();
    const { catalog } = repositories();

    expect(catalog.initializeFromState()).toBe(false);
    expect(catalog.findAll()).toEqual({ categories: [], providers: [], popularServices: [] });
    expect(error.mock.calls.length + warn.mock.calls.length).toBeGreaterThan(0);
  });

  it('loads the real saved application data', () => {
    copyFileSync(join(__dirname, '..', '..', '..', 'data', 'state.json'), stateFile);
    const saved = JSON.parse(readFileSync(stateFile, 'utf8')).find((entry: { key: string }) => entry.key === 'serveEaseData').value;
    const { catalog } = repositories();

    expect(catalog.initializeFromState()).toBe(true);
    const { categories, providers } = catalog.findAll();
    expect(categories.map((category) => category.id).sort()).toEqual(saved.categories.map((category: { id: string }) => category.id).sort());
    expect(providers.length).toBeGreaterThan(0);
    expect(providers.length).toBeLessThanOrEqual(saved.providers.length);
    providers.forEach((item) => {
      expect(saved.providers.some((source: { id: string }) => source.id === item.id)).toBe(true);
      expect(categories.some((category) => category.id === item.category)).toBe(true);
    });
  });
});
