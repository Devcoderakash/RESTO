import { randomUUID } from 'crypto';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { OutboxService } from '../realtime/OutboxService.js';
import { TableRepository, TableRow } from './repository.js';

export class TableService {
  constructor(
    private readonly repo = new TableRepository(),
    private readonly outbox = OutboxService.getInstance()
  ) {}

  public async listTables(restaurantId: string) {
    const rows = await this.repo.listByRestaurant(restaurantId);
    return rows.map((r) => this.formatTable(r));
  }

  public async getTableById(id: string) {
    const table = await this.repo.findById(id);
    if (!table) {
      throw new NotFoundError(`Table '${id}' not found`);
    }
    return this.formatTable(table);
  }

  public async createTable(restaurantId: string, data: { tableNumber: string; capacity: number; qrCodeUrl?: string }) {
    if (!data.tableNumber || !data.capacity) {
      throw new BadRequestError('Table number and capacity are required');
    }

    const existing = await this.repo.findByTableNumber(restaurantId, data.tableNumber);
    if (existing) {
      throw new BadRequestError(`Table number '${data.tableNumber}' already exists in this restaurant`);
    }

    const id = `tbl-${randomUUID().substring(0, 12)}`;
    const created = await this.repo.create({
      id,
      restaurantId,
      tableNumber: data.tableNumber,
      capacity: Number(data.capacity),
      qrCodeUrl: data.qrCodeUrl,
    });

    const formatted = this.formatTable(created);
    await this.outbox.publishEvent(undefined, {
      restaurantId,
      eventType: 'table:created',
      entityType: 'table',
      entityId: id,
      payload: formatted,
    });

    return formatted;
  }

  public async updateTable(id: string, updates: any) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Table '${id}' not found`);
    }

    const tableNumber = updates.tableNumber || updates.table_number;
    const capacity = updates.capacity ? Number(updates.capacity) : undefined;
    const status = updates.status;
    const qrCodeUrl = updates.qrCodeUrl || updates.qr_code_url;

    const updated = await this.repo.update(id, {
      tableNumber,
      capacity,
      status,
      qrCodeUrl,
    });

    const formatted = this.formatTable(updated!);
    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'table:updated',
      entityType: 'table',
      entityId: id,
      payload: formatted,
    });

    return formatted;
  }

  public async updateStatus(id: string, status: any) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Table '${id}' not found`);
    }

    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid table status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updated = await this.repo.updateStatus(id, status);
    const formatted = this.formatTable(updated!);

    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'table:status_changed',
      entityType: 'table',
      entityId: id,
      payload: formatted,
    });

    return formatted;
  }

  public async deleteTable(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Table '${id}' not found`);
    }

    await this.repo.softDelete(id);
    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'table:deleted',
      entityType: 'table',
      entityId: id,
      payload: { id, tableNumber: existing.table_number },
    });

    return { success: true };
  }

  public async getAvailability(restaurantId: string) {
    const tables = await this.listTables(restaurantId);
    return tables.map((t) => ({
      id: t.id,
      tableNumber: t.tableNumber,
      table_number: t.table_number,
      capacity: t.capacity,
      status: t.status,
    }));
  }

  private formatTable(r: TableRow) {
    return {
      id: r.id,
      restaurantId: r.restaurant_id,
      restaurant_id: r.restaurant_id,
      tableNumber: r.table_number,
      table_number: r.table_number,
      capacity: Number(r.capacity),
      status: r.status,
      qrCodeUrl: r.qr_code_url,
      qr_code_url: r.qr_code_url,
      isActive: r.is_active,
      is_active: r.is_active,
      createdAt: r.created_at,
      created_at: r.created_at,
    };
  }
}
