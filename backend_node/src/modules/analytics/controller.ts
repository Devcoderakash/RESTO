import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './service.js';

const service = new AnalyticsService();

export async function getLiveness(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getLiveness();
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getReadiness(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getReadiness();
    res.status(result.statusCode).json(result.payload);
  } catch (error) {
    next(error);
  }
}

export async function getDiagnostics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getHealthDiagnostics();
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getDashboardOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const overview = await service.getDashboardOverview(restaurantId);
    res.json(overview);
  } catch (error) {
    next(error);
  }
}

export async function getDailySales(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const sales = await service.getDailySales(restaurantId);
    res.json(sales);
  } catch (error) {
    next(error);
  }
}

export async function getRecentOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const orders = await service.getRecentOrders(restaurantId, limit);
    res.json(orders);
  } catch (error) {
    next(error);
  }
}
