import http from 'http';
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { signStaffToken } from '../src/utils/jwt.js';
import { setupTestDatabase } from './setupTestDb.js';

describe('RESTO V2 Comprehensive 45-Endpoint API Contract Test Suite', () => {
  const app = createApp();
  const testToken = signStaffToken({
    id: 'staff-manager-01',
    email: 'manager@oliveandember.com',
    name: 'Restaurant Manager',
    role: 'manager',
    restaurantId: 'rest-olive-ember-01',
  });
  const staffAuth = `Bearer ${testToken}`;

  beforeEach(() => {
    setupTestDatabase();
  });

  // Group 1: Probes & Health (Routes 1-3)
  describe('Group 1: System Probes & Health (Routes 1-3)', () => {
    it('1. GET /api/health/live (Liveness probe)', async () => {
      const res = await request(app).get('/api/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
    });

    it('2. GET /api/health/ready (Readiness probe)', async () => {
      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.database).toBe('connected');
    });

    it('3. GET /api/health (Full system diagnostics)', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database_vendor).toBe('postgresql');
    });
  });

  // Group 2: Restaurants & Configuration (Routes 4-7)
  describe('Group 2: Restaurants & Configuration (Routes 4-7)', () => {
    it('4. GET /api/restaurants/info', async () => {
      const res = await request(app).get('/api/restaurants/info?slug=olive-and-ember');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('The Olive & Ember');
      expect(res.body.tax_percentage).toBe(5);
    });

    it('5. GET /api/restaurants/:slug', async () => {
      const res = await request(app).get('/api/restaurants/olive-and-ember');
      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('olive-and-ember');
    });

    it('6. GET /api/staff/restaurant-settings', async () => {
      const res = await request(app)
        .get('/api/staff/restaurant-settings')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.opening_hours).toBeDefined();
    });

    it('7. PUT /api/restaurants/settings', async () => {
      const res = await request(app)
        .put('/api/restaurants/settings')
        .set('Authorization', staffAuth)
        .send({ sound_notifications: false });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // Group 3: Tables (Routes 8-14)
  describe('Group 3: Tables (Routes 8-14)', () => {
    it('8. GET /api/tables', async () => {
      const res = await request(app)
        .get('/api/tables')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.tables).toBeInstanceOf(Array);
      expect(res.body.tables.length).toBeGreaterThan(0);
    });

    it('9. POST /api/tables', async () => {
      const res = await request(app)
        .post('/api/tables')
        .set('Authorization', staffAuth)
        .send({ table_number: '14', capacity: 6 });
      expect(res.status).toBe(201);
      expect(res.body.table.tableNumber).toBe('14');
    });

    it('10. GET /api/tables/:id', async () => {
      const res = await request(app)
        .get('/api/tables/tbl-01')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.table.id).toBe('tbl-01');
    });

    it('11. PUT /api/tables/:id', async () => {
      const res = await request(app)
        .put('/api/tables/tbl-01')
        .set('Authorization', staffAuth)
        .send({ capacity: 8 });
      expect(res.status).toBe(200);
      expect(res.body.table.capacity).toBe(8);
    });

    it('12. DELETE /api/tables/:id', async () => {
      const res = await request(app)
        .delete('/api/tables/tbl-02')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('13. PATCH /api/tables/:id/status', async () => {
      const res = await request(app)
        .patch('/api/tables/tbl-01/status')
        .set('Authorization', staffAuth)
        .send({ status: 'cleaning' });
      expect(res.status).toBe(200);
      expect(res.body.table.status).toBe('cleaning');
    });

    it('14. GET /api/tables/availability', async () => {
      const res = await request(app).get('/api/tables/availability?restaurantSlug=olive-and-ember');
      expect(res.status).toBe(200);
      expect(res.body.tables).toBeInstanceOf(Array);
    });
  });

  // Group 4: Categories (Routes 15-18)
  describe('Group 4: Categories (Routes 15-18)', () => {
    it('15. GET /api/categories', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.categories).toBeInstanceOf(Array);
    });

    it('16. POST /api/categories', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', staffAuth)
        .send({ name: 'Appetizers', sort_order: 3 });
      expect(res.status).toBe(201);
      expect(res.body.category.name).toBe('Appetizers');
    });

    it('17. PUT /api/categories/:id', async () => {
      const res = await request(app)
        .put('/api/categories/cat-pizzas')
        .set('Authorization', staffAuth)
        .send({ description: 'Authentic Napoli Style' });
      expect(res.status).toBe(200);
      expect(res.body.category.description).toBe('Authentic Napoli Style');
    });

    it('18. DELETE /api/categories/:id', async () => {
      const res = await request(app)
        .delete('/api/categories/cat-desserts')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // Group 5: Menu Items (Routes 19-25)
  describe('Group 5: Menu Items (Routes 19-25)', () => {
    it('19. GET /api/menu (Public customer menu)', async () => {
      const res = await request(app).get('/api/menu?restaurantSlug=olive-and-ember');
      expect(res.status).toBe(200);
      expect(res.body.categories).toBeInstanceOf(Array);
      expect(res.body.categories[0].items).toBeDefined();
    });

    it('20. GET /api/staff/menu', async () => {
      const res = await request(app)
        .get('/api/staff/menu')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.categories).toBeDefined();
      expect(res.body.items).toBeDefined();
    });

    it('21. POST /api/staff/menu', async () => {
      const res = await request(app)
        .post('/api/staff/menu')
        .set('Authorization', staffAuth)
        .send({
          name: 'Burrata Salad',
          category_id: 'cat-pizzas',
          price: 360,
          is_vegetarian: true,
        });
      expect(res.status).toBe(201);
      expect(res.body.item.name).toBe('Burrata Salad');
    });

    it('22. GET /api/menu/:id', async () => {
      const res = await request(app).get('/api/menu/item-pizza-01');
      expect(res.status).toBe(200);
      expect(res.body.item.id).toBe('item-pizza-01');
    });

    it('23. PUT /api/menu/:id', async () => {
      const res = await request(app)
        .put('/api/menu/item-pizza-01')
        .set('Authorization', staffAuth)
        .send({ price: 495 });
      expect(res.status).toBe(200);
      expect(res.body.item.price).toBe(495);
    });

    it('24. PATCH /api/menu/:id/availability', async () => {
      const res = await request(app)
        .patch('/api/menu/item-pizza-01/availability')
        .set('Authorization', staffAuth)
        .send({ is_available: false });
      expect(res.status).toBe(200);
      expect(res.body.item.isAvailable).toBe(false);
    });

    it('25. DELETE /api/menu/:id', async () => {
      const res = await request(app)
        .delete('/api/menu/item-dessert-01')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // Group 6: Orders & Order Items (Routes 26-30)
  describe('Group 6: Orders & Order Items (Routes 26-30)', () => {
    it('26. GET /api/orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.orders).toBeInstanceOf(Array);
    });

    it('27. POST /api/orders', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          restaurant_id: 'rest-olive-ember-01',
          table_number: '01',
          customer_name: 'Priya Mehta',
          items: [{ id: 'item-pizza-01', quantity: 1 }],
        });
      expect(res.status).toBe(201);
      expect(res.body.order).toBeDefined();
      expect(res.body.trackingToken).toBeDefined();
    });

    it('28. GET /api/orders/:id', async () => {
      const res = await request(app)
        .get('/api/orders/ord-20261102-001')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.order.id).toBe('ord-20261102-001');
    });

    it('29. PATCH /api/orders/:id/status', async () => {
      // Create a pending order first
      const orderRes = await request(app)
        .post('/api/orders')
        .send({
          restaurant_id: 'rest-olive-ember-01',
          table_number: '01',
          customer_name: 'Status Test',
          items: [{ id: 'item-pizza-01', quantity: 1 }],
        });

      const res = await request(app)
        .patch(`/api/orders/${orderRes.body.order.id}/status`)
        .set('Authorization', staffAuth)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('confirmed');
    });

    it('30. GET /api/orders/:id/tracking', async () => {
      const res = await request(app).get('/api/orders/ord-20261102-001/tracking');
      expect(res.status).toBe(200);
      expect(res.body.order).toBeDefined();
      expect(res.body.timeline).toBeInstanceOf(Array);
    });
  });

  // Group 7: Service Requests (Routes 31-33)
  describe('Group 7: Service Requests (Routes 31-33)', () => {
    it('31. GET /api/service-requests', async () => {
      const res = await request(app)
        .get('/api/service-requests')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.requests).toBeInstanceOf(Array);
    });

    it('32. POST /api/service-requests', async () => {
      const res = await request(app)
        .post('/api/service-requests')
        .send({
          restaurant_id: 'rest-olive-ember-01',
          table_number: '01',
          request_type: 'bill',
          payment_preference: 'upi',
        });
      expect(res.status).toBe(201);
      expect(res.body.request.type).toBe('bill');
    });

    it('33. PATCH /api/service-requests/:id', async () => {
      const res = await request(app)
        .patch('/api/service-requests/req-01')
        .set('Authorization', staffAuth)
        .send({ status: 'in_progress' });
      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('in_progress');
    });
  });

  // Group 8: Payments (Routes 34-36)
  describe('Group 8: Payments (Routes 34-36)', () => {
    it('34. GET /api/payments', async () => {
      const res = await request(app)
        .get('/api/payments')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.payments).toBeInstanceOf(Array);
    });

    it('35. POST /api/payments', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .send({
          restaurant_id: 'rest-olive-ember-01',
          table_number: '01',
          customer_name: 'Pay Customer',
          items: [{ id: 'item-dessert-01', quantity: 1 }],
        });

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', staffAuth)
        .send({
          order_id: orderRes.body.order.id,
          amount: orderRes.body.order.total,
          payment_method: 'card',
        });

      expect(res.status).toBe(201);
      expect(res.body.payment.status).toBe('completed');
    });

    it('36. PATCH /api/payments/:id/status', async () => {
      const res = await request(app)
        .patch('/api/payments/pay-20261102-001/status')
        .set('Authorization', staffAuth)
        .send({ status: 'refunded' });
      expect(res.status).toBe(200);
      expect(res.body.payment.status).toBe('refunded');
    });
  });

  // Group 9: Dashboard Analytics (Routes 37-39)
  describe('Group 9: Dashboard Analytics (Routes 37-39)', () => {
    it('37. GET /api/dashboard/overview', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.currency).toBe('INR');
      expect(res.body.todayRevenue).toBeDefined();
    });

    it('38. GET /api/dashboard/daily-sales', async () => {
      const res = await request(app)
        .get('/api/dashboard/daily-sales')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.sales).toBeInstanceOf(Array);
    });

    it('39. GET /api/dashboard/recent-orders', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent-orders')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.orders).toBeInstanceOf(Array);
    });
  });

  // Group 10: Staff & Authentication (Routes 40-44)
  describe('Group 10: Staff & Authentication (Routes 40-44)', () => {
    it('40. GET /api/staff', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.staff).toBeInstanceOf(Array);
    });

    it('41. POST /api/staff', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', staffAuth)
        .send({
          name: 'Kabir Sen',
          email: 'kabir@oliveandember.com',
          role: 'chef',
        });
      expect(res.status).toBe(201);
      expect(res.body.staff.email).toBe('kabir@oliveandember.com');
    });

    it('42. PATCH /api/staff/:id/status', async () => {
      const res = await request(app)
        .patch('/api/staff/staff-waiter-01/status')
        .set('Authorization', staffAuth)
        .send({ is_active: false });
      expect(res.status).toBe(200);
      expect(res.body.staff.isActive).toBe(false);
    });

    it('43. POST /api/auth/login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'contact@oliveandember.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
    });

    it('44. GET /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
    });
  });

  // Group 11: Media Uploads (Route 45)
  describe('Group 11: Media Uploads (Route 45)', () => {
    it('45. POST /api/uploads/menu-image', async () => {
      const res = await request(app)
        .post('/api/uploads/menu-image')
        .set('Authorization', staffAuth)
        .send({
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.url).toBeDefined();
    });
  });

  // Realtime Routes (SSE & Sync)
  describe('Realtime Subsystem Endpoints', () => {
    it('GET /api/realtime/sync', async () => {
      const res = await request(app)
        .get('/api/realtime/sync?lastEventId=0')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
      expect(res.body.events).toBeInstanceOf(Array);
    });

    it('GET /api/realtime/stream sets text/event-stream headers', async () => {
      const server = app.listen(0);
      const port = (server.address() as any).port;

      await new Promise<void>((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/api/realtime/stream?restaurantSlug=olive-and-ember`, (res) => {
          expect(res.headers['content-type']).toContain('text/event-stream');
          req.destroy();
          server.close(() => resolve());
        });
        req.on('error', (err) => {
          if ((err as any).code === 'ECONNRESET') {
            server.close(() => resolve());
          } else {
            server.close(() => reject(err));
          }
        });
      });
    });
  });

  // Dual-Mount Parity Verification (Routes mounted at root /* as well)
  describe('Dual-Mount Route Parity (Root /* Mounting)', () => {
    it('resolves GET /health/live without /api prefix', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
    });

    it('resolves GET /tables with trailing slash without 301 redirect', async () => {
      const res = await request(app)
        .get('/api/tables/')
        .set('Authorization', staffAuth);
      expect(res.status).toBe(200);
    });
  });
});
