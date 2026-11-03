import { query } from '../../database/db.js';

export interface TableRow {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'inactive';
  zone?: string;
  qr_code_url: string | null;
  created_at: string;
}

export class TableRepository {
  public async listByRestaurant(restaurantId: string): Promise<TableRow[]> {
    const res = await query<TableRow>(
      `SELECT * FROM resto_v2.restaurant_tables
       WHERE restaurant_id = $1 AND status <> 'inactive'
       ORDER BY table_number ASC;`,
      [restaurantId]
    );
    return res.rows;
  }

  public async findById(id: string): Promise<TableRow | null> {
    const res = await query<TableRow>(
      `SELECT * FROM resto_v2.restaurant_tables WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async findByTableNumber(restaurantId: string, tableNumber: string): Promise<TableRow | null> {
    const res = await query<TableRow>(
      `SELECT * FROM resto_v2.restaurant_tables
       WHERE restaurant_id = $1 AND table_number = $2 AND status <> 'inactive'
       LIMIT 1;`,
      [restaurantId, tableNumber]
    );
    return res.rows[0] || null;
  }

  public async create(data: {
    id: string;
    restaurantId: string;
    tableNumber: string;
    capacity: number;
    qrCodeUrl?: string;
  }): Promise<TableRow> {
    const res = await query<TableRow>(
      `INSERT INTO resto_v2.restaurant_tables (
        id, restaurant_id, table_number, capacity, qr_code_url, status
      ) VALUES ($1, $2, $3, $4, $5, 'available')
      RETURNING *;`,
      [data.id, data.restaurantId, data.tableNumber, data.capacity, data.qrCodeUrl || null]
    );
    return res.rows[0];
  }

  public async update(
    id: string,
    updates: {
      tableNumber?: string;
      capacity?: number;
      status?: 'available' | 'occupied' | 'reserved' | 'inactive';
      qrCodeUrl?: string;
    }
  ): Promise<TableRow | null> {
    const res = await query<TableRow>(
      `UPDATE resto_v2.restaurant_tables
       SET table_number = COALESCE($2, table_number),
           capacity = COALESCE($3, capacity),
           status = COALESCE($4, status),
           qr_code_url = COALESCE($5, qr_code_url)
       WHERE id = $1
       RETURNING *;`,
      [id, updates.tableNumber ?? null, updates.capacity ?? null, updates.status ?? null, updates.qrCodeUrl ?? null]
    );
    return res.rows[0] || null;
  }

  public async updateStatus(id: string, status: 'available' | 'occupied' | 'reserved' | 'inactive'): Promise<TableRow | null> {
    const res = await query<TableRow>(
      `UPDATE resto_v2.restaurant_tables
       SET status = $2
       WHERE id = $1
       RETURNING *;`,
      [id, status]
    );
    return res.rows[0] || null;
  }

  public async softDelete(id: string): Promise<boolean> {
    const res = await query(
      `UPDATE resto_v2.restaurant_tables
       SET status = 'inactive'
       WHERE id = $1;`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

