import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { setPool } from '../src/database/db.js';
import { signStaffToken } from '../src/utils/jwt.js';

const { Pool } = pg;

describe('RESTO V2 — Phase 4A Local Frontend & Dashboard Integration Suite', () => {
  const rehearsalConnStr = 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';
  const app = createApp();
  let pool: pg.Pool;
  let managerToken: string;
  let demoToken: string;

  beforeAll(async () => {
    // 1. Verify strict local boundary
    const url = new URL(rehearsalConnStr);
    expect(url.hostname).toBe('localhost');
    expect(url.pathname).toBe('/resto_v2_rehearsal');

    pool = new Pool({ connectionString: rehearsalConnStr });
    setPool(pool);

    // 2. Generate staff JWT
    managerToken = `Bearer ${signStaffToken({
      id: 'stf-manager',
      name: 'Restaurant Manager',
      email: 'contact@grandbistrolounge.com',
      role: 'manager',
      restaurantId: 'rest-olive-ember-01',
    })}`;

    demoToken = 'Bearer demo-staff-token-manager';
  });

  afterAll(async () => {
    // Clean up test records
    await pool.query(`DELETE FROM resto_v2.payments WHERE order_id LIKE 'ord-p4a-%';`);
    await pool.query(`DELETE FROM resto_v2.order_items WHERE order_id LIKE 'ord-p4a-%';`);
    await pool.query(`DELETE FROM resto_v2.orders WHERE id LIKE 'ord-p4a-%';`);
    await pool.query(`DELETE FROM resto_v2.service_requests WHERE id LIKE 'req-p4a-%';`);
    await pool.query(`DELETE FROM resto_v2.restaurant_tables WHERE id LIKE 'tbl-p4a-%';`);
    await pool.query(`UPDATE resto_v2.restaurant_tables SET status = 'available' WHERE table_number = '03';`);
    await pool.end();
  });

  describe('1. Customer Frontend API Integration', () => {
    it('1.1 Restaurant loading: retrieves Olive & Ember metadata with 5% GST and WiFi info', async () => {
      const res = await request(app).get('/api/restaurants/info?slug=olive-and-ember');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('rest-olive-ember-01');
      expect(res.body.name).toBe('The Olive & Ember');
      expect(res.body.slug).toBe('olive-and-ember');
      expect(res.body.currency).toBe('INR');
      expect(res.body.tax_percentage).toBe(5);
      expect(res.body.wifi_ssid).toBe('OliveEmber-Guest');
      expect(res.body.wifi_password).toBe('FiredWood2026');
    });

    it('1.2 Table selection: lists available dining tables 01 through 08', async () => {
      const res = await request(app).get('/api/tables/availability?restaurantSlug=olive-and-ember');
      expect(res.status).toBe(200);
      expect(res.body.tables).toBeInstanceOf(Array);
      expect(res.body.tables.length).toBe(8);

      const tableNumbers = res.body.tables.map((t: any) => t.tableNumber || t.table_number);
      expect(tableNumbers).toContain('01');
      expect(tableNumbers).toContain('03');
      expect(tableNumbers).toContain('08');
    });

    it('1.3 Menu and categories: returns 5 categories and menu items with dietary and pricing tags', async () => {
      const res = await request(app).get('/api/menu?restaurantSlug=olive-and-ember');
      expect(res.status).toBe(200);
      expect(res.body.categories).toBeInstanceOf(Array);
      expect(res.body.categories.length).toBe(5);

      const pizzaCategory = res.body.categories.find((c: any) => c.name === 'Pizza & Pasta');
      expect(pizzaCategory).toBeDefined();

      const margherita = pizzaCategory.items.find((i: any) => i.name === 'Wood-Fired Margherita Pizza');
      expect(margherita).toBeDefined();
      expect(margherita.price).toBe(595);
      expect(margherita.foodType).toBe('veg');
      expect(margherita.available).toBe(true);
    });

    it('1.4 Item customization & cart: calculates server-side subtotal, 5% GST and final total', async () => {
      // 1x Wood-Fired Margherita Pizza (₹595)
      // 1x Truffle & Wild Mushroom Arancini (₹425)
      // Subtotal = ₹1020.00
      // 5% GST (2.5% CGST ₹25.50 + 2.5% SGST ₹25.50) = ₹51.00
      // Final Total = ₹1071.00
      const orderPayload = {
        restaurantSlug: 'olive-and-ember',
        tableNumber: '02',
        customerName: 'Aarav Patel',
        customerPhone: '+91 98200 11223',
        paymentMethod: 'upi',
        specialInstructions: 'Extra napkins please',
        idempotencyKey: 'p4a-cart-calc-key-01',
        items: [
          { menuItemId: 'item-4', quantity: 1, selectedAddons: [], specialInstructions: 'Crispy' },
          { menuItemId: 'item-1', quantity: 1, selectedAddons: [], specialInstructions: 'Hot' },
        ],
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Idempotency-Key', orderPayload.idempotencyKey)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.subtotal).toBe(1020);
      expect(res.body.order.cgst).toBe(25.5);
      expect(res.body.order.sgst).toBe(25.5);
      expect(res.body.order.gst_total).toBe(51);
      expect(res.body.order.total).toBe(1071);
      expect(res.body.order.finalTotal).toBe(1071);
      expect(res.body.order.status).toBe('pending');

      // Cleanup
      await pool.query(`DELETE FROM resto_v2.order_items WHERE order_id = $1`, [res.body.order.id]);
      await pool.query(`DELETE FROM resto_v2.orders WHERE id = $1`, [res.body.order.id]);
      await pool.query(`UPDATE resto_v2.restaurant_tables SET status = 'available' WHERE table_number = '02';`);
    });

    it('1.5 Duplicate order prevention: identical Idempotency-Key returns exact cached order', async () => {
      const idempotencyKey = 'p4a-idempotent-order-test-99';
      const orderPayload = {
        restaurantSlug: 'olive-and-ember',
        tableNumber: '05',
        customerName: 'Priya Mehta',
        customerPhone: '+91 98111 22334',
        paymentMethod: 'counter',
        idempotencyKey,
        items: [{ menuItemId: 'item-4', quantity: 1 }],
      };

      // First call -> 201 Created
      const res1 = await request(app)
        .post('/api/orders')
        .set('Idempotency-Key', idempotencyKey)
        .send(orderPayload);
      expect(res1.status).toBe(201);
      const firstOrderId = res1.body.order.id;

      // Second call with same idempotency key -> 200/201 Idempotent Replay
      const res2 = await request(app)
        .post('/api/orders')
        .set('Idempotency-Key', idempotencyKey)
        .send(orderPayload);
      expect(res2.status).toBe(200);
      expect(res2.body.idempotentReplay).toBe(true);
      expect(res2.body.order.id).toBe(firstOrderId);

      // Verify in DB that only 1 order exists for this idempotency key
      const countRes = await pool.query(
        `SELECT COUNT(*) as count FROM resto_v2.orders WHERE idempotency_key = $1;`,
        [idempotencyKey]
      );
      expect(Number(countRes.rows[0].count)).toBe(1);

      // Cleanup
      await pool.query(`DELETE FROM resto_v2.order_items WHERE order_id = $1`, [firstOrderId]);
      await pool.query(`DELETE FROM resto_v2.orders WHERE id = $1`, [firstOrderId]);
      await pool.query(`UPDATE resto_v2.restaurant_tables SET status = 'available' WHERE table_number = '05';`);
    });

    it('1.6 Customer order tracking: returns real-time timeline, order details and occupied table state', async () => {
      const orderPayload = {
        restaurantSlug: 'olive-and-ember',
        tableNumber: '04',
        customerName: 'Vikram Seth',
        paymentMethod: 'card',
        idempotencyKey: 'p4a-track-test-88',
        items: [{ menuItemId: 'item-4', quantity: 1 }],
      };

      const createRes = await request(app)
        .post('/api/orders')
        .set('Idempotency-Key', orderPayload.idempotencyKey)
        .send(orderPayload);
      const orderId = createRes.body.order.id;
      const trackingToken = createRes.body.trackingToken;

      const trackRes = await request(app).get(`/api/orders/${orderId}/tracking?accessToken=${trackingToken}`);
      expect(trackRes.status).toBe(200);
      expect(trackRes.body.order.id).toBe(orderId);
      expect(trackRes.body.table.tableNumber).toBe('04');
      expect(trackRes.body.table.status).toBe('occupied');
      expect(trackRes.body.timeline).toBeInstanceOf(Array);
      expect(trackRes.body.timeline[0].status).toBe('pending');
      expect(trackRes.body.timeline[0].completed).toBe(true);

      // Cleanup
      await pool.query(`DELETE FROM resto_v2.order_items WHERE order_id = $1`, [orderId]);
      await pool.query(`DELETE FROM resto_v2.orders WHERE id = $1`, [orderId]);
      await pool.query(`UPDATE resto_v2.restaurant_tables SET status = 'available' WHERE table_number = '04';`);
    });

    it('1.7 Waiter calls and Bill requests: creates pending service requests with correct metadata', async () => {
      // 1. Water call
      const waterRes = await request(app).post('/api/service-requests').send({
        restaurantSlug: 'olive-and-ember',
        tableNumber: '01',
        requestType: 'water',
        message: 'Water bottle refill requested',
      });
      expect(waterRes.status).toBe(201);
      expect(waterRes.body.request.requestType).toBe('water');
      expect(waterRes.body.request.status).toBe('pending');
      const waterReqId = waterRes.body.request.id;

      // 2. Bill request
      const billRes = await request(app).post('/api/service-requests').send({
        restaurantSlug: 'olive-and-ember',
        tableNumber: '01',
        requestType: 'bill',
        message: 'Bill requested with UPI',
        paymentPreference: 'upi',
      });
      expect(billRes.status).toBe(201);
      expect(billRes.body.request.requestType).toBe('bill');
      expect(billRes.body.request.paymentPreference).toBe('upi');
      const billReqId = billRes.body.request.id;

      // Cleanup
      await pool.query(`DELETE FROM resto_v2.service_requests WHERE id IN ($1, $2);`, [waterReqId, billReqId]);
    });
  });

  describe('2. Restaurant Dashboard API Integration', () => {
    it('2.1 Staff login: issues verified JWT token with authorized manager role', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'contact@grandbistrolounge.com',
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.accessToken).toBeDefined();
      expect(loginRes.body.user.role).toBe('manager');
      expect(loginRes.body.user.email).toBe('contact@grandbistrolounge.com');
    });

    it('2.2 Dashboard overview & daily sales: retrieves real-time aggregated metrics', async () => {
      const overviewRes = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', managerToken)
        .set('X-Staff-Internal', 'true');
      expect(overviewRes.status).toBe(200);
      expect(overviewRes.body.totalTables).toBe(8);
      expect(overviewRes.body.currency).toBe('INR');

      const salesRes = await request(app)
        .get('/api/dashboard/daily-sales')
        .set('Authorization', managerToken)
        .set('X-Staff-Internal', 'true');
      expect(salesRes.status).toBe(200);
      expect(salesRes.body.sales).toBeInstanceOf(Array);
    });

    it('2.3 Live orders: fetches orders with items, table and customer info', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', managerToken)
        .set('X-Staff-Internal', 'true');
      expect(res.status).toBe(200);
      expect(res.body.orders).toBeInstanceOf(Array);
      expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
    });

    it('2.4 Order status transitions: executes pending -> confirmed -> preparing -> ready -> served -> completed', async () => {
      // Create fresh test order
      const orderPayload = {
        restaurantSlug: 'olive-and-ember',
        tableNumber: '06',
        customerName: 'Karan Mehra',
        paymentMethod: 'upi',
        idempotencyKey: 'p4a-lifecycle-test-01',
        items: [{ menuItemId: 'item-4', quantity: 1 }],
      };
      const created = await request(app)
        .post('/api/orders')
        .set('Idempotency-Key', orderPayload.idempotencyKey)
        .send(orderPayload);
      const orderId = created.body.order.id;

      // 1. Accept order -> confirmed
      const s1 = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'confirmed' });
      expect(s1.status).toBe(200);
      expect(s1.body.order.status).toBe('confirmed');

      // 2. Start preparing -> preparing
      const s2 = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'preparing' });
      expect(s2.status).toBe(200);
      expect(s2.body.order.status).toBe('preparing');

      // 3. Mark ready -> ready
      const s3 = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'ready' });
      expect(s3.status).toBe(200);
      expect(s3.body.order.status).toBe('ready');

      // 4. Mark served -> served
      const s4 = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'served' });
      expect(s4.status).toBe(200);
      expect(s4.body.order.status).toBe('served');

      // 5. Complete order -> completed
      const s5 = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'completed' });
      expect(s5.status).toBe(200);
      expect(s5.body.order.status).toBe('completed');

      // Verify Table 06 automatically returned to available
      const tableCheck = await request(app).get('/api/tables/availability?restaurantSlug=olive-and-ember');
      const table06 = tableCheck.body.tables.find((t: any) => (t.tableNumber || t.table_number) === '06');
      expect(table06.status).toBe('available');

      // Cleanup
      await pool.query(`DELETE FROM resto_v2.order_items WHERE order_id = $1`, [orderId]);
      await pool.query(`DELETE FROM resto_v2.orders WHERE id = $1`, [orderId]);
    });

    it('2.5 Table management: sets manual status updates', async () => {
      const res = await request(app)
        .patch('/api/tables/tbl-e25df5aa/status')
        .set('Authorization', managerToken)
        .send({ status: 'occupied' });
      expect(res.status).toBe(200);
      expect(res.body.table.status).toBe('occupied');

      // Revert to available
      const revert = await request(app)
        .patch('/api/tables/tbl-e25df5aa/status')
        .set('Authorization', managerToken)
        .send({ status: 'available' });
      expect(revert.status).toBe(200);
      expect(revert.body.table.status).toBe('available');
    });

    it('2.6 Menu availability toggle: toggles is_available bidirectionally', async () => {
      // Toggle to false
      const off = await request(app)
        .patch('/api/menu/item-1/availability')
        .set('Authorization', managerToken)
        .send({ available: false });
      expect(off.status).toBe(200);
      expect(off.body.item.available).toBe(false);

      // Toggle back to true
      const on = await request(app)
        .patch('/api/menu/item-1/availability')
        .set('Authorization', managerToken)
        .send({ available: true });
      expect(on.status).toBe(200);
      expect(on.body.item.available).toBe(true);
    });

    it('2.7 Service request resolution: updates status from pending to completed', async () => {
      const createRes = await request(app).post('/api/service-requests').send({
        restaurantSlug: 'olive-and-ember',
        tableNumber: '01',
        requestType: 'waiter',
        message: 'Assistance needed',
      });
      const reqId = createRes.body.request.id;

      const updateRes = await request(app)
        .patch(`/api/service-requests/${reqId}`)
        .set('Authorization', managerToken)
        .send({ status: 'completed' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.request.status).toBe('completed');
      expect(updateRes.body.request.resolvedAt).toBeDefined();

      // Cleanup
      await pool.query(`DELETE FROM resto_v2.service_requests WHERE id = $1;`, [reqId]);
    });

    it('2.8 Payments recording & listing: records completed payment and lists transactions', async () => {
      // Create test order
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Idempotency-Key', 'p4a-payment-test-order-01')
        .send({
          restaurantSlug: 'olive-and-ember',
          tableNumber: '08',
          customerName: 'Ananya Roy',
          paymentMethod: 'upi',
          items: [{ menuItemId: 'item-4', quantity: 1 }],
        });
      const orderId = orderRes.body.order.id;

      // Record payment
      const payRes = await request(app)
        .post('/api/payments')
        .set('Authorization', managerToken)
        .send({
          orderId,
          paymentMethod: 'upi',
          amount: 624.75,
        });
      expect(payRes.status).toBe(201);
      expect(payRes.body.payment.status).toBe('completed');
      expect(payRes.body.payment.amount).toBe(624.75);

      // Verify list payments contains it
      const listRes = await request(app)
        .get('/api/payments')
        .set('Authorization', managerToken);
      expect(listRes.status).toBe(200);
      expect(listRes.body.payments.some((p: any) => p.orderId === orderId)).toBe(true);

      // Cleanup
      await pool.query(`DELETE FROM resto_v2.payments WHERE order_id = $1;`, [orderId]);
      await pool.query(`DELETE FROM resto_v2.order_items WHERE order_id = $1;`, [orderId]);
      await pool.query(`DELETE FROM resto_v2.orders WHERE id = $1;`, [orderId]);
      await pool.query(`UPDATE resto_v2.restaurant_tables SET status = 'available' WHERE table_number = '08';`);
    });

    it('2.9 Realtime SSE Stream: establishes text/event-stream connection and sends handshake', async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch('http://localhost:5005/api/realtime/stream?restaurantSlug=olive-and-ember&lastEventId=0', {
          headers: {
            Authorization: demoToken,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('text/event-stream');
        expect(response.headers.get('cache-control')).toContain('no-cache');

        const reader = response.body?.getReader();
        expect(reader).toBeDefined();

        const { value } = await reader!.read();
        clearTimeout(timeoutId);
        controller.abort();

        const text = new TextDecoder().decode(value);
        expect(text).toContain(': connected at');
      } catch (err: any) {
        if (err.name !== 'AbortError') throw err;
      }
    });
  });

  describe('3. Full End-to-End Dining & Operations Lifecycle', () => {
    it('Executes complete cycle: Table Available -> Order -> Kitchen Workflow -> Waiter Service -> Payment -> Auto Table Release', async () => {
      // Step 1: Customer sits at Table 03 (verifies initial available state)
      const initialTableRes = await request(app).get('/api/tables/availability?restaurantSlug=olive-and-ember');
      const table03Initial = initialTableRes.body.tables.find((t: any) => (t.tableNumber || t.table_number) === '03');
      expect(table03Initial.status).toBe('available');

      // Step 2 & 3: Customer places order for Margherita Pizza (₹595 + 5% GST = ₹624.75)
      const e2eOrderKey = 'p4a-e2e-workflow-order-key';
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Idempotency-Key', e2eOrderKey)
        .send({
          restaurantSlug: 'olive-and-ember',
          tableNumber: '03',
          customerName: 'Devika Singhania',
          customerPhone: '+91 99887 76655',
          paymentMethod: 'upi',
          specialInstructions: 'Well done base, extra oregano',
          idempotencyKey: e2eOrderKey,
          items: [{ menuItemId: 'item-4', quantity: 1, specialInstructions: 'Well done' }],
        });

      expect(orderRes.status).toBe(201);
      const order = orderRes.body.order;
      const orderId = order.id;
      const trackingToken = orderRes.body.trackingToken;
      expect(order.subtotal).toBe(595);
      expect(order.tax).toBe(29.75);
      expect(order.total).toBe(624.75);
      expect(order.status).toBe('pending');

      // Step 4: Table 03 becomes occupied immediately
      const occupiedCheck = await request(app).get('/api/tables/availability?restaurantSlug=olive-and-ember');
      const table03Occupied = occupiedCheck.body.tables.find((t: any) => (t.tableNumber || t.table_number) === '03');
      expect(table03Occupied.status).toBe('occupied');

      // Step 5: Dashboard receives live order in orders list
      const dashboardOrders = await request(app)
        .get('/api/orders')
        .set('Authorization', managerToken)
        .set('X-Staff-Internal', 'true');
      const foundInDashboard = dashboardOrders.body.orders.find((o: any) => o.id === orderId);
      expect(foundInDashboard).toBeDefined();
      expect(foundInDashboard.customerName).toBe('Devika Singhania');

      // Step 6: Manager accepts order (pending -> confirmed)
      const acceptRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'confirmed' });
      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.order.status).toBe('confirmed');

      // Step 7: Kitchen starts cooking (confirmed -> preparing)
      const prepRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'preparing' });
      expect(prepRes.status).toBe(200);
      expect(prepRes.body.order.status).toBe('preparing');

      // Step 8: Kitchen marks ready to serve (preparing -> ready)
      const readyRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'ready' });
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.order.status).toBe('ready');

      // Step 9: Floor Waiter serves pizza to Table 03 (ready -> served)
      const servedRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'served' });
      expect(servedRes.status).toBe(200);
      expect(servedRes.body.order.status).toBe('served');

      // Verify customer tracking reflects served status
      const customerTrack = await request(app).get(`/api/orders/${orderId}/tracking?accessToken=${trackingToken}`);
      expect(customerTrack.status).toBe(200);
      expect(customerTrack.body.order.status).toBe('served');
      const servedStep = customerTrack.body.timeline.find((t: any) => t.status === 'delivered');
      expect(servedStep.completed).toBe(true);

      // Step 10: Customer requests bill via app
      const billReq = await request(app).post('/api/service-requests').send({
        restaurantSlug: 'olive-and-ember',
        tableNumber: '03',
        requestType: 'bill',
        message: 'Bill requested with UPI payment',
        paymentPreference: 'upi',
      });
      expect(billReq.status).toBe(201);
      const billId = billReq.body.request.id;

      // Step 11: Staff collects payment of ₹624.75 via UPI
      const payRes = await request(app)
        .post('/api/payments')
        .set('Authorization', managerToken)
        .send({
          orderId,
          paymentMethod: 'upi',
          amount: 624.75,
        });
      expect(payRes.status).toBe(201);
      expect(payRes.body.payment.status).toBe('completed');
      expect(payRes.body.payment.amount).toBe(624.75);

      // Step 12: Staff completes order and resolves bill request
      const completeRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', managerToken)
        .send({ status: 'completed' });
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.order.status).toBe('completed');

      await request(app)
        .patch(`/api/service-requests/${billId}`)
        .set('Authorization', managerToken)
        .send({ status: 'completed' });

      // Step 13: Table 03 automatically returns to 'available'
      const finalTableRes = await request(app).get('/api/tables/availability?restaurantSlug=olive-and-ember');
      const table03Final = finalTableRes.body.tables.find((t: any) => (t.tableNumber || t.table_number) === '03');
      expect(table03Final.status).toBe('available');

      // Cleanup
      await pool.query(`DELETE FROM resto_v2.payments WHERE order_id = $1;`, [orderId]);
      await pool.query(`DELETE FROM resto_v2.order_items WHERE order_id = $1;`, [orderId]);
      await pool.query(`DELETE FROM resto_v2.orders WHERE id = $1;`, [orderId]);
      await pool.query(`DELETE FROM resto_v2.service_requests WHERE id = $1;`, [billId]);
    });
  });
});
