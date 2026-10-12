import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { RolesGuard } from '../../guards/roles.guard';
import { Booking } from './booking.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

describe('Booking header RBAC and compatibility scoping', () => {
  let app: INestApplication;
  const bookings: Booking[] = [];
  const availability = { assertBookable: jest.fn() };
  const repository = {
    findAll: () => bookings,
    findByCustomerIdentity: (userId: string, email: string) => bookings.filter((item) =>
      Boolean((userId && item.customerId === userId) || (email && item.customerEmail.toLowerCase() === email.toLowerCase()))),
    findByProvider: (id: string) => bookings.filter((item) => item.providerId === id),
    findById: (id: string) => bookings.find((item) => item.id === id),
    update: (id: string, data: Partial<Booking>) => {
      const item = bookings.find((candidate) => candidate.id === id);
      if (item) Object.assign(item, data);
      return item;
    },
    create: (data: Partial<Booking>) => {
      const item = { ...data, id: 'BOOK-20300102-1000-0003', createdAt: new Date().toISOString() } as Booking;
      bookings.unshift(item);
      return item;
    },
    delete: (id: string) => {
      const index = bookings.findIndex((item) => item.id === id);
      return index < 0 ? undefined : bookings.splice(index, 1)[0];
    },
  };
  const catalog = { findAll: () => ({ providers: [{
    id: 'PRO-A', ownerProviderId: 'PRO-A', name: 'Provider A', category: 'Cleaning',
    subServices: ['Cleaning'], servicePricing: { Cleaning: 799 }, startingPrice: 799,
  }] }) };
  const booking = (id: string, customerId: string, providerId: string): Booking => ({
    id, customerId, providerId, service: 'Cleaning', provider: providerId,
    date: '2030-01-02', time: '10:00 AM - 12:00 PM', address: '123 Example Road',
    status: 'Pending', category: 'Cleaning', paymentStatus: 'Pending', amount: 100,
    customerName: customerId, customerPhone: '1234567890', customerEmail: `${customerId.toLowerCase()}@example.test`,
    createdAt: new Date().toISOString(),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [RolesGuard, {
        provide: BookingsService,
        useFactory: () => new BookingsService(repository as any, availability as any, catalog as any),
      }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  beforeEach(() => {
    bookings.splice(0, bookings.length,
      booking('BOOK-20300102-1000-0001', 'CUS-A', 'PRO-A'),
      booking('BOOK-20300102-1000-0002', 'CUS-B', 'PRO-B'),
    );
    availability.assertBookable.mockClear();
  });

  afterAll(async () => { await app.close(); });

  it('uses the required role header and gives admin the full in-memory list', async () => {
    await request(app.getHttpServer()).get('/bookings').expect(403);
    await request(app.getHttpServer()).get('/bookings').set('role', 'admin').expect(200)
      .then((response) => expect(response.body.data).toHaveLength(2));
  });

  it('filters user and provider lists by supplied identity headers, which remain spoofable', async () => {
    const customer = await request(app.getHttpServer()).get('/bookings').set('role', 'user').set('user-id', 'CUS-A').expect(200);
    expect(customer.body.data.map((item: Booking) => item.id)).toEqual(['BOOK-20300102-1000-0001']);
    const provider = await request(app.getHttpServer()).get('/bookings').set('role', 'provider').set('user-id', 'PRO-B').expect(200);
    expect(provider.body.data.map((item: Booking) => item.id)).toEqual(['BOOK-20300102-1000-0002']);
    const spoofed = await request(app.getHttpServer()).get('/bookings').set('role', 'user').set('user-id', 'CUS-B').expect(200);
    expect(spoofed.body.data[0].customerId).toBe('CUS-B');
  });

  it('filters detail reads but cannot prevent access when the caller spoofs the owner headers', async () => {
    await request(app.getHttpServer()).get('/bookings/BOOK-20300102-1000-0002')
      .set('role', 'user').set('user-id', 'CUS-A').expect(404);
    await request(app.getHttpServer()).get('/bookings/BOOK-20300102-1000-0002')
      .set('role', 'user').set('user-id', 'CUS-B').expect(200);
  });

  it('creates a customer booking through a restricted DTO and a server catalog price', async () => {
    const payload = { service: 'Cleaning', providerId: 'PRO-A', date: '2030-01-03', time: '10:00 AM - 12:00 PM', address: '456 Example Road' };
    const response = await request(app.getHttpServer()).post('/bookings/customer').set('role', 'user')
      .set('user-id', 'CUS-A').set('user-email', 'cus-a@example.test').send(payload).expect(201);
    expect(response.body.data.customerId).toBe('CUS-A');
    expect(response.body.data.amount).toBe(799);
    expect(response.body.data.paymentStatus).toBe('Pending');
    await request(app.getHttpServer()).post('/bookings/customer').set('role', 'user').set('user-id', 'CUS-A')
      .send({ ...payload, customerId: 'CUS-B', amount: 1, paymentStatus: 'Successful' }).expect(400);
    await request(app.getHttpServer()).post('/bookings/customer').set('role', 'provider').set('user-id', 'PRO-A')
      .send(payload).expect(403);
  });

  it('limits non-admin changes to role-specific status transitions and rejects privileged fields', async () => {
    await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0001').set('role', 'user').set('user-id', 'CUS-A')
      .send({ status: 'Completed' }).expect(400);
    await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0001').set('role', 'user').set('user-id', 'CUS-A')
      .send({ status: 'Cancelled', paymentStatus: 'Successful' }).expect(403);
    await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0001').set('role', 'user').set('user-id', 'CUS-A')
      .send({ status: 'Cancelled' }).expect(200);
    await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0002').set('role', 'provider').set('user-id', 'PRO-A')
      .send({ status: 'Accepted' }).expect(404);
    bookings[0].status = 'Pending';
    await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0001').set('role', 'provider').set('user-id', 'PRO-A')
      .send({ status: 'Accepted', providerId: 'PRO-B' }).expect(403);
    await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0001').set('role', 'provider').set('user-id', 'PRO-A')
      .send({ status: 'Accepted' }).expect(200);
  });

  it('keeps full booking management restricted to the admin role header', async () => {
    await request(app.getHttpServer()).post('/bookings').set('role', 'user').send({}).expect(403);
    await request(app.getHttpServer()).patch('/bookings/BOOK-20300102-1000-0001').set('role', 'admin')
      .send({ address: 'Admin updated address' }).expect(200);
    await request(app.getHttpServer()).del('/bookings/BOOK-20300102-1000-0002').set('role', 'user').expect(403);
  });
});
