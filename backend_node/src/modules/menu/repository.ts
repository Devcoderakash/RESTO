import { query } from '../../database/db.js';

export interface MenuItemRow {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: string | number;
  image_url: string;
  food_type: 'veg' | 'non_veg';
  dietary_tags: any;
  available: boolean;
  popular: boolean;
  chef_special: boolean;
  preparation_time_minutes: number;
  allergens: any;
  created_at: string;
  updated_at: string;
}

export class MenuItemRepository {
  public async listByRestaurant(restaurantId: string): Promise<MenuItemRow[]> {
    const res = await query<MenuItemRow>(
      `SELECT * FROM resto_v2.menu_items
       WHERE restaurant_id = $1
       ORDER BY sort_order ASC, name ASC;`,
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
    foodType?: 'veg' | 'non_veg';
    isVegetarian?: boolean;
    available?: boolean;
  }): Promise<MenuItemRow> {
    const foodType = data.foodType || (data.isVegetarian === false ? 'non_veg' : 'veg');
    const isAvail = data.available ?? true;

    const res = await query<MenuItemRow>(
      `INSERT INTO resto_v2.menu_items (
        id, restaurant_id, category_id, name, description, price, image_url,
        food_type, available
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;`,
      [
        data.id,
        data.restaurantId,
        data.categoryId,
        data.name,
        data.description || '',
        data.price,
        data.imageUrl || '',
        foodType,
        isAvail,
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
      foodType?: 'veg' | 'non_veg';
      isVegetarian?: boolean;
      available?: boolean;
    }
  ): Promise<MenuItemRow | null> {
    let foodType = updates.foodType;
    if (foodType === undefined && updates.isVegetarian !== undefined) {
      foodType = updates.isVegetarian ? 'veg' : 'non_veg';
    }

    const res = await query<MenuItemRow>(
      `UPDATE resto_v2.menu_items
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           category_id = COALESCE($5, category_id),
           image_url = COALESCE($6, image_url),
           food_type = COALESCE($7, food_type),
           available = COALESCE($8, available),
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
        foodType ?? null,
        updates.available ?? null,
      ]
    );
    return res.rows[0] || null;
  }

  public async setAvailability(id: string, isAvailable: boolean): Promise<MenuItemRow | null> {
    const res = await query<MenuItemRow>(
      `UPDATE resto_v2.menu_items
       SET available = $2, updated_at = clock_timestamp()
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
