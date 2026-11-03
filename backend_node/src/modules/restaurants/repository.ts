import { query } from '../../database/db.js';

export interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  wifi_ssid: string;
  wifi_password: string;
  tax_percentage: string | number;
  service_charge_percentage: string | number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantSettingsRow {
  id: string;
  restaurant_id: string;
  opening_hours: any;
  online_ordering_enabled: boolean;
  allow_table_orders: boolean;
  auto_accept_orders: boolean;
  sound_notifications: boolean;
  notification_sound: string;
  created_at: string;
  updated_at: string;
}

export class RestaurantRepository {
  public async findBySlug(slug: string): Promise<RestaurantRow | null> {
    const res = await query<RestaurantRow>(
      `SELECT * FROM resto_v2.restaurants WHERE slug = $1 AND is_active = true LIMIT 1;`,
      [slug]
    );
    return res.rows[0] || null;
  }

  public async findById(id: string): Promise<RestaurantRow | null> {
    const res = await query<RestaurantRow>(
      `SELECT * FROM resto_v2.restaurants WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async getSettings(restaurantId: string): Promise<RestaurantSettingsRow | null> {
    const res = await query<RestaurantSettingsRow>(
      `SELECT * FROM resto_v2.restaurant_settings WHERE restaurant_id = $1 LIMIT 1;`,
      [restaurantId]
    );
    return res.rows[0] || null;
  }

  public async updateSettings(
    restaurantId: string,
    updates: Partial<RestaurantSettingsRow> & {
      wifiSsid?: string;
      wifiPassword?: string;
      taxPercentage?: number;
      serviceChargePercentage?: number;
    }
  ): Promise<any> {
    // 1. Update restaurant metadata if wifi/tax provided
    if (
      updates.wifiSsid !== undefined ||
      updates.wifiPassword !== undefined ||
      updates.taxPercentage !== undefined ||
      updates.serviceChargePercentage !== undefined
    ) {
      await query(
        `UPDATE resto_v2.restaurants
         SET wifi_ssid = COALESCE($2, wifi_ssid),
             wifi_password = COALESCE($3, wifi_password),
             tax_percentage = COALESCE($4, tax_percentage),
             service_charge_percentage = COALESCE($5, service_charge_percentage),
             updated_at = clock_timestamp()
         WHERE id = $1;`,
        [
          restaurantId,
          updates.wifiSsid ?? null,
          updates.wifiPassword ?? null,
          updates.taxPercentage ?? null,
          updates.serviceChargePercentage ?? null,
        ]
      );
    }

    // 2. Update restaurant settings
    const openingHoursJson = updates.opening_hours ? JSON.stringify(updates.opening_hours) : null;
    await query(
      `UPDATE resto_v2.restaurant_settings
       SET opening_hours = COALESCE($2::jsonb, opening_hours),
           online_ordering_enabled = COALESCE($3, online_ordering_enabled),
           allow_table_orders = COALESCE($4, allow_table_orders),
           auto_accept_orders = COALESCE($5, auto_accept_orders),
           sound_notifications = COALESCE($6, sound_notifications),
           notification_sound = COALESCE($7, notification_sound),
           updated_at = clock_timestamp()
       WHERE restaurant_id = $1;`,
      [
        restaurantId,
        openingHoursJson,
        updates.online_ordering_enabled ?? null,
        updates.allow_table_orders ?? null,
        updates.auto_accept_orders ?? null,
        updates.sound_notifications ?? null,
        updates.notification_sound ?? null,
      ]
    );

    return this.getSettings(restaurantId);
  }
}
