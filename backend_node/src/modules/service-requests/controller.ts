import { Request, Response, NextFunction } from 'express';
import { getParam } from '../../utils/params.js';
import { ServiceRequestService } from './service.js';

const service = new ServiceRequestService();

export async function listServiceRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const requests = await service.listRequests(restaurantId);
    res.json({ requests });
  } catch (error) {
    next(error);
  }
}

export async function createServiceRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.body.restaurant_id || req.body.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const tableNumber = req.body.table_number || req.body.tableNumber;
    const requestType = req.body.request_type || req.body.requestType || req.body.type || 'waiter';
    const message = req.body.message || req.body.details;
    const orderId = req.body.order_id || req.body.orderId;
    const paymentPreference = req.body.payment_preference || req.body.paymentPreference;

    const request = await service.createRequest({
      restaurantId,
      tableNumber,
      requestType,
      message,
      orderId,
      paymentPreference,
    });

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
}

export async function updateServiceRequestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const { status } = req.body;
    const request = await service.updateStatus(id, status);
    res.json({ request });
  } catch (error) {
    next(error);
  }
}
