import { Request, Response, NextFunction } from 'express';
import { getParam } from '../../utils/params.js';
import { OrderService } from './service.js';

const service = new OrderService();

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const status = req.query.status as string;
    const tableId = req.query.tableId as string;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const orders = await service.listOrders(restaurantId, { status, tableId, limit });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const order = await service.getOrderById(id);
    res.json({ order });
  } catch (error) {
    next(error);
  }
}

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.body.restaurant_id || req.body.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const tableNumber = req.body.table_number || req.body.tableNumber;
    const customerName = req.body.customer_name || req.body.customerName;
    const customerPhone = req.body.customer_phone || req.body.customerPhone;
    const items = req.body.items;
    const specialInstructions = req.body.special_instructions || req.body.specialInstructions;
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotency_key || req.body.idempotencyKey;

    const result = await service.createOrder({
      restaurantId,
      tableNumber,
      customerName,
      customerPhone,
      items,
      specialInstructions,
      idempotencyKey,
    });

    res.status(result.idempotentReplay ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const { status } = req.body;
    const order = await service.updateOrderStatus(id, status);
    res.json({ order });
  } catch (error) {
    next(error);
  }
}

export async function getOrderTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const tracking = await service.getOrderTracking(id);
    res.json(tracking);
  } catch (error) {
    next(error);
  }
}
