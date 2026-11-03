import { Request, Response, NextFunction } from 'express';
import { getParam } from '../../utils/params.js';
import { RestaurantService } from './service.js';

const service = new RestaurantService();

export async function getRestaurantInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slug = (req.query.slug as string) || req.restaurantSlug || 'olive-and-ember';
    const data = await service.getBySlug(slug);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getRestaurantBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slug = getParam(req.params.slug);
    const data = await service.getBySlug(slug);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getStaffSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const data = await service.getStaffSettings(restaurantId);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function updateRestaurantSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const result = await service.updateSettings(restaurantId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
