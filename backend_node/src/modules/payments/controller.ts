import { Request, Response, NextFunction } from 'express';
import { getParam } from '../../utils/params.js';
import { PaymentService } from './service.js';

const service = new PaymentService();

export async function listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const payments = await service.listPayments(restaurantId);
    res.json({ payments });
  } catch (error) {
    next(error);
  }
}

export async function createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const orderId = req.body.order_id || req.body.orderId;
    const amount = req.body.amount;
    const paymentMethod = req.body.payment_method || req.body.paymentMethod;
    const transactionReference = req.body.transaction_reference || req.body.transactionReference;

    const payment = await service.createPayment({
      restaurantId,
      orderId,
      amount,
      paymentMethod,
      transactionReference,
    });
    res.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
}

export async function updatePaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const { status } = req.body;
    const payment = await service.updateStatus(id, status);
    res.json({ payment });
  } catch (error) {
    next(error);
  }
}
