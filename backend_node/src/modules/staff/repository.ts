import { query } from '../../database/db.js';

export interface StaffRow {
  id: string;
  restaurant_id: string;
  full_name: string;
  email: string;
  username: string | null;
  password_hash: string;
  role: 'super_admin' | 'restaurant_admin' | 'manager' | 'chef' | 'waiter';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export class StaffRepository {
  public async listByRestaurant(restaurantId: string): Promise<StaffRow[]> {
    const res = await query<StaffRow>(
      `SELECT * FROM resto_v2.staff WHERE restaurant_id = $1 ORDER BY full_name ASC;`,
      [restaurantId]
    );
    return res.rows;
  }

  public async findByEmail(email: string): Promise<StaffRow | null> {
    const res = await query<StaffRow>(
      `SELECT * FROM resto_v2.staff WHERE LOWER(email) = LOWER($1) LIMIT 1;`,
      [email]
    );
    return res.rows[0] || null;
  }

  public async findById(id: string): Promise<StaffRow | null> {
    const res = await query<StaffRow>(
      `SELECT * FROM resto_v2.staff WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async create(data: {
    id: string;
    restaurantId: string;
    fullName: string;
    email: string;
    role: 'super_admin' | 'restaurant_admin' | 'manager' | 'chef' | 'waiter';
    passwordHash?: string;
  }): Promise<StaffRow> {
    const res = await query<StaffRow>(
      `INSERT INTO resto_v2.staff (
        id, restaurant_id, full_name, email, role, password_hash, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *;`,
      [data.id, data.restaurantId, data.fullName, data.email, data.role, data.passwordHash || '']
    );
    return res.rows[0];
  }

  public async updateStatus(id: string, isActive: boolean): Promise<StaffRow | null> {
    const res = await query<StaffRow>(
      `UPDATE resto_v2.staff
       SET is_active = $2, updated_at = clock_timestamp()
       WHERE id = $1
       RETURNING *;`,
      [id, isActive]
    );
    return res.rows[0] || null;
  }
}

