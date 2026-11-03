import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDatabase } from './setupTestDb.js';
import { OutboxService } from '../src/modules/realtime/OutboxService.js';
import { RealtimeEventBus } from '../src/modules/realtime/RealtimeEventBus.js';

describe('RESTO V2 Realtime Architecture & Cross-Instance Recovery', () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  describe('1. Transactional Outbox Persistence', () => {
    it('persists outbox events with sequential monotonic IDs and JSON payloads', async () => {
      const outbox = OutboxService.getInstance();
      const event1 = await outbox.publishEvent(undefined, {
        restaurantId: 'rest-olive-ember-01',
        eventType: 'order:created',
        entityType: 'order',
        entityId: 'ord-test-101',
        payload: { tableNumber: '01', total: 500 },
      });

      const event2 = await outbox.publishEvent(undefined, {
        restaurantId: 'rest-olive-ember-01',
        eventType: 'order:status_updated',
        entityType: 'order',
        entityId: 'ord-test-101',
        payload: { status: 'preparing' },
      });

      expect(event1.id).toBeGreaterThan(0);
      expect(event2.id).toBeGreaterThan(event1.id);
      expect(event1.eventType).toBe('order:created');
      expect(event2.eventType).toBe('order:status_updated');
    });
  });

  describe('2. Cursor-Based Event Replay & Catch-Up', () => {
    it('recovers all missed events after a given lastEventId', async () => {
      const outbox = OutboxService.getInstance();

      // Emit 3 events
      const e1 = await outbox.publishEvent(undefined, {
        restaurantId: 'rest-olive-ember-01',
        eventType: 'order:created',
        entityType: 'order',
        entityId: 'ord-sync-1',
        payload: { test: 1 },
      });

      const e2 = await outbox.publishEvent(undefined, {
        restaurantId: 'rest-olive-ember-01',
        eventType: 'order:status_updated',
        entityType: 'order',
        entityId: 'ord-sync-1',
        payload: { test: 2 },
      });

      const e3 = await outbox.publishEvent(undefined, {
        restaurantId: 'rest-olive-ember-01',
        eventType: 'payment:received',
        entityType: 'payment',
        entityId: 'pay-sync-1',
        payload: { test: 3 },
      });

      // A client reconnecting with lastEventId = e1.id must receive e2 and e3
      const missed = await outbox.getEventsSince('rest-olive-ember-01', e1.id);
      expect(missed).toHaveLength(2);
      expect(missed[0].id).toBe(e2.id);
      expect(missed[1].id).toBe(e3.id);
      expect(missed[0].eventType).toBe('order:status_updated');
      expect(missed[1].eventType).toBe('payment:received');
    });

    it('returns empty array when client is already up to date', async () => {
      const outbox = OutboxService.getInstance();
      const e = await outbox.publishEvent(undefined, {
        restaurantId: 'rest-olive-ember-01',
        eventType: 'table:status_changed',
        entityType: 'table',
        entityId: 'tbl-01',
        payload: { status: 'occupied' },
      });

      const missed = await outbox.getEventsSince('rest-olive-ember-01', e.id);
      expect(missed).toHaveLength(0);
    });
  });

  describe('3. Local SSE Event Bus & Fan-Out', () => {
    it('registers and removes SSE clients cleanly', () => {
      const bus = RealtimeEventBus.getInstance();
      const mockRes: any = {
        write: () => true,
        end: () => true,
      };

      const client = bus.registerClient('rest-olive-ember-01', mockRes, undefined, 0);
      expect(client.id).toBeDefined();
      expect(client.restaurantId).toBe('rest-olive-ember-01');

      bus.removeClient(client);
    });

    it('filters order-targeted SSE clients correctly', () => {
      const bus = RealtimeEventBus.getInstance();
      const writtenFrames: string[] = [];

      const mockRes: any = {
        write: (chunk: string) => {
          writtenFrames.push(chunk);
          return true;
        },
      };

      // Client subscribed to order ORD-999 only
      const client = bus.registerClient('rest-olive-ember-01', mockRes, 'ORD-999', 0);

      // Event for another order ORD-111
      bus.broadcast('rest-olive-ember-01', {
        id: 991,
        restaurantId: 'rest-olive-ember-01',
        eventType: 'order:updated',
        entityType: 'order',
        entityId: 'ORD-111',
        payload: { test: 'other' },
        createdAt: new Date().toISOString(),
      });

      expect(writtenFrames).toHaveLength(0); // Should be filtered out

      // Event for matching order ORD-999
      bus.broadcast('rest-olive-ember-01', {
        id: 992,
        restaurantId: 'rest-olive-ember-01',
        eventType: 'order:updated',
        entityType: 'order',
        entityId: 'ORD-999',
        payload: { test: 'match' },
        createdAt: new Date().toISOString(),
      });

      expect(writtenFrames.length).toBeGreaterThan(0);
      expect(writtenFrames[0]).toContain('ORD-999');

      bus.removeClient(client);
    });
  });
});

