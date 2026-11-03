import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { setPool } from '../src/database/db.js';
import { signStaffToken } from '../src/utils/jwt.js';

const { Pool } = pg;

describe('RESTO V2 — Staging & Rehearsal Backend Live Integration Tests', () => {
  const rehearsalConnStr = 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';
  const app = createApp();
  let pool: pg.Pool;
  let managerToken: string;

  beforeAll(async () => {
    // Inject real connection pool targeting the migrated rehearsal database
    pool = new Pool({ connectionString: rehearsalConnStr });
    setPool(pool);

    // Generate authenticated staff JWT for the migrated restaurant
    managerToken = `Bearer ${signStaffToken({
      id: 'stf-manager',
      name: 'Restaurant Manager',
      email: 'contact@grandbistrolounge.com',
      role: 'manager',
      restaurantId: 'rest-olive-ember-01',
    })}`;
  });

  afterAll(async () => {
    // Clean up synthetic test records inserted during the test run
    await pool.query(`DELETE FROM resto_v2.orders WHERE id LIKE 'ord-synth-%';`);
    await pool.query(`DELETE FROM resto_v2.service_requests WHERE id LIKE 'req-synth-%';`);
    await pool.end();
  });

  describe('1. Migrated V1 Data Retrieval', () => {
    it('retrieves migrated restaurant details by slug', async () => {
      const res = await request(app).get('/api/restaurants/olive-and-ember');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('rest-olive-ember-01');
      expect(res.body.name).toBe('The Olive & Ember');
      expect(res.body.slug).toBe('olive-and-ember');
      expect(res.body.currency).toBe('INR');
    });

    it('retrieves public customer menu containing all 5 categories and 7 items', async () => {
      const res = await request(app).get('/api/menu?restaurantSlug=olive-and-ember');
      expect(res.status).toBe(200);
      expect(res.body.categories).toBeInstanceOf(Array);
      expect(res.body.categories.length).toBe(5);

      const allItems = res.body.categories.flatMap((c: any) => c.items);
      expect(allItems.length).toBe(7);
      expect(allItems.some((i: any) => i.name === 'Truffle & Wild Mushroom Arancini')).toBe(true);
      expect(allItems.some((i: any) => i.name === 'Wood-Fired Margherita Pizza')).toBe(true);
    });

    it('verifies table availability for migrated tables', async () => {
      const res = await request(app).get('/api/tables/availability?restaurantSlug=olive-and-ember&tableNumber=01');
      expect(res.status).toBe(200);
      expect(res.body.tables).toBeInstanceOf(Array);
      expect(res.body.tables.length).toBe(8);
      expect(res.body.tables.some((t: any) => t.tableNumber === '08')).toBe(true);
      expect(res.body.tables.some((t: any) => t.tableNumber === '01' && t.status === 'available')).toBe(true);
    });

    it('lists migrated staff orders via authenticated dashboard endpoint', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', managerToken);
      expect(res.status).toBe(200);
      const orders = res.body.orders || res.body;
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBeGreaterThanOrEqual(2);
      expect(orders.some((o: any) => o.orderNumber === 'DF-1001' || o.order_number === 'DF-1001')).toBe(true);
    });

    it('calculates dashboard metrics across migrated production dataset', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', managerToken);
      expect(res.status).toBe(200);
      expect(res.body.totalOrders || res.body.total_orders).toBeGreaterThanOrEqual(2);
      expect(Number(res.body.todayRevenue || res.body.today_revenue)).toBeGreaterThanOrEqual(1134);
    });
  });

  describe('2. Synthetic Order Placement & Concurrency on Rehearsal DB', () => {
    const syntheticIdempotencyKey = `idemp-rehearsal-${Date.now()}`;
    let placedOrderId: string;

    it('places a new customer order with tax calculations', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          restaurantId: 'rest-olive-ember-01',
          tableNumber: '08',
          customerName: 'Rehearsal Tester',
          customerPhone: '+91 99999 88888',
          idempotencyKey: syntheticIdempotencyKey,
          items: [
            { id: 'item-1', quantity: 2 }, // Truffle Arancini @ 425 = 850
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.subtotal).toBe(850);
      expect(res.body.order.finalTotal).toBe(892.5); // 850 + 5% GST = 892.50
      expect(res.body.trackingToken).toBeDefined();

      placedOrderId = res.body.order.id;
    });

    it('guarantees idempotency when identical order request is replayed', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          restaurantId: 'rest-olive-ember-01',
          tableNumber: '08',
          customerName: 'Rehearsal Tester',
          customerPhone: '+91 99999 88888',
          idempotencyKey: syntheticIdempotencyKey,
          items: [
            { id: 'item-1', quantity: 2 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.idempotentReplay).toBe(true);
      expect(res.body.order.id).toBe(placedOrderId);
    });

    it('transitions order status through kitchen lifecycle: preparing -> ready -> completed', async () => {
      // 1. Preparing
      const r1 = await request(app)
        .patch(`/api/orders/${placedOrderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'preparing' });
      expect(r1.status).toBe(200);
      expect((r1.body.order || r1.body).status).toBe('preparing');

      // 2. Ready
      const r2 = await request(app)
        .patch(`/api/orders/${placedOrderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'ready' });
      expect(r2.status).toBe(200);
      expect((r2.body.order || r2.body).status).toBe('ready');

      // 3. Completed
      const r3 = await request(app)
        .patch(`/api/orders/${placedOrderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'completed' });
      expect(r3.status).toBe(200);
      expect((r3.body.order || r3.body).status).toBe('completed');
    });

    it('records a payment against the synthetic order', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', managerToken)
        .send({
          orderId: placedOrderId,
          amount: 892.5,
          paymentMethod: 'upi',
          transactionReference: 'UPI-REHEARSAL-001',
        });

      expect(res.status).toBe(201);
      const payment = res.body.payment || res.body;
      expect(payment.paymentStatus || payment.status || payment.payment_status).toBe('completed');
    });
  });

  describe('3. Service Requests & Realtime Delta Synchronization', () => {
    let serviceRequestId: string;

    it('creates and resolves customer service request (waiter call)', async () => {
      const createRes = await request(app)
        .post('/api/service-requests')
        .send({
          restaurantId: 'rest-olive-ember-01',
          tableNumber: '08',
          requestType: 'water',
          message: 'Extra mineral water please',
        });

      expect(createRes.status).toBe(201);
      const reqData = createRes.body.request || createRes.body;
      expect(reqData.requestType || reqData.request_type).toBe('water');
      serviceRequestId = reqData.id;

      const resolveRes = await request(app)
        .patch(`/api/service-requests/${serviceRequestId}`)
        .set('Authorization', managerToken)
        .send({ status: 'completed' });

      expect(resolveRes.status).toBe(200);
      const resolvedData = resolveRes.body.request || resolveRes.body;
      expect(resolvedData.status).toBe('completed');
    });

    it('recovers missed realtime events via delta sync endpoint', async () => {
      const res = await request(app)
        .get('/api/realtime/sync?restaurantId=rest-olive-ember-01&lastEventId=0')
        .set('Authorization', managerToken);

      expect(res.status).toBe(200);
      expect(res.body.events).toBeInstanceOf(Array);
      expect(res.body.latestEventId !== undefined || res.body.lastEventId !== undefined).toBe(true);
    });
  });
});
