import { Request, Response, NextFunction } from 'express';
import { getParam } from '../../utils/params.js';
import { TableService } from './service.js';

const service = new TableService();

export async function listTables(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const tables = await service.listTables(restaurantId);
    res.json({ tables });
  } catch (error) {
    next(error);
  }
}

export async function getTableById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const table = await service.getTableById(id);
    res.json({ table });
  } catch (error) {
    next(error);
  }
}

export async function createTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.staff?.restaurantId || req.restaurantId || 'rest-olive-ember-01';
    const tableNumber = req.body.table_number || req.body.tableNumber;
    const capacity = req.body.capacity;
    const qrCodeUrl = req.body.qr_code || req.body.qrCodeUrl;

    const table = await service.createTable(restaurantId, { tableNumber, capacity, qrCodeUrl });
    res.status(201).json({ table });
  } catch (error) {
    next(error);
  }
}

export async function updateTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const table = await service.updateTable(id, req.body);
    res.json({ table });
  } catch (error) {
    next(error);
  }
}

export async function updateTableStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const { status } = req.body;
    const table = await service.updateStatus(id, status);
    res.json({ table });
  } catch (error) {
    next(error);
  }
}

export async function deleteTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const result = await service.deleteTable(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.restaurantId || 'rest-olive-ember-01';
    const tables = await service.getAvailability(restaurantId);
    res.json({ tables });
  } catch (error) {
    next(error);
  }
}
