import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'crypto';

const { Pool, Client } = pg;

describe('RESTO V2 — Live PostgreSQL 16 Database Integration & Concurrency Tests', () => {
  const connectionString = 'postgresql://akashlodhi@localhost:5432/resto_v2_integration_test';
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString });
    // Seed test restaurant, table, category, and item
    await pool.query(`
      INSERT INTO resto_v2.restaurants (id, name, slug)
      VALUES ('rest-int-01', 'Live PG Resto 1', 'live-pg-resto-1')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO resto_v2.restaurants (id, name, slug)
      VALUES ('rest-int-02', 'Live PG Resto 2', 'live-pg-resto-2')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO resto_v2.restaurant_tables (id, restaurant_id, table_number, capacity, status)
      VALUES ('tbl-int-01', 'rest-int-01', '01', 4, 'available')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO resto_v2.categories (id, restaurant_id, name)
      VALUES ('cat-int-01', 'rest-int-01', 'Specialties')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO resto_v2.menu_items (id, restaurant_id, category_id, name, price, available, food_type)
      VALUES ('item-int-01', 'rest-int-01', 'cat-int-01', 'Special Pizza', 500.00, true, 'veg')
      ON CONFLICT (id) DO NOTHING;
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('1. Schema Structure, Tables, Foreign Keys & Indexes', () => {
    it('verifies all 11 tables exist in resto_v2 schema', async () => {
      const res = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'resto_v2' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      const tables = res.rows.map((r) => r.table_name);
      expect(tables).toHaveLength(11);
      expect(tables).toContain('restaurants');
      expect(tables).toContain('restaurant_settings');
      expect(tables).toContain('restaurant_tables');
      expect(tables).toContain('categories');
      expect(tables).toContain('menu_items');
      expect(tables).toContain('orders');
      expect(tables).toContain('order_items');
      expect(tables).toContain('payments');
      expect(tables).toContain('service_requests');
      expect(tables).toContain('staff');
      expect(tables).toContain('realtime_events');
    });

    it('verifies all 20+ query-optimized indexes exist in resto_v2', async () => {
      const res = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'resto_v2';
      `);
      const indexes = res.rows.map((r) => r.indexname);
      expect(indexes.length).toBeGreaterThanOrEqual(20);
      expect(indexes).toContain('idx_v2_orders_restaurant_status');
      expect(indexes).toContain('idx_v2_orders_restaurant_idempotency');
      expect(indexes).toContain('idx_v2_realtime_events_restaurant_id');
    });

    it('enforces foreign key constraints and prevents orphaned child records', async () => {
      await expect(
        pool.query(`
          INSERT INTO resto_v2.orders (
            id, restaurant_id, order_number, table_number, customer_name, subtotal, cgst, sgst, gst_total, final_total
          ) VALUES ('ord-orphaned', 'non-existent-restaurant-id', 'ORD-000', '01', 'Orphan', 100, 2.5, 2.5, 5, 105);
        `)
      ).rejects.toThrow(/violates foreign key constraint/);
    });
  });

  describe('2. Real Transaction Rollback Verification', () => {
    it('demonstrates ACID atomicity and complete rollback on live PostgreSQL 16', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`
          INSERT INTO resto_v2.orders (
            id, restaurant_id, order_number, table_number, customer_name, subtotal, cgst, sgst, gst_total, final_total
          ) VALUES ('ord-rollback-test', 'rest-int-01', 'ORD-RB', '01', 'Rollback User', 200, 5, 5, 10, 210);
        `);

        // Verify row exists within open transaction
        const inTx = await client.query(`SELECT id FROM resto_v2.orders WHERE id = 'ord-rollback-test'`);
        expect(inTx.rows).toHaveLength(1);

        // Abort transaction
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }

      // Verify row does not exist post-rollback
      const postTx = await pool.query(`SELECT id FROM resto_v2.orders WHERE id = 'ord-rollback-test'`);
      expect(postTx.rows).toHaveLength(0);
    });
  });

  describe('3. Concurrent Order Creation & High Concurrency Stability', () => {
    it('handles 10 concurrent atomic order placements without deadlock or lock contention', async () => {
      const orderPromises = Array.from({ length: 10 }, async (_, i) => {
        const orderId = `ord-concurrent-${i}-${randomUUID().slice(0, 6)}`;
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(
            `INSERT INTO resto_v2.orders (
              id, restaurant_id, order_number, table_number, customer_name, subtotal, cgst, sgst, gst_total, final_total
            ) VALUES ($1, 'rest-int-01', $2, '01', $3, 500, 12.5, 12.5, 25, 525);`,
            [orderId, `ORD-CONC-${i}`, `Customer ${i}`]
          );

          await client.query(
            `INSERT INTO resto_v2.order_items (
              id, order_id, menu_item_id, item_name, unit_price, quantity, total_price
            ) VALUES ($1, $2, 'item-int-01', 'Special Pizza', 500, 1, 500);`,
            [`itm-${orderId}-1`, orderId]
          );

          await client.query('COMMIT');
          return orderId;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      });

      const orderIds = await Promise.all(orderPromises);
      expect(orderIds).toHaveLength(10);

      const check = await pool.query(
        `SELECT COUNT(*) AS count FROM resto_v2.orders WHERE id = ANY($1);`,
        [orderIds]
      );
      expect(Number(check.rows[0].count)).toBe(10);
    });
  });

  describe('4. Idempotency Under Concurrent Mutation Races', () => {
    it('ensures only one order succeeds when multiple concurrent requests use the same idempotency key', async () => {
      const sharedIdempotencyKey = `idemp-race-${Date.now()}`;

      // Simulate 5 simultaneous requests arriving at the exact same millisecond
      const racePromises = Array.from({ length: 5 }, async (_, i) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          // Advisory transaction lock guarantees race safety across concurrent workers
          await client.query('SELECT pg_advisory_xact_lock(hashtext($1));', [sharedIdempotencyKey]);

          // Check if key already exists
          const existing = await client.query(
            `SELECT id FROM resto_v2.orders WHERE restaurant_id = 'rest-int-01' AND idempotency_key = $1;`,
            [sharedIdempotencyKey]
          );
          if (existing.rows.length > 0) {
            await client.query('COMMIT');
            return { orderId: existing.rows[0].id, duplicateReplay: true };
          }

          const orderId = `ord-idemp-winner-${i}-${randomUUID().slice(0, 6)}`;
          await client.query(
            `INSERT INTO resto_v2.orders (
              id, restaurant_id, order_number, table_number, customer_name, subtotal, cgst, sgst, gst_total, final_total, idempotency_key
            ) VALUES ($1, 'rest-int-01', 'ORD-WIN', '01', 'Winner', 500, 12.5, 12.5, 25, 525, $2);`,
            [orderId, sharedIdempotencyKey]
          );
          await client.query('COMMIT');
          return { orderId, duplicateReplay: false };
        } catch (err: any) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      });

      const results = await Promise.all(racePromises);

      // Verify in database: exactly 1 order row exists for this idempotency key
      const countRes = await pool.query(
        `SELECT COUNT(*) AS count FROM resto_v2.orders WHERE idempotency_key = $1;`,
        [sharedIdempotencyKey]
      );
      expect(Number(countRes.rows[0].count)).toBe(1);
    });
  });

  describe('5. Duplicate Payment Prevention Under Concurrency', () => {
    it('prevents multiple completed payments against the same order', async () => {
      const orderId = `ord-pay-target-${randomUUID().slice(0, 8)}`;
      await pool.query(
        `INSERT INTO resto_v2.orders (
          id, restaurant_id, order_number, table_number, customer_name, subtotal, cgst, sgst, gst_total, final_total, status
        ) VALUES ($1, 'rest-int-01', 'ORD-PAY', '01', 'Payer', 500, 12.5, 12.5, 25, 525, 'served');`,
        [orderId]
      );

      // 2 simultaneous payment attempts
      const attemptPayment = async (payId: string) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          // Advisory transaction lock guarantees race safety on order payment
          await client.query('SELECT pg_advisory_xact_lock(hashtext($1));', [`pay_order_${orderId}`]);

          // Check if already paid
          const paidCheck = await client.query(
            `SELECT id FROM resto_v2.payments WHERE order_id = $1 AND payment_status = 'completed';`,
            [orderId]
          );
          if (paidCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return { success: false, reason: 'ALREADY_PAID' };
          }

          await client.query(
            `INSERT INTO resto_v2.payments (
              id, restaurant_id, order_id, amount, payment_method, payment_status
            ) VALUES ($1, 'rest-int-01', $2, 525, 'upi', 'completed');`,
            [payId, orderId]
          );
          await client.query(
            `UPDATE resto_v2.orders SET status = 'completed' WHERE id = $1;`,
            [orderId]
          );
          await client.query('COMMIT');
          return { success: true };
        } catch (err) {
          await client.query('ROLLBACK');
          return { success: false, error: err };
        } finally {
          client.release();
        }
      };

      const [res1, res2] = await Promise.all([
        attemptPayment(`pay-race-1-${randomUUID().slice(0, 6)}`),
        attemptPayment(`pay-race-2-${randomUUID().slice(0, 6)}`),
      ]);

      const successCount = [res1, res2].filter((r) => r.success).length;
      expect(successCount).toBe(1);

      const dbPayments = await pool.query(
        `SELECT COUNT(*) AS count FROM resto_v2.payments WHERE order_id = $1;`,
        [orderId]
      );
      expect(Number(dbPayments.rows[0].count)).toBe(1);
    });
  });

  describe('6. Live PostgreSQL LISTEN/NOTIFY Trigger Bridge', () => {
    it('receives asynchronous notification from PostgreSQL trigger on table insert', async () => {
      const listenerClient = new Client({ connectionString });
      await listenerClient.connect();

      let receivedNotification: any = null;

      await new Promise<void>((resolve, reject) => {
        listenerClient.query('LISTEN resto_v2_realtime_channel', (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      listenerClient.on('notification', (msg) => {
        if (msg.channel === 'resto_v2_realtime_channel' && msg.payload) {
          receivedNotification = JSON.parse(msg.payload);
        }
      });

      // Insert an outbox event to fire trigger trg_notify_realtime_event
      const testEventId = `ord-realtime-${randomUUID().slice(0, 6)}`;
      await pool.query(
        `INSERT INTO resto_v2.realtime_events (
          restaurant_id, event_type, entity_type, entity_id, payload
        ) VALUES ('rest-int-01', 'order:created', 'order', $1, '{"test": "live_notify"}');`,
        [testEventId]
      );

      // Wait briefly for IPC socket event delivery
      await new Promise((r) => setTimeout(r, 200));

      await listenerClient.end();

      expect(receivedNotification).not.toBeNull();
      expect(receivedNotification.entity_id).toBe(testEventId);
      expect(receivedNotification.event_type).toBe('order:created');
      expect(receivedNotification.restaurant_id).toBe('rest-int-01');
    });
  });
});
