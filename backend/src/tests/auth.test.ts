import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';

describe('Auth & Core API', () => {
  beforeAll(async () => {
    // Ensure we have user1 for testing
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.upsert({
      where: { email: 'user1@example.com' },
      update: { password: hashedPassword },
      create: {
        email: 'user1@example.com',
        password: hashedPassword,
        name: 'User Satu',
      }
    });
  });

  let token = '';

  it('Login success should return JWT', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user1@example.com', password: 'password123' });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('Login failed with wrong password should return 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user1@example.com', password: 'wrongpassword' });
    
    expect(res.status).toBe(401);
  });

  it('Access protected endpoint without token should return 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('Access protected endpoint with valid token should return 200', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('email', 'user1@example.com');
  });
});
