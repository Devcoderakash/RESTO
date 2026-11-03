import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase } from './setupTestDb.js';

describe('RESTO V2 Security & Tenant Isolation Tests', () => {
  const app = createApp();

  beforeEach(() => {
    setupTestDatabase();
  });

  describe('1. Authentication Middleware & Token Verification', () => {
    it('rejects protected staff endpoints with 401 Unauthorized when token is missing', async () => {
      const res = await request(app).get('/api/staff');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Staff authentication token required');
    });

    it('rejects invalid or malformed tokens with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', 'Bearer invalid-short');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid or expired staff token');
    });

    it('accepts valid demo manager token and grants access', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', 'Bearer demo-staff-token-manager');
      expect(res.status).toBe(200);
      expect(res.body.staff).toBeDefined();
      expect(Array.isArray(res.body.staff)).toBe(true);
    });

    it('accepts valid staff JWT token format', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', 'Bearer staff-token-manager-authenticated-999');
      expect(res.status).toBe(200);
      expect(res.body.staff).toBeDefined();
    });
  });

  describe('2. Restaurant-Level Multi-Tenant Isolation', () => {
    it('isolates orders strictly by restaurant ID', async () => {
      const res1 = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer demo-staff-token-manager')
        .set('X-Restaurant-ID', 'rest-olive-ember-01');

      expect(res1.status).toBe(200);
      expect(res1.body.orders.length).toBeGreaterThan(0);
      for (const order of res1.body.orders) {
        expect(order.restaurantId).toBe('rest-olive-ember-01');
      }

      // Querying an isolated non-existent or other restaurant yields empty list, not cross-tenant leakage
      const res2 = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer demo-staff-token-manager')
        .set('X-Restaurant-ID', 'rest-other-dining-99');

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
