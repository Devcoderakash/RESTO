import { Request, Response, NextFunction } from 'express';
import { getParam } from '../../utils/params.js';
import { MenuService } from './service.js';

const service = new MenuService();

export async function getPublicMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.restaurantId || 'rest-olive-ember-01';
    const data = await service.getPublicMenu(restaurantId);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getStaffMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const data = await service.getStaffMenu(restaurantId);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getMenuItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const item = await service.getMenuItemById(id);
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function createMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const item = await service.createMenuItem(restaurantId, req.body);
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
}

export async function updateMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const item = await service.updateMenuItem(id, req.body);
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function toggleAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const isAvailable = req.body.is_available ?? req.body.isAvailable;
    const item = await service.toggleAvailability(id, Boolean(isAvailable));
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function deleteMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const result = await service.deleteMenuItem(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
