import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Seat Lock & Concurrency', () => {
  let user1Token = '';
  let user2Token = '';
  let scheduleId = '';
  let testSeatId = '';
  let testSeatId2 = '';

  beforeAll(async () => {
    // Setup users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user1 = await prisma.user.upsert({
      where: { email: 'user1@example.com' },
      update: {},
      create: { email: 'user1@example.com', password: hashedPassword, name: 'User 1' }
    });
    const user2 = await prisma.user.upsert({
      where: { email: 'user2@example.com' },
      update: {},
      create: { email: 'user2@example.com', password: hashedPassword, name: 'User 2' }
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-for-local-dev';
    user1Token = jwt.sign({ id: user1.id, email: user1.email }, JWT_SECRET);
    user2Token = jwt.sign({ id: user2.id, email: user2.email }, JWT_SECRET);

    // Get a schedule and seats for testing
    const schedule = await prisma.schedule.findFirst();
    if (schedule) {
      scheduleId = schedule.id;
      const seats = await prisma.seat.findMany({ where: { scheduleId } });
      if (seats.length >= 2) {
        testSeatId = seats[0].id;
        testSeatId2 = seats[1].id;
      }
    }
  });

  afterAll(async () => {
    // Cleanup locks and bookings to not break other tests
    await prisma.booking.deleteMany();
    await prisma.seat.updateMany({
      where: { id: { in: [testSeatId, testSeatId2] } },
      data: { status: 'AVAILABLE', lockedBy: null, lockedUntil: null }
    });
  });

  it('2 parallel lock requests to the same seat -> only 1 succeeds', async () => {
    // Reset seat to ensure it's available
    await prisma.seat.update({
      where: { id: testSeatId },
      data: { status: 'AVAILABLE', lockedBy: null, lockedUntil: null, version: 0 }
    });

    const req1 = request(app)
      .post(`/schedules/${scheduleId}/seats/${testSeatId}/lock`)
      .set('Authorization', `Bearer ${user1Token}`);
      
    const req2 = request(app)
      .post(`/schedules/${scheduleId}/seats/${testSeatId}/lock`)
      .set('Authorization', `Bearer ${user2Token}`);

    // Execute simultaneously
    const responses = await Promise.all([req1, req2]);

    const successCount = responses.filter(r => r.status === 200).length;
    const conflictCount = responses.filter(r => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(1);
  });

  it('Booking fails if locked by someone else', async () => {
    // Assuming the previous test left the seat locked by someone
    // Let's force it to be locked by user1
    const user1Decoded: any = jwt.decode(user1Token);
    await prisma.seat.update({
      where: { id: testSeatId },
      data: { 
        status: 'LOCKED', 
        lockedBy: user1Decoded.id, 
        lockedUntil: new Date(Date.now() + 60000)
      }
    });

    // user2 tries to book it
    const res = await request(app)
      .post('/bookings/confirm')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ scheduleId, seatId: testSeatId });
    
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not locked by you/i);
  });

  it('Booking succeeds if locked by the user', async () => {
    // user1 tries to book the seat they locked
    const res = await request(app)
      .post('/bookings/confirm')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ scheduleId, seatId: testSeatId });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Booking confirmed');
    expect(res.body.booking).toHaveProperty('status', 'CONFIRMED');

    // Seat status should be updated to BOOKED
    const seat = await prisma.seat.findUnique({ where: { id: testSeatId } });
    expect(seat?.status).toBe('BOOKED');
  });

  it('Lock expired automatically releases the seat', async () => {
    const user1Decoded: any = jwt.decode(user1Token);
    
    // Simulate expired lock on testSeatId2
    await prisma.seat.update({
      where: { id: testSeatId2 },
      data: { 
        status: 'LOCKED', 
        lockedBy: user1Decoded.id, 
        // Set lockedUntil to 5 minutes ago
        lockedUntil: new Date(Date.now() - 5 * 60 * 1000) 
      }
    });

    // GET /seats should show it as AVAILABLE
    const res = await request(app)
      .get(`/schedules/${scheduleId}/seats`);
    
    expect(res.status).toBe(200);
    const expiredSeat = res.body.find((s: any) => s.id === testSeatId2);
    expect(expiredSeat.status).toBe('AVAILABLE');

    // And user2 should be able to lock it since it's expired
    const lockRes = await request(app)
      .post(`/schedules/${scheduleId}/seats/${testSeatId2}/lock`)
      .set('Authorization', `Bearer ${user2Token}`);
    
    expect(lockRes.status).toBe(200);
  });
});
