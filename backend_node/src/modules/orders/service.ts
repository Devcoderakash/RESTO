import { randomUUID } from 'crypto';
import { withTransaction } from '../../database/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { MenuItemRepository } from '../menu/repository.js';
import { OutboxService } from '../realtime/OutboxService.js';
import { TableRepository } from '../tables/repository.js';
import { OrderItemRow, OrderRepository, OrderRow } from './repository.js';

export class OrderService {
  constructor(
    private readonly orderRepo = new OrderRepository(),
    private readonly menuRepo = new MenuItemRepository(),
    private readonly tableRepo = new TableRepository(),
    private readonly outbox = OutboxService.getInstance()
  ) {}

  public async listOrders(
    restaurantId: string,
    filters?: { status?: string; tableId?: string; limit?: number }
  ) {
    const orders = await this.orderRepo.listByRestaurant(restaurantId, filters);
    const result = [];
    for (const order of orders) {
      const items = await this.orderRepo.getOrderItems(order.id);
      result.push(this.formatOrder(order, items));
    }
    return result;
  }

  public async getOrderById(id: string) {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundError(`Order '${id}' not found`);
    const items = await this.orderRepo.getOrderItems(order.id);
    return this.formatOrder(order, items);
  }

  public async createOrder(data: {
    restaurantId: string;
    tableNumber: string;
    customerName: string;
    customerPhone?: string;
    items: Array<{ id: string; quantity: number; notes?: string }>;
    specialInstructions?: string;
    idempotencyKey?: string;
  }) {
    const { restaurantId, tableNumber, customerName, items, specialInstructions, idempotencyKey } = data;

    if (!restaurantId || !tableNumber || !customerName) {
      throw new BadRequestError('restaurantId, tableNumber, and customerName are required');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Order must contain at least one item');
    }

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existing = await this.orderRepo.findByIdempotencyKey(restaurantId, idempotencyKey);
      if (existing) {
        const orderItems = await this.orderRepo.getOrderItems(existing.id);
        const formatted = this.formatOrder(existing, orderItems);
        return {
          order: formatted,
          trackingToken: existing.tracking_token || '',
          idempotentReplay: true,
        };
      }
    }

    // 2. Fetch canonical items and compute prices server-side
    let subtotal = 0;
    const computedItems: Array<{
      id: string;
      orderId: string;
      menuItemId: string;
      itemName: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
      notes?: string;
    }> = [];

    const orderId = `ord-${Date.now()}-${randomUUID().substring(0, 6)}`;
    const trackingToken = `trk-${randomUUID()}`;
    const orderNumber = `ORD-${Date.now().toString().slice(-4)}`;

    for (let i = 0; i < items.length; i++) {
      const requested = items[i];
      const menuItem = await this.menuRepo.findById(requested.id);
      if (!menuItem) {
        throw new BadRequestError(`Menu item '${requested.id}' not found`);
      }
      if (!menuItem.is_available) {
        throw new BadRequestError(`Menu item '${menuItem.name}' is currently unavailable`);
      }

      const quantity = Math.max(1, Number(requested.quantity) || 1);
      const unitPrice = Number(menuItem.price);
      const totalPrice = Number((unitPrice * quantity).toFixed(2));
      subtotal += totalPrice;

      computedItems.push({
        id: `itm-${orderId}-${i + 1}`,
        orderId,
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        unitPrice,
        quantity,
        totalPrice,
        notes: requested.notes,
      });
    }

    // 3. Exact 5% GST Calculation (2.5% CGST + 2.5% SGST)
    subtotal = Number(subtotal.toFixed(2));
    const tax = Number((subtotal * 0.05).toFixed(2));
    const serviceCharge = 0.0;
    const total = Number((subtotal + tax + serviceCharge).toFixed(2));

    // 4. Resolve table ID if available
    const table = await this.tableRepo.findByTableNumber(restaurantId, tableNumber);

    // 5. Execute atomic transaction
    const { orderRow, itemRows } = await withTransaction(async (client) => {
      const insertedOrder = await this.orderRepo.insertOrderInTx(client, {
        id: orderId,
        restaurantId,
        orderNumber,
        tableId: table?.id,
        tableNumber,
        customerName,
        customerPhone: data.customerPhone,
        subtotal,
        tax,
        serviceCharge,
        total,
        specialInstructions,
        idempotencyKey,
        trackingToken,
      });

      const insertedItems = await this.orderRepo.insertOrderItemsInTx(client, computedItems);

      // If table found and available, set occupied
      if (table && table.status === 'available') {
        await client.query(
          `UPDATE resto_v2.restaurant_tables SET status = 'occupied', updated_at = clock_timestamp() WHERE id = $1;`,
          [table.id]
        );
      }

      return { orderRow: insertedOrder, itemRows: insertedItems };
    });

    const formattedOrder = this.formatOrder(orderRow, itemRows);

    // 6. Outbox Realtime Notifications
    await this.outbox.publishEvent(undefined, {
      restaurantId,
      eventType: 'order:created',
      entityType: 'order',
      entityId: orderId,
      payload: formattedOrder,
    });

    await this.outbox.publishEvent(undefined, {
      restaurantId,
      eventType: 'order.updated',
      entityType: 'order',
      entityId: orderId,
      payload: formattedOrder,
    });

    return {
      order: formattedOrder,
      trackingToken,
    };
  }

  public async updateOrderStatus(id: string, newStatus: string) {
    const existing = await this.orderRepo.findById(id);
    if (!existing) throw new NotFoundError(`Order '${id}' not found`);

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestError(`Invalid order status '${newStatus}'. Allowed: ${validStatuses.join(', ')}`);
    }

    // State machine check
    this.assertValidTransition(existing.status, newStatus as any);

    const updated = await this.orderRepo.updateStatus(id, newStatus as any);
    const items = await this.orderRepo.getOrderItems(id);
    const formatted = this.formatOrder(updated!, items);

    // If order is completed or cancelled, check table auto-release
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      const activeCount = await this.orderRepo.countActiveOrdersForTable(existing.restaurant_id, existing.table_number, id);
      if (activeCount === 0 && existing.table_id) {
        await this.tableRepo.updateStatus(existing.table_id, 'available');
        await this.outbox.publishEvent(undefined, {
          restaurantId: existing.restaurant_id,
          eventType: 'table:released',
          entityType: 'table',
          entityId: existing.table_id,
          payload: { tableId: existing.table_id, tableNumber: existing.table_number, status: 'available' },
        });
      }
    }

    // Publish realtime status update events
    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'order:status_updated',
      entityType: 'order',
      entityId: id,
      payload: formatted,
    });

    await this.outbox.publishEvent(undefined, {
      restaurantId: existing.restaurant_id,
      eventType: 'order.updated',
      entityType: 'order',
      entityId: id,
      payload: formatted,
    });

    return formatted;
  }

  public async getOrderTracking(id: string) {
    const order = await this.getOrderById(id);
    const table = order.tableId ? await this.tableRepo.findById(order.tableId) : null;

    const timeline = [
      { status: 'pending', label: 'Order Received', completed: true, time: order.createdAt },
      { status: 'confirmed', label: 'Order Confirmed', completed: ['confirmed', 'preparing', 'ready', 'delivered', 'completed'].includes(order.status) },
      { status: 'preparing', label: 'Kitchen Preparing', completed: ['preparing', 'ready', 'delivered', 'completed'].includes(order.status) },
      { status: 'ready', label: 'Ready to Serve', completed: ['ready', 'delivered', 'completed'].includes(order.status) },
      { status: 'delivered', label: 'Delivered to Table', completed: ['delivered', 'completed'].includes(order.status) },
      { status: 'completed', label: 'Completed', completed: order.status === 'completed' },
    ];

    return {
      order,
      table: table ? { id: table.id, tableNumber: table.table_number, status: table.status } : null,
      timeline,
    };
  }

  private assertValidTransition(from: string, to: string) {
    if (from === to) return;
    if (from === 'completed' || from === 'cancelled') {
      throw new BadRequestError(`Cannot transition order from terminal state '${from}' to '${to}'`);
    }

    const allowedTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'preparing', 'cancelled'],
      confirmed: ['preparing', 'ready', 'cancelled'],
      preparing: ['ready', 'delivered', 'cancelled'],
      ready: ['delivered', 'completed', 'cancelled'],
      delivered: ['completed', 'cancelled'],
    };

    if (!allowedTransitions[from]?.includes(to)) {
      throw new BadRequestError(`Invalid state transition from '${from}' to '${to}'`);
    }
  }

  private formatOrder(order: OrderRow, items: OrderItemRow[]) {
    const subtotal = Number(order.subtotal);
    const tax = Number(order.tax);
    const serviceCharge = Number(order.service_charge);
    const total = Number(order.total);

    return {
      id: order.id,
      restaurantId: order.restaurant_id,
      restaurant_id: order.restaurant_id,
      orderNumber: order.order_number,
      order_number: order.order_number,
      tableId: order.table_id,
      table_id: order.table_id,
      tableNumber: order.table_number,
      table_number: order.table_number,
      customerName: order.customer_name,
      customer_name: order.customer_name,
      customerPhone: order.customer_phone,
      customer_phone: order.customer_phone,
      status: order.status,
      subtotal,
      tax,
      cgst: Number((subtotal * 0.025).toFixed(2)),
      sgst: Number((subtotal * 0.025).toFixed(2)),
      serviceCharge,
      service_charge: serviceCharge,
      total,
      totalAmount: total,
      total_amount: total,
      specialInstructions: order.special_instructions,
      special_instructions: order.special_instructions,
      trackingToken: order.tracking_token,
      items: items.map((i) => ({
        id: i.id,
        menuItemId: i.menu_item_id,
        menu_item_id: i.menu_item_id,
        name: i.item_name,
        itemName: i.item_name,
        item_name: i.item_name,
        unitPrice: Number(i.unit_price),
        unit_price: Number(i.unit_price),
        quantity: Number(i.quantity),
        totalPrice: Number(i.total_price),
        total_price: Number(i.total_price),
        notes: i.notes,
      })),
      createdAt: order.created_at,
      created_at: order.created_at,
      updatedAt: order.updated_at,
      updated_at: order.updated_at,
    };
  }
}
