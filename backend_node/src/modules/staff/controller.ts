import { Request, Response, NextFunction } from 'express';
import { getParam } from '../../utils/params.js';
import { StaffService } from './service.js';

const service = new StaffService();

export async function listStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const staff = await service.listStaff(restaurantId);
    res.json({ staff });
  } catch (error) {
    next(error);
  }
}

export async function createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const staff = await service.createStaff(restaurantId, req.body);
    res.status(201).json({ staff });
  } catch (error) {
    next(error);
  }
}

export async function updateStaffStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const isActive = req.body.is_active ?? req.body.isActive;
    const staff = await service.updateStatus(id, Boolean(isActive));
    res.json({ staff });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const authData = await service.login(email, password);
    res.json(authData);
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const staffId = req.staff?.id || 'staff-manager-01';
    const user = await service.getMe(staffId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}
