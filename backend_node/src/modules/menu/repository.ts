import { query } from '../../database/db.js';

export interface MenuItemRow {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string | number;
  image_url: string | null;
  is_vegetarian: boolean;
  is_available: boolean;
  spiciness_level: number;
  preparation_time_minutes: number;
  allergens: string[];
  created_at: string;
  updated_at: string;
}

export class MenuItemRepository {
  public async listByRestaurant(restaurantId: string): Promise<MenuItemRow[]> {
    const res = await query<MenuItemRow>(
      `SELECT * FROM resto_v2.menu_items
       WHERE restaurant_id = $1
       ORDER BY name ASC;`,
      [restaurantId]
    );
    return res.rows;
  }

  public async findById(id: string): Promise<MenuItemRow | null> {
    const res = await query<MenuItemRow>(
      `SELECT * FROM resto_v2.menu_items WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async create(data: {
    id: string;
    restaurantId: string;
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isVegetarian?: boolean;
    isAvailable?: boolean;
  }): Promise<MenuItemRow> {
    const res = await query<MenuItemRow>(
      `INSERT INTO resto_v2.menu_items (
        id, restaurant_id, category_id, name, description, price, image_url,
        is_vegetarian, is_available
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true), COALESCE($9, true))
      RETURNING *;`,
      [
        data.id,
        data.restaurantId,
        data.categoryId,
        data.name,
        data.description || null,
        data.price,
        data.imageUrl || null,
        data.isVegetarian ?? true,
        data.isAvailable ?? true,
      ]
    );
    return res.rows[0];
  }

  public async update(
    id: string,
    updates: {
      name?: string;
      description?: string;
      price?: number;
      categoryId?: string;
      imageUrl?: string;
      isVegetarian?: boolean;
      isAvailable?: boolean;
    }
  ): Promise<MenuItemRow | null> {
    const res = await query<MenuItemRow>(
      `UPDATE resto_v2.menu_items
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           category_id = COALESCE($5, category_id),
           image_url = COALESCE($6, image_url),
           is_vegetarian = COALESCE($7, is_vegetarian),
           is_available = COALESCE($8, is_available),
           updated_at = clock_timestamp()
       WHERE id = $1
       RETURNING *;`,
      [
        id,
        updates.name ?? null,
        updates.description ?? null,
        updates.price ?? null,
        updates.categoryId ?? null,
        updates.imageUrl ?? null,
        updates.isVegetarian ?? null,
        updates.isAvailable ?? null,
      ]
    );
    return res.rows[0] || null;
  }

  public async setAvailability(id: string, isAvailable: boolean): Promise<MenuItemRow | null> {
    const res = await query<MenuItemRow>(
      `UPDATE resto_v2.menu_items
       SET is_available = $2, updated_at = clock_timestamp()
       WHERE id = $1
       RETURNING *;`,
      [id, isAvailable]
    );
    return res.rows[0] || null;
  }

  public async delete(id: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM resto_v2.menu_items WHERE id = $1;`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
