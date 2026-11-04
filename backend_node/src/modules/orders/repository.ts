import pg from 'pg';
import { query } from '../../database/db.js';

export interface OrderRow {
  id: string;
  restaurant_id: string;
  order_number: string;
  table_id: string | null;
  table_number: string;
  customer_name: string;
  customer_phone: string | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'delivered' | 'completed' | 'cancelled';
  subtotal: string | number;
  tax: string | number;
  service_charge: string | number;
  total: string | number;
  special_instructions: string | null;
  idempotency_key: string | null;
  tracking_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  unit_price: string | number;
  quantity: number;
  total_price: string | number;
  notes: string | null;
  created_at: string;
}

export class OrderRepository {
  public async listByRestaurant(
    restaurantId: string,
    filters?: { status?: string; tableId?: string; limit?: number }
  ): Promise<OrderRow[]> {
    let sql = `SELECT * FROM resto_v2.orders WHERE restaurant_id = $1`;
    const params: any[] = [restaurantId];

    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }

    if (filters?.tableId) {
      params.push(filters.tableId);
      sql += ` AND table_id = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    if (filters?.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${params.length}`;
    }

    const res = await query<OrderRow>(sql, params);
    return res.rows;
  }

  public async findById(id: string): Promise<OrderRow | null> {
    const res = await query<OrderRow>(
      `SELECT * FROM resto_v2.orders WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async findByIdempotencyKey(restaurantId: string, idempotencyKey: string): Promise<OrderRow | null> {
    const res = await query<OrderRow>(
      `SELECT * FROM resto_v2.orders
       WHERE restaurant_id = $1 AND idempotency_key = $2
       LIMIT 1;`,
      [restaurantId, idempotencyKey]
    );
    return res.rows[0] || null;
  }

  public async getOrderItems(orderId: string): Promise<OrderItemRow[]> {
    const res = await query<OrderItemRow>(
      `SELECT * FROM resto_v2.order_items WHERE order_id = $1;`,
      [orderId]
    );
    return res.rows;
  }

  public async insertOrderInTx(client: pg.PoolClient, order: {
    id: string;
    restaurantId: string;
    orderNumber: string;
    tableId?: string;
    tableNumber: string;
    customerName: string;
    customerPhone?: string;
    subtotal: number;
    tax: number;
    serviceCharge: number;
    total: number;
    specialInstructions?: string;
    idempotencyKey?: string;
    trackingToken?: string;
  }): Promise<OrderRow> {
    const cgst = Number((order.subtotal * 0.025).toFixed(2));
    const sgst = Number((order.tax - cgst).toFixed(2));

    const sql = `
      INSERT INTO resto_v2.orders (
        id, restaurant_id, order_number, table_id, table_number,
        customer_name, customer_phone, status, subtotal, cgst, sgst, gst_total,
        service_charge, final_total, order_notes, idempotency_key, tracking_token_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;
    const res = await client.query<OrderRow>(sql, [
      order.id,
      order.restaurantId,
      order.orderNumber,
      order.tableId || null,
      order.tableNumber,
      order.customerName,
      order.customerPhone || null,
      order.subtotal,
      cgst,
      sgst,
      order.tax,
      order.serviceCharge,
      order.total,
      order.specialInstructions || null,
      order.idempotencyKey || '',
      order.trackingToken || '',
    ]);
    return res.rows[0];
  }

  public async insertOrderItemsInTx(
    client: pg.PoolClient,
    items: Array<{
      id: string;
      orderId: string;
      menuItemId: string;
      itemName: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
      foodType?: string;
      notes?: string;
    }>
  ): Promise<OrderItemRow[]> {
    const rows: OrderItemRow[] = [];
    for (const item of items) {
      const res = await client.query<OrderItemRow>(
        `INSERT INTO resto_v2.order_items (
          id, order_id, menu_item_id, item_name, food_type, unit_price, quantity, total_price, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;`,
        [
          item.id,
          item.orderId,
          item.menuItemId,
          item.itemName,
          item.foodType || 'veg',
          item.unitPrice,
          item.quantity,
          item.totalPrice,
          item.notes || null,
        ]
      );
      rows.push(res.rows[0]);
    }
    return rows;
  }

  public async updateStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'delivered' | 'completed' | 'cancelled'
  ): Promise<OrderRow | null> {
    const res = await query<OrderRow>(
      `UPDATE resto_v2.orders
       SET status = $2, updated_at = clock_timestamp()
       WHERE id = $1
       RETURNING *;`,
      [id, status]
    );
    return res.rows[0] || null;
  }

  public async countActiveOrdersForTable(restaurantId: string, tableNumber: string, excludeOrderId?: string): Promise<number> {
    let sql = `
      SELECT COUNT(*) AS count FROM resto_v2.orders
      WHERE restaurant_id = $1 AND table_number = $2 AND status NOT IN ('completed', 'cancelled')
    `;
    const params: any[] = [restaurantId, tableNumber];
    if (excludeOrderId) {
      params.push(excludeOrderId);
      sql += ` AND id != $3`;
    }
    const res = await query<{ count: string }>(sql, params);
    return Number(res.rows[0]?.count || 0);
  }
}

