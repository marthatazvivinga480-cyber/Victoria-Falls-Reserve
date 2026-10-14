import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from './app.js';
import { seedData } from './seed-data.js';
import { setAdminPassword } from './services/admin-password.js';
import { Room, Booking, Review, Payment, User } from './models.js';
let mongo: MongoMemoryReplSet;
let customer: string;
let admin: string;
let room: string;
let hotel: string;
let booking: string;
beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await seedData({ adminPassword: 'LocalFixtureAdmin123!' });
  await Promise.all([Booking.init(), Review.init(), User.init()]);
  const r = await Room.findOne();
  room = r!.id;
  hotel = String(r!.hotel);
  await Room.updateOne({ _id: room }, { units: 1 });
  customer = (
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@vfr.example', password: 'ReserveDemo123!' })
  ).body.accessToken;
  admin = (
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@vfr.example', password: 'LocalFixtureAdmin123!' })
  ).body.accessToken;
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
const auth = (token = customer) => ({ Authorization: `Bearer ${token}` });
describe('API integration', () => {
  it('reports health and lists the six hotels', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200);
    const res = await request(app).get('/api/hotels');
    expect(res.body).toHaveLength(6);
    expect((await request(app).get(`/api/hotels/${hotel}`)).body.rooms).toHaveLength(3);
  });
  it('registers, rejects duplicate email and wrong password, rotates refresh and revokes logout', async () => {
    const agent = request.agent(app);
    const input = { name: 'New Guest', email: 'new@example.com', password: 'NewPassword123!' };
    expect((await agent.post('/api/auth/register').send(input)).status).toBe(201);
    expect((await agent.post('/api/auth/register').send(input)).status).toBe(409);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ ...input, password: 'bad' })
      ).status,
    ).toBe(401);
    const first = (await agent.post('/api/auth/refresh')).headers['set-cookie'];
    expect(first).toBeTruthy();
    expect((await agent.post('/api/auth/refresh')).status).toBe(200);
    await agent.post('/api/auth/logout');
    expect((await agent.post('/api/auth/refresh')).status).toBe(401);
  });
  it('rejects unauthenticated and customer admin access', async () => {
    expect((await request(app).get('/api/admin/hotels')).status).toBe(401);
    for (const path of [
      'hotels',
      'rooms',
      'bookings',
      'customers',
      'reviews',
      'payments',
      'analytics',
    ])
      expect((await request(app).get(`/api/admin/${path}`).set(auth())).status).toBe(403);
  });
  it('validates IDs, dates, capacity, foreign origins and extra payment fields', async () => {
    expect((await request(app).get('/api/hotels/not-an-id')).status).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/bookings')
          .set(auth())
          .send({ room, checkIn: '2030-02-30', checkOut: '2030-03-03', guests: 2 })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/bookings')
          .set(auth())
          .send({ room, checkIn: '2030-01-10', checkOut: '2030-01-12', guests: 12 })
      ).status,
    ).toBe(400);
    expect(
      (await request(app).post('/api/auth/refresh').set('Origin', 'https://foreign.example'))
        .status,
    ).toBe(403);
  });
  it('prevents simultaneous overbooking and permits turnaround', async () => {
    const input = { room, checkIn: '2030-01-10', checkOut: '2030-01-12', guests: 2 };
    const results = await Promise.all(
      Array.from({ length: 4 }, () => request(app).post('/api/bookings').set(auth()).send(input)),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    booking = results.find((r) => r.status === 201)!.body._id;
    expect(
      (
        await request(app).get(
          `/api/rooms/${room}/availability?checkIn=2030-01-10&checkOut=2030-01-12`,
        )
      ).body.available,
    ).toBe(0);
    expect(
      (
        await request(app)
          .post('/api/bookings')
          .set(auth())
          .send({ ...input, checkIn: '2030-01-12', checkOut: '2030-01-13' })
      ).status,
    ).toBe(201);
  });
  it('simulates failure, success, prevents duplicate payment, blocks unauthorized reads', async () => {
    expect(
      (
        await request(app)
          .post(`/api/bookings/${booking}/pay`)
          .set(auth())
          .send({ outcome: 'failure' })
      ).body.paymentStatus,
    ).toBe('failed');
    expect(
      (
        await request(app)
          .post(`/api/bookings/${booking}/pay`)
          .set(auth())
          .send({ outcome: 'success', card: 'real' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/api/bookings/${booking}/pay`)
          .set(auth())
          .send({ outcome: 'success' })
      ).body.status,
    ).toBe('confirmed');
    expect(
      (
        await request(app)
          .post(`/api/bookings/${booking}/pay`)
          .set(auth())
          .send({ outcome: 'success' })
      ).status,
    ).toBe(409);
    const other = (
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'new@example.com', password: 'NewPassword123!' })
    ).body.accessToken;
    expect((await request(app).get(`/api/bookings/${booking}`).set(auth(other))).status).toBe(404);
  });
  it('refunds, releases inventory and rejects duplicate cancellation', async () => {
    const res = await request(app).post(`/api/bookings/${booking}/cancel`).set(auth());
    expect(res.body.status).toBe('cancelled');
    expect(res.body.paymentStatus).toBe('refunded');
    expect(res.body.refunded).toBe(res.body.total);
    expect(
      (
        await request(app).get(
          `/api/rooms/${room}/availability?checkIn=2030-01-10&checkOut=2030-01-12`,
        )
      ).body.available,
    ).toBe(1);
    expect((await request(app).post(`/api/bookings/${booking}/cancel`).set(auth())).status).toBe(
      409,
    );
    expect(await Payment.countDocuments({ kind: 'refund', booking })).toBe(1);
  });
  it('enforces completed-stay reviews, uniqueness and moderation', async () => {
    expect(
      (
        await request(app)
          .post('/api/reviews')
          .set(auth())
          .send({ booking, rating: 5, comment: 'Wonderful hospitality.' })
      ).status,
    ).toBe(403);
    await Booking.updateOne({ _id: booking }, { status: 'checked_out' });
    const res = await request(app)
      .post('/api/reviews')
      .set(auth())
      .send({ booking, rating: 5, comment: 'Wonderful hospitality.' });
    expect(res.status).toBe(201);
    expect(
      (
        await request(app)
          .post('/api/reviews')
          .set(auth())
          .send({ booking, rating: 4, comment: 'Another nice review.' })
      ).status,
    ).toBe(409);
    expect(
      (await request(app).delete(`/api/admin/reviews/${res.body._id}`).set(auth(admin))).status,
    ).toBe(204);
  });
  it('manages profile and favorites', async () => {
    expect(
      (await request(app).patch('/api/me').set(auth()).send({ name: 'Alex Updated' })).body.name,
    ).toBe('Alex Updated');
    await request(app).post(`/api/me/favorites/${hotel}`).set(auth());
    expect((await request(app).get('/api/me').set(auth())).body.favorites).toContain(hotel);
    await request(app).delete(`/api/me/favorites/${hotel}`).set(auth());
    expect((await request(app).get('/api/me').set(auth())).body.favorites).not.toContain(hotel);
  });
  it('rejects replay of a rotated refresh token', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@vfr.example', password: 'ReserveDemo123!' });
    const cookie = String(login.headers['set-cookie'][0]).split(';')[0];
    expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
  });
  it('applies late refunds, no-show retention and admin stay transitions', async () => {
    const user = (await User.findOne({ email: 'customer@vfr.example' }))!;
    const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const before = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const late = await Booking.create({
      user: user._id,
      hotel,
      room,
      unit: 0,
      checkIn: past,
      checkOut: '2030-01-01',
      guests: 2,
      nights: 3,
      nightlyRate: 100,
      total: 300,
      status: 'confirmed',
      paymentStatus: 'paid',
    });
    const cancelled = await request(app).post(`/api/bookings/${late.id}/cancel`).set(auth());
    expect(cancelled.body.cancellationCharge).toBe(100);
    expect(cancelled.body.refunded).toBe(200);
    const missing = await Booking.create({
      user: user._id,
      hotel,
      room,
      unit: 0,
      checkIn: before,
      checkOut: past,
      guests: 2,
      nights: 2,
      nightlyRate: 100,
      total: 200,
      status: 'confirmed',
      paymentStatus: 'paid',
    });
    const noShow = await request(app)
      .patch(`/api/admin/bookings/${missing.id}`)
      .set(auth(admin))
      .send({ action: 'no_show' });
    expect(noShow.body.noShow).toBe(true);
    expect(noShow.body.cancellationCharge).toBe(200);
    expect(noShow.body.refunded).toBe(0);
    const stayed = await Booking.create({
      user: user._id,
      hotel,
      room,
      unit: 0,
      checkIn: before,
      checkOut: past,
      guests: 2,
      nights: 2,
      nightlyRate: 100,
      total: 200,
      status: 'confirmed',
      paymentStatus: 'paid',
    });
    expect(
      (
        await request(app)
          .patch(`/api/admin/bookings/${stayed.id}`)
          .set(auth(admin))
          .send({ action: 'check_in' })
      ).body.status,
    ).toBe('checked_in');
    expect(
      (
        await request(app)
          .patch(`/api/admin/bookings/${stayed.id}`)
          .set(auth(admin))
          .send({ action: 'check_out' })
      ).body.status,
    ).toBe('checked_out');
  });
  it('supports admin CRUD, status rules and financial overview', async () => {
    const input = {
      name: 'Test Retreat',
      description: 'A peaceful fictional test retreat.',
      location: 'Victoria Falls',
      image: '/images/hotels/hotel-1.svg',
      amenities: ['Pool'],
      featured: false,
      active: true,
    };
    const h = await request(app).post('/api/admin/hotels').set(auth(admin)).send(input);
    expect(h.status).toBe(201);
    expect(
      (
        await request(app)
          .patch(`/api/admin/hotels/${h.body._id}`)
          .set(auth(admin))
          .send({ ...input, name: 'Updated Retreat' })
      ).status,
    ).toBe(200);
    const r = await request(app).post('/api/admin/rooms').set(auth(admin)).send({
      hotel: h.body._id,
      name: 'Test King',
      description: 'Room',
      image: '/images/rooms/room-1.svg',
      capacity: 2,
      price: 150,
      units: 1,
      active: true,
    });
    expect(r.status).toBe(201);
    expect(
      (await request(app).delete(`/api/admin/rooms/${r.body._id}`).set(auth(admin))).status,
    ).toBe(204);
    expect(
      (await request(app).delete(`/api/admin/hotels/${h.body._id}`).set(auth(admin))).status,
    ).toBe(204);
    expect(
      (
        await request(app)
          .patch(`/api/admin/bookings/${booking}`)
          .set(auth(admin))
          .send({ action: 'check_in' })
      ).status,
    ).toBe(409);
    expect(
      (await request(app).get('/api/admin/analytics').set(auth(admin))).body.refunded,
    ).toBeGreaterThan(200);
    for (const path of ['rooms', 'bookings', 'customers', 'reviews', 'payments'])
      expect((await request(app).get(`/api/admin/${path}`).set(auth(admin))).status).toBe(200);
  });
  it('revokes old admin password, access tokens and refresh sessions after a reset', async () => {
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .send({ email: 'admin@vfr.example', password: 'LocalFixtureAdmin123!' });
    expect(login.status).toBe(200);
    await setAdminPassword('admin@vfr.example', 'NewPrivateAdmin456!');
    expect(
      (await request(app).get('/api/admin/hotels').set(auth(login.body.accessToken))).status,
    ).toBe(401);
    expect((await agent.post('/api/auth/refresh')).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'admin@vfr.example', password: 'LocalFixtureAdmin123!' })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'admin@vfr.example', password: 'NewPrivateAdmin456!' })
      ).status,
    ).toBe(200);
    await seedData({ adminPassword: 'LocalFixtureAdmin123!' });
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'admin@vfr.example', password: 'NewPrivateAdmin456!' })
      ).status,
    ).toBe(200);
  });
});
