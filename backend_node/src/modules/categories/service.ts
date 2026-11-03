import { randomUUID } from 'crypto';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { OutboxService } from '../realtime/OutboxService.js';
import { CategoryRepository, CategoryRow } from './repository.js';

export class CategoryService {
  constructor(
    private readonly repo = new CategoryRepository(),
    private readonly outbox = OutboxService.getInstance()
  ) {}

  public async listCategories(restaurantId: string) {
    const rows = await this.repo.listByRestaurant(restaurantId);
    return rows.map((r) => this.formatCategory(r));
  }

  public async getCategoryById(id: string) {
    const cat = await this.repo.findById(id);
    if (!cat) throw new NotFoundError(`Category '${id}' not found`);
    return this.formatCategory(cat);
  }

  public async createCategory(restaurantId: string, data: { name: string; description?: string; sortOrder?: number }) {
    if (!data.name) throw new BadRequestError('Category name is required');
    const id = `cat-${randomUUID().substring(0, 12)}`;
    const created = await this.repo.create({
      id,
      restaurantId,
      name: data.name,
      description: data.description,
      sortOrder: data.sortOrder,
    });
    const formatted = this.formatCategory(created);
    await this.outbox.publishEvent(undefined, {
      restaurantId,
      eventType: 'category:created',
      entityType: 'category',
      entityId: id,
      payload: formatted,
    });
    return formatted;
  }

  public async updateCategory(id: string, updates: any) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Category '${id}' not found`);

    const updated = await this.repo.update(id, {
      name: updates.name,
      description: updates.description,
      sortOrder: updates.sortOrder ?? updates.sort_order,
      isVisible: updates.isVisible ?? updates.is_visible,
    });
    const formatted = this.formatCategory(updated!);
    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'category:updated',
      entityType: 'category',
      entityId: id,
      payload: formatted,
    });
    return formatted;
  }

  public async deleteCategory(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Category '${id}' not found`);

    await this.repo.delete(id);
    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'category:deleted',
      entityType: 'category',
      entityId: id,
      payload: { id },
    });
    return { success: true };
  }

  private formatCategory(r: CategoryRow) {
    return {
      id: r.id,
      restaurantId: r.restaurant_id,
      restaurant_id: r.restaurant_id,
      name: r.name,
      description: r.description,
      sortOrder: Number(r.sort_order),
      sort_order: Number(r.sort_order),
      isVisible: r.is_visible,
      is_visible: r.is_visible,
      createdAt: r.created_at,
      created_at: r.created_at,
    };
  }
}

