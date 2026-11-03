import { randomUUID } from 'crypto';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { OutboxService } from '../realtime/OutboxService.js';
import { TableRepository } from '../tables/repository.js';
import { ServiceRequestRepository, ServiceRequestRow } from './repository.js';

export class ServiceRequestService {
  constructor(
    private readonly repo = new ServiceRequestRepository(),
    private readonly tableRepo = new TableRepository(),
    private readonly outbox = OutboxService.getInstance()
  ) {}

  public async listRequests(restaurantId: string) {
    const rows = await this.repo.listByRestaurant(restaurantId);
    return rows.map((r) => this.formatRequest(r));
  }

  public async getRequestById(id: string) {
    const req = await this.repo.findById(id);
    if (!req) throw new NotFoundError(`Service request '${id}' not found`);
    return this.formatRequest(req);
  }

  public async createRequest(data: {
    restaurantId: string;
    tableNumber: string;
    requestType: any;
    orderId?: string;
    message?: string;
    paymentPreference?: string;
  }) {
    const { restaurantId, tableNumber, requestType, orderId, message, paymentPreference } = data;

    if (!restaurantId || !tableNumber || !requestType) {
      throw new BadRequestError('restaurantId, tableNumber, and requestType are required');
    }

    const table = await this.tableRepo.findByTableNumber(restaurantId, tableNumber);
    const id = `req-${randomUUID().substring(0, 12)}`;

    const created = await this.repo.create({
      id,
      restaurantId,
      tableId: table?.id,
      tableNumber,
      requestType,
      orderId,
      message,
      paymentPreference,
    });

    const formatted = this.formatRequest(created);
    await this.outbox.publishEvent(undefined, {
      restaurantId,
      eventType: 'service_request:created',
      entityType: 'service_request',
      entityId: id,
      payload: formatted,
    });

    return formatted;
  }

  public async updateStatus(id: string, status: any) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Service request '${id}' not found`);

    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updated = await this.repo.updateStatus(id, status);
    const formatted = this.formatRequest(updated!);

    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'service_request:updated',
      entityType: 'service_request',
      entityId: id,
      payload: formatted,
    });

    return formatted;
  }

  private formatRequest(r: ServiceRequestRow) {
    return {
      id: r.id,
      restaurantId: r.restaurant_id,
      restaurant_id: r.restaurant_id,
      tableId: r.table_id,
      table_id: r.table_id,
      tableNumber: r.table_number,
      table_number: r.table_number,
      requestType: r.request_type,
      request_type: r.request_type,
      type: r.request_type,
      status: r.status,
      orderId: r.order_id,
      order_id: r.order_id,
      message: r.message,
      details: r.message,
      paymentPreference: r.payment_preference,
      payment_preference: r.payment_preference,
      createdAt: r.created_at,
      created_at: r.created_at,
      time: r.created_at,
      resolvedAt: r.resolved_at,
      resolved_at: r.resolved_at,
    };
  }
}
