import 'reflect-metadata';
import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AuthService } from '../auth/auth.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Booking } from './booking.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

describe('Booking bearer-session authorization', () => {
  let app: INestApplication;
  const bookings: Booking[] = [];
  const principal = (token: string) => ({ customer: { userId: 'CUS-A', role: 'customer', email: 'customer@example.test' }, provider: { userId: 'PRO-A', role: 'provider', email: 'provider@example.test' }, admin: { userId: 'SUR-A', role: 'superuser', email: 'admin@example.test' } } as Record<string, any>)[token] || (() => { throw new Error('invalid'); })();
  const repository = {
    findAll: () => bookings, findByCustomer: (id: string) => bookings.filter((item) => item.customerId === id), findByProvider: (id: string) => bookings.filter((item) => item.providerId === id), findById: (id: string) => bookings.find((item) => item.id === id),
    update: (id: string, data: Partial<Booking>) => { const item = bookings.find((candidate) => candidate.id === id); if (item) Object.assign(item, data); return item; },
    create: (data: Partial<Booking>) => { const item = { ...data, id: 'BOOK-20300102-1000-0003', createdAt: new Date().toISOString() } as Booking; bookings.unshift(item); return item; },
    reschedule: (id: string, change: Partial<Booking>) => { const item = bookings.find((candidate) => candidate.id === id); if (!item) return undefined; Object.assign(item, change, { rescheduleCount: (item.rescheduleCount || 0) + 1, stateVersion: (item.stateVersion || 0) + 1 }); return item; }, delete: () => undefined,
  };
  const availability = { assertBookable: jest.fn() };
  const catalog = { isBookable: () => true, findAll: () => ({ providers: [{ id: 'PRO-A', ownerProviderId: 'PRO-A', name: 'Provider A', category: 'Cleaning', subServices: ['Cleaning'], servicePricing: { Cleaning: 799 }, startingPrice: 799 }] }) };
  const booking = (id: string, customerId: string, providerId: string): Booking => ({ id, customerId, providerId, service: 'Cleaning', provider: providerId, date: '2030-01-02', time: '10:00 AM - 12:00 PM', address: '123 Example Road', status: 'Pending', category: 'Cleaning', paymentStatus: 'Pending', amount: 100, customerName: customerId, customerPhone: '1234567890', customerEmail: `${customerId.toLowerCase()}@example.test`, createdAt: new Date().toISOString() });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [BookingsController], providers: [RolesGuard, { provide: AuthService, useValue: { principal } }, { provide: BookingsService, useFactory: () => new BookingsService(repository as any, availability as any, catalog as any) }] }).compile();
    app = moduleRef.createNestApplication(); app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })); await app.init();
  });
  beforeEach(() => { bookings.splice(0, bookings.length, booking('BOOK-20300102-1000-0001', 'CUS-A', 'PRO-A'), booking('BOOK-20300102-1000-0002', 'CUS-B', 'PRO-B')); availability.assertBookable.mockClear(); });
  afterAll(async () => { await app.close(); });

  it('rejects missing and forged authorization', async () => { await request(app.getHttpServer()).get('/bookings').expect(403); await request(app.getHttpServer()).get('/bookings').set('Authorization', 'Bearer invalid').expect(403); });
  it('scopes customer lists to the session despite spoofed headers', async () => { const response = await request(app.getHttpServer()).get('/bookings').set('Authorization', 'Bearer customer').set('user-id', 'CUS-B').set('user-email', 'cus-b@example.test').set('role', 'admin').expect(200); expect(response.body.data.map((item: Booking) => item.id)).toEqual(['BOOK-20300102-1000-0001']); });
  it('rejects customer access to another customer booking despite spoofed email', async () => { await request(app.getHttpServer()).get('/bookings/BOOK-20300102-1000-0002').set('Authorization', 'Bearer customer').set('user-email', 'cus-b@example.test').expect(404); });
  it('creates a customer booking using session identity and server price', async () => { const payload = { service: 'Cleaning', providerId: 'PRO-A', date: '2030-01-03', time: '10:00 AM - 12:00 PM', address: '456 Example Road' }; const response = await request(app.getHttpServer()).post('/bookings/customer').set('Authorization', 'Bearer customer').set('user-id', 'CUS-B').send(payload).expect(201); expect(response.body.data.customerId).toBe('CUS-A'); expect(response.body.data).toMatchObject({ serviceFee: 799, taxAmount: 79.9, platformFeeAmount: 39.95, customerTotal: 918.85, amount: 918.85, providerPayout: 719.1, platformRevenueAmount: 119.85 }); });
  it('allows only valid customer and provider transitions on owned bookings', async () => { await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0001').set('Authorization', 'Bearer customer').send({ status: 'Cancelled' }).expect(200); bookings[0].status = 'Pending'; await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0001').set('Authorization', 'Bearer provider').send({ status: 'Accepted' }).expect(200); await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0002').set('Authorization', 'Bearer provider').send({ status: 'Accepted' }).expect(404); });
  it('requires and persists a provider rejection reason', async () => {
    const url = '/bookings/BOOK-20300102-1000-0001/provider-status';
    const auth = request(app.getHttpServer()).patch(url).set('Authorization', 'Bearer provider');
    await auth.send({ status: 'Rejected' }).expect(400);
    bookings[0].stateVersion = 1;
    await request(app.getHttpServer()).patch(url).set('Authorization', 'Bearer provider').send({ status: 'Rejected', rejectionReason: '   ' }).expect(400);
    bookings[0].status = 'Pending';
    const response = await request(app.getHttpServer()).patch(url).set('Authorization', 'Bearer provider').send({ status: 'Rejected', rejectionReason: '  Schedule conflict  ', stateVersion: 1 }).expect(200);
    expect(response.body.data).toMatchObject({ status: 'Rejected', rejectionReason: 'Schedule conflict' });
    expect(bookings[0].rejectionReason).toBe('Schedule conflict');
  });
  it('accepts without a reason, returns the rejection reason to the customer, and keeps whitelist validation', async () => {
    const url = '/bookings/BOOK-20300102-1000-0001/provider-status';
    await request(app.getHttpServer()).patch(url).set('Authorization', 'Bearer provider').send({ status: 'Accepted' }).expect(200);
    bookings[0].status = 'Pending';
    bookings[0].stateVersion = 1;
    await request(app.getHttpServer()).patch(url).set('Authorization', 'Bearer provider').send({ status: 'Accepted', unexpected: true }).expect(400);
    const rejected = await request(app.getHttpServer()).patch(url).set('Authorization', 'Bearer provider').send({ status: 'Rejected', rejectionReason: 'Schedule conflict' }).expect(200);
    expect(rejected.body.data.rejectionReason).toBe('Schedule conflict');
    const customerView = await request(app.getHttpServer()).get('/bookings/BOOK-20300102-1000-0001').set('Authorization', 'Bearer customer').expect(200);
    expect(customerView.body.data.rejectionReason).toBe('Schedule conflict');
  });
  it('rejects a rejection attempt from a provider who does not own the booking', async () => {
    await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0002/provider-status').set('Authorization', 'Bearer provider').send({ status: 'Rejected', rejectionReason: 'Schedule conflict' }).expect(403);
  });
  it('requires a reason on the alternate provider status route and preserves booking ownership', async () => {
    await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0001').set('Authorization', 'Bearer provider').send({ status: 'Rejected' }).expect(400);
    await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0002').set('Authorization', 'Bearer provider').send({ status: 'Rejected', rejectionReason: 'Schedule conflict' }).expect(404);
  });
  it('allows a superuser session to list all bookings', async () => { const response = await request(app.getHttpServer()).get('/bookings').set('Authorization', 'Bearer admin').expect(200); expect(response.body.data).toHaveLength(2); });

  describe('Booking reschedule', () => {
    const url = '/bookings/BOOK-20300102-1000-0001/reschedule';
    const auth = () => request(app.getHttpServer()).patch(url).set('Authorization', 'Bearer customer');
    it('changes only the schedule and keeps the booking pending', async () => {
      const response = await auth().send({ date: '2030-01-03', time: '13:00-15:00' }).expect(200);
      expect(response.body.data).toMatchObject({ date: '2030-01-03', time: '13:00-15:00', status: 'Pending', rescheduleCount: 1 });
      expect(availability.assertBookable).toHaveBeenCalledWith('PRO-A', '2030-01-03', '13:00-15:00', 'BOOK-20300102-1000-0001');
    });
    it('rejects another customer booking and non-customer roles', async () => {
      await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0002/reschedule').set('Authorization', 'Bearer customer').send({ date: '2030-01-03', time: '13:00' }).expect(404);
      await auth().set('Authorization', 'Bearer provider').send({ date: '2030-01-03', time: '13:00' }).expect(403);
      await request(app.getHttpServer()).patch(url).send({ date: '2030-01-03', time: '13:00' }).expect(403);
    });
    it('rejects same slots, stale versions, and invalid DTO fields', async () => {
      await auth().send({ date: '2030-01-02', time: '10:00 AM-12:00 PM' }).expect(400);
      bookings[0].stateVersion = 2;
      await auth().send({ date: '2030-01-03', time: '13:00', stateVersion: 1 }).expect(409);
      await auth().send({ date: '13-11-2026', time: '13:00' }).expect(400);
      await auth().send({ date: '2030-01-03' }).expect(400);
      await auth().send({ date: '2030-01-03', time: '13:00', unexpected: true }).expect(400);
    });
    it('rejects bookings that are no longer pending', async () => {
      for (const status of ['Accepted', 'Cancelled', 'Rejected']) {
        bookings[0].status = status;
        await auth().send({ date: '2030-01-03', time: '13:00' }).expect(400);
        bookings[0].status = 'Pending';
      }
    });
    it('leaves the booking unchanged when the selected slot is unavailable', async () => {
      const before = { ...bookings[0] };
      availability.assertBookable.mockImplementationOnce(() => { throw new BadRequestException('The selected slot is unavailable.'); });
      await auth().send({ date: '2030-01-03', time: '13:00' }).expect(400);
      expect(bookings[0]).toMatchObject({ date: before.date, time: before.time, status: before.status });
    });
    it('rejects rescheduling when the provider is no longer bookable', async () => {
      const check = jest.spyOn(catalog, 'isBookable').mockReturnValue(false);
      await auth().send({ date: '2030-01-03', time: '13:00' }).expect(409);
      check.mockRestore();
    });
  });
});
