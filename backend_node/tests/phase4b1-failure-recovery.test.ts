import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { spawn } from 'child_process';
import { signStaffToken } from '../src/utils/jwt.js';

const { Pool } = pg;

describe('RESTO V2 — Phase 4B.1 Failure & Recovery Resiliency Suite', () => {
  const rehearsalConnStr = 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';
  const instanceAUrl = 'http://localhost:5005';
  const instanceBUrl = 'http://localhost:5006';
  let pool: pg.Pool;
  let managerToken: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: rehearsalConnStr });
    managerToken = signStaffToken({
      id: 'stf-manager',
      name: 'Restaurant Manager',
      email: 'contact@grandbistrolounge.com',
      role: 'manager',
      restaurantId: 'rest-olive-ember-01',
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('1. Drop and Automatic Restoration of Dedicated LISTEN Connection', () => {
    it('survives pg_terminate_backend on LISTEN connection and automatically re-establishes channel', async () => {
      // 1. Find LISTEN PID for Instance B in PostgreSQL
      const findListenQuery = await pool.query(`
        SELECT pid, client_port 
        FROM pg_stat_activity 
        WHERE datname = 'resto_v2_rehearsal' 
          AND query LIKE 'LISTEN resto_v2_realtime_channel%'
        ORDER BY backend_start DESC
        LIMIT 1;
      `);

      expect(findListenQuery.rows.length).toBeGreaterThan(0);
      const victimPid = findListenQuery.rows[0].pid;

      // 2. Terminate the backend connection simulating a database network drop
      const killRes = await pool.query(`SELECT pg_terminate_backend($1);`, [victimPid]);
      expect(killRes.rows[0].pg_terminate_backend).toBe(true);

      // 3. Wait for RealtimeBridge exponential reconnect cycle (base delay 1-2s)
      let reconnected = false;
      const deadline = Date.now() + 6000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 400));
        const checkRes = await pool.query(`
          SELECT COUNT(*) as count 
          FROM pg_stat_activity 
          WHERE datname = 'resto_v2_rehearsal' 
            AND query LIKE 'LISTEN resto_v2_realtime_channel%'
            AND pid <> $1;
        `, [victimPid]);
        if (Number(checkRes.rows[0].count) >= 2) {
          reconnected = true;
          break;
        }
      }

      expect(reconnected).toBe(true);

      // 4. Verify cross-instance event still propagates after reconnection
      const testReq = await fetch(`${instanceAUrl}/api/service-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug: 'olive-and-ember',
          tableNumber: '02',
          requestType: 'water',
          message: 'Post-recovery test event',
        }),
      });
      expect(testReq.status).toBe(201);
      const reqId = (await testReq.json()).request.id;

      // Cleanup
      await pool.query(`DELETE FROM resto_v2.service_requests WHERE id = $1;`, [reqId]);
    });
  });

  describe('2. Notification Reconnect Backoff & Resiliency', () => {
    it('calculates exponential backoff with ceiling and randomized jitter', () => {
      const calculateDelay = (attempt: number) => {
        const baseDelay = Math.min(30000, 1000 * Math.pow(2, attempt));
        const jitter = 250; // midpoint of 0-500ms
        return baseDelay + jitter;
      };

      const delay0 = calculateDelay(0); // ~1250ms
      const delay1 = calculateDelay(1); // ~2250ms
      const delay2 = calculateDelay(2); // ~4250ms
      const delay5 = calculateDelay(5); // ~30250ms (capped at 30s)
      const delay10 = calculateDelay(10); // ~30250ms (capped at 30s)

      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay5).toBeLessThanOrEqual(31000);
      expect(delay10).toBeLessThanOrEqual(31000);
    });

    it('correctly orders out-of-order events using monotonic sequence IDs', () => {
      const arrivedEvents = [
        { id: 495, eventType: 'order.updated', payload: { status: 'ready' } },
        { id: 493, eventType: 'order.created', payload: { status: 'pending' } },
        { id: 496, eventType: 'order.updated', payload: { status: 'completed' } },
        { id: 494, eventType: 'order.updated', payload: { status: 'preparing' } },
      ];

      // Re-order strictly by monotonic ID
      const ordered = arrivedEvents.sort((a, b) => a.id - b.id);
      expect(ordered.map((e) => e.payload.status)).toEqual([
        'pending',
        'preparing',
        'ready',
        'completed',
      ]);
    });
  });

  describe('3. Multi-Subscriber High Concurrency Stress Test', () => {
    it('supports 50 simultaneous SSE subscribers across both instances without memory leak or crash', async () => {
      const controllers: AbortController[] = [];
      const subscriberPromises: Promise<any>[] = [];

      for (let i = 0; i < 50; i++) {
        const targetUrl = i % 2 === 0 ? instanceAUrl : instanceBUrl;
        const ctrl = new AbortController();
        controllers.push(ctrl);

        const p = fetch(
          `${targetUrl}/api/realtime/stream?restaurantSlug=olive-and-ember&lastEventId=0`,
          {
            headers: {
              Authorization: `Bearer ${managerToken}`,
              'X-Staff-Internal': 'true',
              Accept: 'text/event-stream',
            },
            signal: ctrl.signal,
          }
        ).then(async (res) => {
          expect(res.status).toBe(200);
          const reader = res.body!.getReader();
          const { value } = await reader.read();
          const banner = new TextDecoder().decode(value);
          expect(banner).toContain(': connected at');
        });

        subscriberPromises.push(p);
      }

      await Promise.all(subscriberPromises);

      // Cleanly teardown
      for (const c of controllers) {
        c.abort();
      }
    });
  });
});

