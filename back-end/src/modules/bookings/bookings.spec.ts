import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    create: (data: Partial<Booking>) => { const item = { ...data, id: 'BOOK-20300102-1000-0003', createdAt: new Date().toISOString() } as Booking; bookings.unshift(item); return item; }, delete: () => undefined,
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
  it('allows a superuser session to list all bookings', async () => { const response = await request(app.getHttpServer()).get('/bookings').set('Authorization', 'Bearer admin').expect(200); expect(response.body.data).toHaveLength(2); });
});
