import { query } from '../../database/db.js';

export interface ServiceRequestRow {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  table_number: string;
  request_type: 'waiter' | 'water' | 'bill' | 'assistance' | 'call_waiter' | 'request_bill' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  order_id: string | null;
  message: string | null;
  payment_preference: string | null;
  created_at: string;
  resolved_at: string | null;
}

export class ServiceRequestRepository {
  public async listByRestaurant(restaurantId: string): Promise<ServiceRequestRow[]> {
    const res = await query<ServiceRequestRow>(
      `SELECT * FROM resto_v2.service_requests
       WHERE restaurant_id = $1
       ORDER BY created_at DESC;`,
      [restaurantId]
    );
    return res.rows;
  }

  public async findById(id: string): Promise<ServiceRequestRow | null> {
    const res = await query<ServiceRequestRow>(
      `SELECT * FROM resto_v2.service_requests WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async create(data: {
    id: string;
    restaurantId: string;
    tableId?: string;
    tableNumber: string;
    requestType: any;
    orderId?: string;
    message?: string;
    paymentPreference?: string;
  }): Promise<ServiceRequestRow> {
    const res = await query<ServiceRequestRow>(
      `INSERT INTO resto_v2.service_requests (
        id, restaurant_id, table_id, table_number, request_type, status,
        order_id, message, payment_preference
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)
      RETURNING *;`,
      [
        data.id,
        data.restaurantId,
        data.tableId || null,
        data.tableNumber,
        data.requestType,
        data.orderId || null,
        data.message || null,
        data.paymentPreference || null,
      ]
    );
    return res.rows[0];
  }

  public async updateStatus(
    id: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<ServiceRequestRow | null> {
    const resolvedAtClause = status === 'completed' || status === 'cancelled' ? ', resolved_at = clock_timestamp()' : '';
    const res = await query<ServiceRequestRow>(
      `UPDATE resto_v2.service_requests
       SET status = $2${resolvedAtClause}
       WHERE id = $1
       RETURNING *;`,
      [id, status]
    );
    return res.rows[0] || null;
  }
}
