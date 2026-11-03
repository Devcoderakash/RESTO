import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { signStaffToken } from '../src/utils/jwt.js';
import { setupTestDatabase } from './setupTestDb.js';

describe('RESTO V2 Security & Tenant Isolation Tests', () => {
  const app = createApp();
  let originalEnv: string;
  let originalAllowDemo: boolean;

  beforeEach(() => {
    setupTestDatabase();
    originalEnv = env.NODE_ENV;
    originalAllowDemo = env.ALLOW_DEMO_AUTH;
  });

  afterEach(() => {
    (env as any).NODE_ENV = originalEnv;
    (env as any).ALLOW_DEMO_AUTH = originalAllowDemo;
  });

  describe('1. Production Staff Authentication & Demo Token Rejection', () => {
    it('rejects protected staff endpoints with 401 when token is missing', async () => {
      const res = await request(app).get('/api/staff');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Staff authentication token required');
    });

    it('rejects malformed tokens with 401', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('PROD REJECTION: In production mode, rejects EVERY demo token with 401 Unauthorized', async () => {
      // Simulate production environment
      (env as any).NODE_ENV = 'production';
      (env as any).ALLOW_DEMO_AUTH = false;

      const demoTokens = [
        'demo-staff-token',
        'demo-staff-token-manager',
        'demo-staff-token-chef',
        'demo-staff-token-waiter',
      ];

      for (const token of demoTokens) {
        const res = await request(app)
          .get('/api/staff')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
        expect(res.body.message).toContain('Demo authentication is strictly disabled in production');
      }
    });

    it('PROD ACCEPTANCE: In production mode, accepts valid cryptographically signed JWT', async () => {
      (env as any).NODE_ENV = 'production';
      (env as any).ALLOW_DEMO_AUTH = false;

      const validJwt = signStaffToken({
        id: 'staff-manager-01',
        email: 'manager@oliveandember.com',
        name: 'Restaurant Manager',
        role: 'manager',
        restaurantId: 'rest-olive-ember-01',
      });

      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${validJwt}`);
      expect(res.status).toBe(200);
      expect(res.body.staff).toBeInstanceOf(Array);
    });

    it('REJECTS tampered JWT tokens where payload or signature is modified', async () => {
      const validJwt = signStaffToken({
        id: 'staff-manager-01',
        email: 'manager@oliveandember.com',
        name: 'Restaurant Manager',
        role: 'manager',
        restaurantId: 'rest-olive-ember-01',
      });

      // Tamper signature
      const tamperedJwt = validJwt.slice(0, -6) + 'xxxxxx';

      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${tamperedJwt}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid token');
    });

    it('REJECTS expired JWT tokens', async () => {
      // Create token expired 10 seconds ago
      const expiredJwt = signStaffToken(
        {
          id: 'staff-manager-01',
          email: 'manager@oliveandember.com',
          name: 'Restaurant Manager',
          role: 'manager',
          restaurantId: 'rest-olive-ember-01',
        },
        '-10s' // negative duration = already expired
      );

      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${expiredJwt}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Staff authentication token has expired');
    });
  });

  describe('2. Restaurant-Level Multi-Tenant Isolation', () => {
    it('isolates orders strictly by restaurant ID and verified JWT tenant', async () => {
      const validJwt = signStaffToken({
        id: 'staff-manager-01',
        email: 'manager@oliveandember.com',
        name: 'Restaurant Manager',
        role: 'manager',
        restaurantId: 'rest-olive-ember-01',
      });

      const res1 = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${validJwt}`);

      expect(res1.status).toBe(200);
      expect(res1.body.orders.length).toBeGreaterThan(0);
      for (const order of res1.body.orders) {
        expect(order.restaurantId).toBe('rest-olive-ember-01');
      }

      // Querying with JWT for a different tenant yields zero records from rest-olive-ember-01
      const otherTenantJwt = signStaffToken({
        id: 'staff-other-01',
        email: 'other@dining.com',
        name: 'Other Manager',
        role: 'manager',
        restaurantId: 'rest-other-dining-99',
      });

      const res2 = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${otherTenantJwt}`);

      expect(res2.status).toBe(200);
      expect(res2.body.orders).toHaveLength(0);
    });

    it('isolates table availability by restaurant slug', async () => {
      const res = await request(app)
        .get('/api/tables/availability?restaurantSlug=olive-and-ember');

      expect(res.status).toBe(200);
      expect(res.body.tables).toBeDefined();
      expect(res.body.tables.length).toBeGreaterThan(0);
    });
  });

  describe('3. Public vs Protected Route Access Boundaries', () => {
    it('allows public access to customer menu without authentication', async () => {
      const res = await request(app).get('/api/menu?restaurantSlug=olive-and-ember');
      expect(res.status).toBe(200);
      expect(res.body.categories).toBeDefined();
    });

    it('blocks unauthenticated public access to staff menu management', async () => {
      const res = await request(app).get('/api/staff/menu');
      expect(res.status).toBe(401);
    });

    it('allows public order creation without staff credentials', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          restaurant_id: 'rest-olive-ember-01',
          table_number: '01',
          customer_name: 'Walk-in Guest',
          items: [{ id: 'item-pizza-01', quantity: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.order).toBeDefined();
      expect(res.body.trackingToken).toBeDefined();
    });
  });
});
