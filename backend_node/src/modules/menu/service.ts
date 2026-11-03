import { randomUUID } from 'crypto';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { CategoryRepository } from '../categories/repository.js';
import { OutboxService } from '../realtime/OutboxService.js';
import { MenuItemRepository, MenuItemRow } from './repository.js';

export class MenuService {
  constructor(
    private readonly menuRepo = new MenuItemRepository(),
    private readonly categoryRepo = new CategoryRepository(),
    private readonly outbox = OutboxService.getInstance()
  ) {}

  public async getPublicMenu(restaurantId: string) {
    const categories = await this.categoryRepo.listByRestaurant(restaurantId);
    const items = await this.menuRepo.listByRestaurant(restaurantId);

    const formattedCategories = categories
      .filter((c) => c.is_visible)
      .map((cat) => {
        const catItems = items
          .filter((i) => i.category_id === cat.id && (i.available ?? true))
          .map((i) => this.formatItem(i));
        return {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          items: catItems,
        };
      });

    return { categories: formattedCategories };
  }

  public async getStaffMenu(restaurantId: string) {
    const categories = await this.categoryRepo.listByRestaurant(restaurantId);
    const items = await this.menuRepo.listByRestaurant(restaurantId);

    return {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        sortOrder: Number(c.sort_order),
        sort_order: Number(c.sort_order),
        isVisible: c.is_visible,
        is_visible: c.is_visible,
      })),
      items: items.map((i) => this.formatItem(i)),
    };
  }

  public async getMenuItemById(id: string) {
    const item = await this.menuRepo.findById(id);
    if (!item) throw new NotFoundError(`Menu item '${id}' not found`);
    return this.formatItem(item);
  }

  public async createMenuItem(restaurantId: string, data: any) {
    const name = data.name;
    const categoryId = data.category_id || data.categoryId;
    const price = Number(data.price);

    if (!name || !categoryId || isNaN(price)) {
      throw new BadRequestError('Name, category_id, and price are required');
    }

    const id = `item-${randomUUID().substring(0, 12)}`;
    const isVeg = data.is_vegetarian ?? data.isVegetarian ?? (data.food_type === 'non_veg' ? false : true);
    const isAvail = data.is_available ?? data.isAvailable ?? data.available ?? true;
    const foodType = data.food_type || (isVeg ? 'veg' : 'non_veg');

    const created = await this.menuRepo.create({
      id,
      restaurantId,
      categoryId,
      name,
      description: data.description,
      price,
      imageUrl: data.image_url || data.imageUrl,
      foodType,
      isVegetarian: isVeg,
      available: isAvail,
    });

    const formatted = this.formatItem(created);
    await this.outbox.publishEvent(undefined, {
      restaurantId,
      eventType: 'menu:item_created',
      entityType: 'menu_item',
      entityId: id,
      payload: formatted,
    });

    return formatted;
  }

  public async updateMenuItem(id: string, updates: any) {
    const existing = await this.menuRepo.findById(id);
    if (!existing) throw new NotFoundError(`Menu item '${id}' not found`);

    const isVeg = updates.is_vegetarian ?? updates.isVegetarian;
    const isAvail = updates.is_available ?? updates.isAvailable ?? updates.available;
    const foodType = updates.food_type ?? (isVeg !== undefined ? (isVeg ? 'veg' : 'non_veg') : undefined);

    const updated = await this.menuRepo.update(id, {
      name: updates.name,
      description: updates.description,
      price: updates.price !== undefined ? Number(updates.price) : undefined,
      categoryId: updates.category_id || updates.categoryId,
      imageUrl: updates.image_url || updates.imageUrl,
      foodType,
      isVegetarian: isVeg,
      available: isAvail,
    });

    const formatted = this.formatItem(updated!);
    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'menu:item_updated',
      entityType: 'menu_item',
      entityId: id,
      payload: formatted,
    });

    return formatted;
  }

  public async toggleAvailability(id: string, isAvailable: boolean) {
    const existing = await this.menuRepo.findById(id);
    if (!existing) throw new NotFoundError(`Menu item '${id}' not found`);

    const updated = await this.menuRepo.setAvailability(id, isAvailable);
    const formatted = this.formatItem(updated!);

    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'menu:item_availability_changed',
      entityType: 'menu_item',
      entityId: id,
      payload: formatted,
    });

    return formatted;
  }

  public async deleteMenuItem(id: string) {
    const existing = await this.menuRepo.findById(id);
    if (!existing) throw new NotFoundError(`Menu item '${id}' not found`);

    await this.menuRepo.delete(id);
    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'menu:item_deleted',
      entityType: 'menu_item',
      entityId: id,
      payload: { id },
    });

    return { success: true };
  }

  private formatItem(i: MenuItemRow) {
    const priceNum = Number(i.price);
    const isVeg = i.food_type === 'veg';
    const isAvail = i.available ?? true;
    return {
      id: i.id,
      restaurantId: i.restaurant_id,
      restaurant_id: i.restaurant_id,
      categoryId: i.category_id,
      category_id: i.category_id,
      name: i.name,
      description: i.description || '',
      price: priceNum,
      imageUrl: i.image_url || '',
      image_url: i.image_url || '',
      foodType: i.food_type || 'veg',
      food_type: i.food_type || 'veg',
      isVegetarian: isVeg,
      is_vegetarian: isVeg,
      available: isAvail,
      isAvailable: isAvail,
      is_available: isAvail,
      popular: i.popular ?? false,
      chefSpecial: i.chef_special ?? false,
      chef_special: i.chef_special ?? false,
      spicinessLevel: (i as any).spiciness_level ?? 0,
      spiciness_level: (i as any).spiciness_level ?? 0,
      preparationTimeMinutes: i.preparation_time_minutes ?? 15,
      preparation_time_minutes: i.preparation_time_minutes ?? 15,
      allergens: i.allergens || [],
      dietaryTags: i.dietary_tags || [],
      dietary_tags: i.dietary_tags || [],
      createdAt: i.created_at,
      created_at: i.created_at,
    };
  }
}

