import { query } from '../../database/db.js';

export interface PaymentRow {
  id: string;
  restaurant_id: string;
  order_id: string;
  amount: string | number;
  payment_method: 'cash' | 'upi' | 'card' | 'qr_pay';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_reference: string | null;
  created_at: string;
}

export class PaymentRepository {
  public async listByRestaurant(restaurantId: string): Promise<PaymentRow[]> {
    const res = await query<PaymentRow>(
      `SELECT * FROM resto_v2.payments WHERE restaurant_id = $1 ORDER BY created_at DESC;`,
      [restaurantId]
    );
    return res.rows;
  }

  public async findById(id: string): Promise<PaymentRow | null> {
    const res = await query<PaymentRow>(
      `SELECT * FROM resto_v2.payments WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async findByOrderId(orderId: string): Promise<PaymentRow | null> {
    const res = await query<PaymentRow>(
      `SELECT * FROM resto_v2.payments WHERE order_id = $1 AND payment_status = 'completed' LIMIT 1;`,
      [orderId]
    );
    return res.rows[0] || null;
  }

  public async create(data: {
    id: string;
    restaurantId: string;
    orderId: string;
    amount: number;
    paymentMethod: 'cash' | 'upi' | 'card' | 'qr_pay';
    status?: 'pending' | 'completed' | 'failed' | 'refunded';
    transactionReference?: string;
  }): Promise<PaymentRow> {
    const res = await query<PaymentRow>(
      `INSERT INTO resto_v2.payments (
        id, restaurant_id, order_id, amount, payment_method, payment_status, transaction_reference
      ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'completed'), $7)
      RETURNING *;`,
      [
        data.id,
        data.restaurantId,
        data.orderId,
        data.amount,
        data.paymentMethod,
        data.status || 'completed',
        data.transactionReference || null,
      ]
    );
    return res.rows[0];
  }

  public async updateStatus(id: string, status: 'pending' | 'completed' | 'failed' | 'refunded'): Promise<PaymentRow | null> {
    const res = await query<PaymentRow>(
      `UPDATE resto_v2.payments
       SET payment_status = $2
       WHERE id = $1
       RETURNING *;`,
      [id, status]
    );
    return res.rows[0] || null;
  }
}

