import { randomUUID } from 'crypto';
import { withTransaction } from '../../database/db.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { OrderRepository } from '../orders/repository.js';
import { OutboxService } from '../realtime/OutboxService.js';
import { PaymentRepository, PaymentRow } from './repository.js';

export class PaymentService {
  constructor(
    private readonly paymentRepo = new PaymentRepository(),
    private readonly orderRepo = new OrderRepository(),
    private readonly outbox = OutboxService.getInstance()
  ) {}

  public async listPayments(restaurantId: string) {
    const rows = await this.paymentRepo.listByRestaurant(restaurantId);
    return rows.map((r) => this.formatPayment(r));
  }

  public async getPaymentById(id: string) {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) throw new NotFoundError(`Payment '${id}' not found`);
    return this.formatPayment(payment);
  }

  public async createPayment(data: {
    restaurantId: string;
    orderId: string;
    amount?: number;
    paymentMethod: any;
    transactionReference?: string;
  }) {
    const { restaurantId, orderId, paymentMethod, transactionReference } = data;

    if (!orderId || !paymentMethod) {
      throw new BadRequestError('orderId and paymentMethod are required');
    }

    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found`);
    }

    // Duplicate payment check
    const existingPayment = await this.paymentRepo.findByOrderId(orderId);
    if (existingPayment) {
      throw new ConflictError(`A completed payment already exists for order '${orderId}'`);
    }

    const validMethods = ['cash', 'upi', 'card', 'qr_pay'];
    const normalizedMethod = String(paymentMethod).toLowerCase();
    if (!validMethods.includes(normalizedMethod)) {
      throw new BadRequestError(`Invalid payment method '${paymentMethod}'. Allowed: ${validMethods.join(', ')}`);
    }

    const orderTotal = Number((order as any).final_total ?? (order as any).total ?? 0);
    const paymentAmount = data.amount !== undefined ? Number(data.amount) : orderTotal;
    const paymentId = `pay-${randomUUID().substring(0, 12)}`;

    let tableReleased = false;
    let tableIdToRelease: string | null = null;

    const paymentRow = await withTransaction(async (client) => {
      // 1. Insert payment record
      const res = await client.query<PaymentRow>(
        `INSERT INTO resto_v2.payments (
          id, restaurant_id, order_id, amount, payment_method, payment_status, transaction_reference
        ) VALUES ($1, $2, $3, $4, $5, 'completed', $6)
        RETURNING *;`,
        [paymentId, restaurantId, orderId, paymentAmount, normalizedMethod, transactionReference || null]
      );

      // 2. Complete order if not already completed
      await client.query(
        `UPDATE resto_v2.orders SET status = 'completed', updated_at = clock_timestamp() WHERE id = $1;`,
        [orderId]
      );

      // 3. Auto-release table if no remaining active orders
      const countRes = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM resto_v2.orders
         WHERE restaurant_id = $1 AND table_number = $2 AND status NOT IN ('completed', 'cancelled') AND id != $3;`,
        [restaurantId, order.table_number, orderId]
      );
      const remainingActive = Number(countRes.rows[0]?.count || 0);

      if (remainingActive === 0 && order.table_id) {
        await client.query(
          `UPDATE resto_v2.restaurant_tables SET status = 'available' WHERE id = $1;`,
          [order.table_id]
        );
        tableReleased = true;
        tableIdToRelease = order.table_id;
      }

      return res.rows[0];
    });

    const formattedPayment = this.formatPayment(paymentRow);

    // Realtime events
    await this.outbox.publishEvent(undefined, {
      restaurantId,
      eventType: 'payment:received',
      entityType: 'payment',
      entityId: paymentId,
      payload: formattedPayment,
    });

    await this.outbox.publishEvent(undefined, {
      restaurantId,
      eventType: 'order:status_updated',
      entityType: 'order',
      entityId: orderId,
      payload: { id: orderId, status: 'completed' },
    });

    if (tableReleased && tableIdToRelease) {
      await this.outbox.publishEvent(undefined, {
        restaurantId,
        eventType: 'table:released',
        entityType: 'table',
        entityId: tableIdToRelease,
        payload: { tableId: tableIdToRelease, tableNumber: order.table_number, status: 'available' },
      });
    }

    return formattedPayment;
  }

  public async updateStatus(id: string, status: any) {
    const existing = await this.paymentRepo.findById(id);
    if (!existing) throw new NotFoundError(`Payment '${id}' not found`);

    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid payment status '${status}'`);
    }

    const updated = await this.paymentRepo.updateStatus(id, status);
    return this.formatPayment(updated!);
  }

  private formatPayment(r: PaymentRow) {
    const amountNum = Number(r.amount);
    const status = (r as any).payment_status || (r as any).status || 'completed';
    return {
      id: r.id,
      restaurantId: r.restaurant_id,
      restaurant_id: r.restaurant_id,
      orderId: r.order_id,
      order_id: r.order_id,
      amount: amountNum,
      paymentMethod: r.payment_method,
      payment_method: r.payment_method,
      status,
      paymentStatus: status,
      payment_status: status,
      transactionReference: r.transaction_reference,
      transaction_reference: r.transaction_reference,
      createdAt: r.created_at,
      created_at: r.created_at,
    };
  }
}
