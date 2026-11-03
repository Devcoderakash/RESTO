import { NotFoundError } from '../../utils/errors.js';
import { RestaurantRepository } from './repository.js';

export class RestaurantService {
  constructor(private readonly repo = new RestaurantRepository()) {}

  public async getBySlug(slug: string) {
    const restaurant = await this.repo.findBySlug(slug);
    if (!restaurant) {
      throw new NotFoundError(`Restaurant with slug '${slug}' not found`);
    }
    return this.formatRestaurant(restaurant);
  }

  public async getById(id: string) {
    const restaurant = await this.repo.findById(id);
    if (!restaurant) {
      throw new NotFoundError(`Restaurant not found`);
    }
    return this.formatRestaurant(restaurant);
  }

  public async getStaffSettings(restaurantId: string) {
    const restaurant = await this.repo.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }
    const settings = (await this.repo.getSettings(restaurantId)) || {
      id: 'default-settings',
      restaurant_id: restaurantId,
      opening_hours: {},
      online_ordering_enabled: true,
      allow_table_orders: true,
      auto_accept_orders: false,
      sound_notifications: true,
      notification_sound: 'chime',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      description: restaurant.description,
      address: restaurant.address,
      phone: restaurant.phone,
      email: restaurant.email,
      wifi_ssid: restaurant.wifi_ssid,
      wifi_password: restaurant.wifi_password,
      tax_percentage: Number(restaurant.tax_percentage),
      service_charge: Number(restaurant.service_charge_percentage),
      service_charge_percentage: Number(restaurant.service_charge_percentage),
      currency: restaurant.currency,
      opening_hours: settings.opening_hours,
      online_ordering_enabled: settings.online_ordering_enabled,
      allow_table_orders: settings.allow_table_orders,
      auto_accept_orders: settings.auto_accept_orders,
      sound_notifications: settings.sound_notifications,
      notification_sound: settings.notification_sound,
    };
  }

  public async updateSettings(restaurantId: string, payload: any) {
    const updated = await this.repo.updateSettings(restaurantId, {
      opening_hours: payload.openingHours || payload.opening_hours,
      online_ordering_enabled: payload.onlineOrderingEnabled ?? payload.online_ordering_enabled,
      allow_table_orders: payload.allowTableOrders ?? payload.allow_table_orders,
      auto_accept_orders: payload.autoAcceptOrders ?? payload.auto_accept_orders,
      sound_notifications: payload.soundNotifications ?? payload.sound_notifications,
      notification_sound: payload.notificationSound || payload.notification_sound,
      wifiSsid: payload.wifiSsid || payload.wifi_ssid,
      wifiPassword: payload.wifiPassword || payload.wifi_password,
      taxPercentage: payload.taxPercentage ?? payload.tax_percentage,
      serviceChargePercentage: payload.serviceCharge ?? payload.service_charge_percentage,
    });
    return {
      success: true,
      settings: updated,
    };
  }

  private formatRestaurant(r: any) {
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      address: r.address,
      phone: r.phone,
      email: r.email,
      wifi_ssid: r.wifi_ssid,
      wifi_password: r.wifi_password,
      wifiSsid: r.wifi_ssid,
      wifiPassword: r.wifi_password,
      tax_percentage: Number(r.tax_percentage),
      taxPercentage: Number(r.tax_percentage),
      service_charge_percentage: Number(r.service_charge_percentage),
      serviceChargePercentage: Number(r.service_charge_percentage),
      currency: r.currency,
      is_active: r.is_active,
      isActive: r.is_active,
    };
  }
}

