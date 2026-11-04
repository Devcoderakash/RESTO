import { randomUUID } from 'crypto';
import { withTransaction } from '../../database/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { MenuItemRepository } from '../menu/repository.js';
import { OutboxService } from '../realtime/OutboxService.js';
import { TableRepository } from '../tables/repository.js';
import { OrderItemRow, OrderRepository, OrderRow } from './repository.js';

const CUSTOMER_STATUS_MAP: Record<string, string> = {
  pending: 'received',
  confirmed: 'accepted',
  preparing: 'preparing',
  ready: 'ready',
  served: 'served',
  completed: 'completed',
  cancelled: 'cancelled',
};

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
    items: Array<{
      id?: string;
      menuItemId?: string;
      menu_item_id?: string;
      quantity: number;
      notes?: string;
      specialInstructions?: string;
      special_instructions?: string;
    }>;
    specialInstructions?: string;
    idempotencyKey?: string;
  }) {
    const { restaurantId, tableNumber, items, specialInstructions, idempotencyKey } = data;
    const customerName = data.customerName?.trim() || `Guest Table ${tableNumber || '01'}`;

    if (!restaurantId || !tableNumber) {
      throw new BadRequestError('restaurantId and tableNumber are required');
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
          ...formatted,
          order: formatted,
          trackingToken: existing.tracking_token || '',
          accessToken: existing.tracking_token || '',
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
      foodType?: string;
      notes?: string;
    }> = [];

    const orderId = `ord-${Date.now()}-${randomUUID().substring(0, 6)}`;
    const trackingToken = `trk-${randomUUID()}`;
    const orderNumber = `ORD-${Date.now().toString().slice(-4)}`;

    for (let i = 0; i < items.length; i++) {
      const requested = items[i];
      const requestedId = requested.menuItemId || requested.id || requested.menu_item_id;
      if (!requestedId) {
        throw new BadRequestError('Menu item ID is required for each order item');
      }
      const menuItem = await this.menuRepo.findById(requestedId);
      if (!menuItem) {
        throw new BadRequestError(`Menu item '${requestedId}' not found`);
      }
      if (menuItem.available === false || (menuItem as any).is_available === false) {
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
        foodType: menuItem.food_type,
        notes: requested.specialInstructions || requested.notes || requested.special_instructions,
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
          `UPDATE resto_v2.restaurant_tables SET status = 'occupied' WHERE id = $1;`,
          [table.id]
        );
      }

      return { orderRow: insertedOrder, itemRows: insertedItems };
    });

    const formattedOrder = this.formatOrder(orderRow, itemRows);

    // 6. Outbox Realtime Notifications
    await this.outbox.publishEvent(undefined, {
      restaurantId,
      eventType: 'order.created',
      entityType: 'order',
      entityId: orderId,
      payload: formattedOrder,
    });

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
      ...formattedOrder,
      order: formattedOrder,
      trackingToken,
      accessToken: trackingToken,
      idempotentReplay: false,
    };
  }

  public async updateOrderStatus(id: string, newStatus: string) {
    const existing = await this.orderRepo.findById(id);
    if (!existing) throw new NotFoundError(`Order '${id}' not found`);

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestError(`Invalid order status '${newStatus}'. Allowed: ${validStatuses.join(', ')}`);
    }

    const mappedStatus = (newStatus === 'delivered' ? 'served' : newStatus) as any;

    // State machine check
    this.assertValidTransition(existing.status, mappedStatus);

    const updated = await this.orderRepo.updateStatus(id, mappedStatus);
    const items = await this.orderRepo.getOrderItems(id);
    const formatted = this.formatOrder({ ...updated!, status: (newStatus === 'delivered' ? 'delivered' : updated!.status) as any }, items);

    // If order is completed or cancelled, check table auto-release
    if (mappedStatus === 'completed' || mappedStatus === 'cancelled') {
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
    const customerStatus = CUSTOMER_STATUS_MAP[order.status] || order.status;

    const isServedOrDone = ['served', 'delivered', 'completed'].includes(order.status);
    const timeline = [
      { status: 'pending', label: 'Order Received', completed: true, time: order.createdAt },
      { status: 'confirmed', label: 'Order Confirmed', completed: ['confirmed', 'preparing', 'ready', 'served', 'delivered', 'completed'].includes(order.status) },
      { status: 'preparing', label: 'Kitchen Preparing', completed: ['preparing', 'ready', 'served', 'delivered', 'completed'].includes(order.status) },
      { status: 'ready', label: 'Ready to Serve', completed: ['ready', 'served', 'delivered', 'completed'].includes(order.status) },
      { status: 'delivered', label: 'Delivered to Table', completed: isServedOrDone },
      { status: 'completed', label: 'Completed', completed: order.status === 'completed' },
    ];

    return {
      ...order,
      status: customerStatus,
      orderStatus: order.status,
      estimatedTimeMinutes: 20,
      statusTimeline: [
        { stage: 'received', timestamp: order.createdAt },
        ...(order.status !== 'pending' ? [{ stage: customerStatus, timestamp: new Date().toISOString() }] : []),
      ],
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
      preparing: ['ready', 'served', 'delivered', 'cancelled'],
      ready: ['served', 'delivered', 'completed', 'cancelled'],
      served: ['completed', 'cancelled'],
      delivered: ['completed', 'cancelled'],
    };

    if (!allowedTransitions[from]?.includes(to)) {
      throw new BadRequestError(`Invalid state transition from '${from}' to '${to}'`);
    }
  }

  private formatOrder(order: OrderRow, items: OrderItemRow[]) {
    const subtotal = Number((order as any).subtotal || 0);
    const tax = Number((order as any).gst_total ?? (order as any).tax ?? 0);
    const serviceCharge = Number((order as any).service_charge || 0);
    const total = Number((order as any).final_total ?? (order as any).total ?? 0);
    const specialInstructions = (order as any).order_notes ?? (order as any).special_instructions ?? null;
    const trackingToken = (order as any).tracking_token ?? (order as any).tracking_token_hash ?? '';

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
      orderStatus: order.status,
      order_status: order.status,
      estimatedTimeMinutes: 20,
      breakdown: {
        subtotal,
        cgst: Number((order as any).cgst ?? (subtotal * 0.025).toFixed(2)),
        sgst: Number((order as any).sgst ?? (subtotal * 0.025).toFixed(2)),
        gstTotal: tax,
        serviceCharge,
        finalTotal: total,
      },
      statusTimeline: [
        { stage: 'received', timestamp: order.created_at },
        ...(order.status !== 'pending' ? [{ stage: CUSTOMER_STATUS_MAP[order.status] || order.status, timestamp: new Date().toISOString() }] : []),
      ],
      subtotal,
      tax,
      cgst: Number((order as any).cgst ?? (subtotal * 0.025).toFixed(2)),
      sgst: Number((order as any).sgst ?? (subtotal * 0.025).toFixed(2)),
      gst_total: tax,
      serviceCharge,
      service_charge: serviceCharge,
      total,
      finalTotal: total,
      final_total: total,
      totalAmount: total,
      total_amount: total,
      specialInstructions,
      special_instructions: specialInstructions,
      trackingToken,
      items: items.map((i) => {
        const isVeg = (i as any).food_type !== 'non_veg';
        return {
          id: i.id,
          cartItemId: i.id,
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
          notes: (i as any).special_instructions ?? (i as any).notes ?? null,
          food_type: (i as any).food_type || (isVeg ? 'veg' : 'non_veg'),
          foodType: (i as any).food_type || (isVeg ? 'veg' : 'non_veg'),
          isVegetarian: isVeg,
          is_vegetarian: isVeg,
          foodItem: {
            id: i.menu_item_id,
            name: i.item_name,
            description: '',
            price: Number(i.unit_price),
            category: '',
            image: '',
            isVegetarian: isVeg,
            is_vegetarian: isVeg,
            dietaryType: isVeg ? 'veg' : 'non-veg',
            isAvailable: true,
          },
        };
      }),
      createdAt: order.created_at,
      created_at: order.created_at,
      updatedAt: order.updated_at,
      updated_at: order.updated_at,
    };
  }
}

