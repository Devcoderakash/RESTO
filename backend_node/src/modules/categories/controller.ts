import { Request, Response, NextFunction } from 'express';
import { getParam } from '../../utils/params.js';
import { CategoryService } from './service.js';

const service = new CategoryService();

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const categories = await service.listCategories(restaurantId);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const { name, description, sort_order, sortOrder } = req.body;
    const category = await service.createCategory(restaurantId, {
      name,
      description,
      sortOrder: sortOrder ?? sort_order,
    });
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const category = await service.updateCategory(id, req.body);
    res.json({ category });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const result = await service.deleteCategory(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
