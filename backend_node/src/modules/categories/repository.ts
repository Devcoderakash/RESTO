import { query } from '../../database/db.js';

export interface CategoryRow {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export class CategoryRepository {
  public async listByRestaurant(restaurantId: string): Promise<CategoryRow[]> {
    const res = await query<CategoryRow>(
      `SELECT * FROM resto_v2.categories
       WHERE restaurant_id = $1
       ORDER BY sort_order ASC, name ASC;`,
      [restaurantId]
    );
    return res.rows;
  }

  public async findById(id: string): Promise<CategoryRow | null> {
    const res = await query<CategoryRow>(
      `SELECT * FROM resto_v2.categories WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async create(data: {
    id: string;
    restaurantId: string;
    name: string;
    description?: string;
    sortOrder?: number;
  }): Promise<CategoryRow> {
    const res = await query<CategoryRow>(
      `INSERT INTO resto_v2.categories (
        id, restaurant_id, name, description, sort_order, is_visible
      ) VALUES ($1, $2, $3, $4, COALESCE($5, 0), true)
      RETURNING *;`,
      [data.id, data.restaurantId, data.name, data.description || null, data.sortOrder ?? 0]
    );
    return res.rows[0];
  }

  public async update(
    id: string,
    updates: {
      name?: string;
      description?: string;
      sortOrder?: number;
      isVisible?: boolean;
    }
  ): Promise<CategoryRow | null> {
    const res = await query<CategoryRow>(
      `UPDATE resto_v2.categories
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           sort_order = COALESCE($4, sort_order),
           is_visible = COALESCE($5, is_visible),
           updated_at = clock_timestamp()
       WHERE id = $1
       RETURNING *;`,
      [id, updates.name ?? null, updates.description ?? null, updates.sortOrder ?? null, updates.isVisible ?? null]
    );
    return res.rows[0] || null;
  }

  public async delete(id: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM resto_v2.categories WHERE id = $1;`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

