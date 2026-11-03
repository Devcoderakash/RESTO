import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDatabase } from './setupTestDb.js';
import { OrderService } from '../src/modules/orders/service.js';
import { PaymentService } from '../src/modules/payments/service.js';
import { ServiceRequestService } from '../src/modules/service-requests/service.js';
import { withTransaction } from '../src/database/db.js';

describe('RESTO V2 Business Logic & Database Invariants', () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  describe('1. Server-Side 5% GST Calculation & Item Pricing', () => {
    it('calculates 5% GST (2.5% CGST + 2.5% SGST) accurately from server prices', async () => {
      const orderService = new OrderService();
      // Ordering 2 Pizzas (480 * 2 = 960) and 1 Tiramisu (250) = Subtotal 1210.00
      const result = await orderService.createOrder({
        restaurantId: 'rest-olive-ember-01',
        tableNumber: '01',
        customerName: 'Aarav Patel',
        items: [
          { id: 'item-pizza-01', quantity: 2 },
          { id: 'item-dessert-01', quantity: 1 },
        ],
      });

      expect(result.order.subtotal).toBe(1210.00);
      expect(result.order.tax).toBe(60.50); // 1210 * 0.05 = 60.50
      expect(result.order.cgst).toBe(30.25); // 2.5% CGST
      expect(result.order.sgst).toBe(30.25); // 2.5% SGST
      expect(result.order.total).toBe(1270.50);
      expect(result.order.status).toBe('pending');
      expect(result.order.items).toHaveLength(2);
    });

    it('rejects unavailable menu items from order creation', async () => {
      const orderService = new OrderService();
      await expect(
        orderService.createOrder({
          restaurantId: 'rest-olive-ember-01',
          tableNumber: '01',
          customerName: 'Aarav Patel',
          items: [{ id: 'non-existent-item', quantity: 1 }],
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Order Idempotency Protection', () => {
    it('returns the existing order without creating a duplicate when idempotencyKey matches', async () => {
      const orderService = new OrderService();
      const idempotencyKey = 'idemp-unique-token-9988';

      const firstCall = await orderService.createOrder({
        restaurantId: 'rest-olive-ember-01',
        tableNumber: '01',
        customerName: 'Aarav Patel',
        idempotencyKey,
        items: [{ id: 'item-pizza-01', quantity: 1 }],
      });

      const secondCall = await orderService.createOrder({
        restaurantId: 'rest-olive-ember-01',
        tableNumber: '01',
        customerName: 'Aarav Patel',
        idempotencyKey,
        items: [{ id: 'item-pizza-01', quantity: 1 }],
      });

      expect(firstCall.order.id).toBe(secondCall.order.id);
      expect(secondCall.idempotentReplay).toBe(true);
    });
  });

  describe('3. Order Status State Machine Transitions', () => {
    it('enforces allowed sequential state transitions', async () => {
      const orderService = new OrderService();
      const created = await orderService.createOrder({
        restaurantId: 'rest-olive-ember-01',
        tableNumber: '01',
        customerName: 'Test Customer',
        items: [{ id: 'item-pizza-01', quantity: 1 }],
      });

      // pending -> confirmed
      const confirmed = await orderService.updateOrderStatus(created.order.id, 'confirmed');
      expect(confirmed.status).toBe('confirmed');

      // confirmed -> preparing
      const preparing = await orderService.updateOrderStatus(created.order.id, 'preparing');
      expect(preparing.status).toBe('preparing');

      // preparing -> ready
      const ready = await orderService.updateOrderStatus(created.order.id, 'ready');
      expect(ready.status).toBe('ready');

      // ready -> delivered
      const delivered = await orderService.updateOrderStatus(created.order.id, 'delivered');
      expect(delivered.status).toBe('delivered');

      // delivered -> completed
      const completed = await orderService.updateOrderStatus(created.order.id, 'completed');
      expect(completed.status).toBe('completed');
    });

    it('rejects illegal status transitions (e.g. pending directly to delivered)', async () => {
      const orderService = new OrderService();
      const created = await orderService.createOrder({
        restaurantId: 'rest-olive-ember-01',
        tableNumber: '01',
        customerName: 'Test Customer',
        items: [{ id: 'item-pizza-01', quantity: 1 }],
      });

      await expect(
        orderService.updateOrderStatus(created.order.id, 'delivered')
      ).rejects.toThrow('Invalid state transition');
    });

    it('prohibits mutating a terminal completed or cancelled order', async () => {
      const orderService = new OrderService();
      await expect(
        orderService.updateOrderStatus('ord-20261102-001', 'preparing')
      ).rejects.toThrow('Cannot transition order from terminal state');
    });
  });

  describe('4. Payments & Duplicate Payment Protection', () => {
    it('creates a payment and marks the associated order as completed', async () => {
      const orderService = new OrderService();
      const paymentService = new PaymentService();

      const created = await orderService.createOrder({
        restaurantId: 'rest-olive-ember-01',
        tableNumber: '01',
        customerName: 'Payment Test',
        items: [{ id: 'item-dessert-01', quantity: 1 }],
      });

      const payment = await paymentService.createPayment({
        restaurantId: 'rest-olive-ember-01',
        orderId: created.order.id,
        paymentMethod: 'upi',
        transactionReference: 'UPI-TEST-1234',
      });

      expect(payment.orderId).toBe(created.order.id);
      expect(payment.status).toBe('completed');
      expect(payment.amount).toBe(created.order.total);

      // Verify order is now completed
      const updatedOrder = await orderService.getOrderById(created.order.id);
      expect(updatedOrder.status).toBe('completed');
    });

    it('prevents duplicate payment on an already paid order', async () => {
      const paymentService = new PaymentService();
      // ord-20261102-001 already has pay-20261102-001 in seed data
      await expect(
        paymentService.createPayment({
          restaurantId: 'rest-olive-ember-01',
          orderId: 'ord-20261102-001',
          paymentMethod: 'cash',
        })
      ).rejects.toThrow('A completed payment already exists');
    });
  });

  describe('5. Service Requests Lifecycle', () => {
    it('creates and updates waiter service requests', async () => {
      const service = new ServiceRequestService();
      const req = await service.createRequest({
        restaurantId: 'rest-olive-ember-01',
        tableNumber: '01',
        requestType: 'water',
        message: 'Extra ice please',
      });

      expect(req.tableNumber).toBe('01');
      expect(req.status).toBe('pending');
      expect(req.requestType).toBe('water');

      const updated = await service.updateStatus(req.id, 'completed');
      expect(updated.status).toBe('completed');
      expect(updated.resolvedAt).toBeDefined();
    });
  });

  describe('6. Database Transactions & Rollback Verification', () => {
    it('executes ROLLBACK and releases client when transaction callback fails', async () => {
      let rolledBack = false;
      let released = false;

      const mockClient: any = {
        query: async (sql: string) => {
          if (sql === 'ROLLBACK') rolledBack = true;
          return { rows: [] };
        },
        release: () => {
          released = true;
        },
      };

      const mockPool: any = {
        connect: async () => mockClient,
      };

      // Import setPool to test transaction runner behavior
      const { setPool } = await import('../src/database/db.js');
      setPool(mockPool);

      await expect(
        withTransaction(async () => {
          throw new Error('Transaction abort test');
        })
      ).rejects.toThrow('Transaction abort test');

      expect(rolledBack).toBe(true);
      expect(released).toBe(true);

      // Restore test DB pool
      setupTestDatabase();
    });
  });
});
