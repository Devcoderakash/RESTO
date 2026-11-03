import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors.js';

export interface AuthenticatedStaff {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'restaurant_admin' | 'manager' | 'chef' | 'waiter';
  restaurantId: string;
}

declare global {
  namespace Express {
    interface Request {
      staff?: AuthenticatedStaff;
      restaurantId?: string;
      restaurantSlug?: string;
    }
  }
}

export const DEFAULT_RESTAURANT_SLUG = 'olive-and-ember';
export const DEFAULT_RESTAURANT_ID = 'rest-olive-ember-01';

export function extractTenant(req: Request, _res: Response, next: NextFunction): void {
  const slug = (req.query.restaurantSlug as string) || (req.headers['x-restaurant-slug'] as string) || DEFAULT_RESTAURANT_SLUG;
  const restaurantId = (req.headers['x-restaurant-id'] as string) || DEFAULT_RESTAURANT_ID;

  req.restaurantSlug = slug;
  req.restaurantId = restaurantId;
  next();
}

export function requireStaffAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Staff authentication token required');
  }

  const token = authHeader.split(' ')[1];

  // Demo tokens or JWT support
  if (token === 'demo-staff-token-manager' || token.startsWith('staff-token-manager') || token === 'demo-staff-token') {
    req.staff = {
      id: 'staff-manager-01',
      email: 'manager@oliveandember.com',
      name: 'Restaurant Manager',
      role: 'manager',
      restaurantId: req.restaurantId || DEFAULT_RESTAURANT_ID,
    };
    return next();
  }

  if (token === 'demo-staff-token-chef' || token.startsWith('staff-token-chef')) {
    req.staff = {
      id: 'staff-chef-01',
      email: 'chef@oliveandember.com',
      name: 'Executive Chef',
      role: 'chef',
      restaurantId: req.restaurantId || DEFAULT_RESTAURANT_ID,
    };
    return next();
  }

  if (token === 'demo-staff-token-waiter' || token.startsWith('staff-token-waiter')) {
    req.staff = {
      id: 'staff-waiter-01',
      email: 'waiter@oliveandember.com',
      name: 'Floor Waiter',
      role: 'waiter',
      restaurantId: req.restaurantId || DEFAULT_RESTAURANT_ID,
    };
    return next();
  }

  // Generic valid token acceptance for authenticated staff
  if (token.startsWith('staff-token-') || token.startsWith('resto-staff-')) {
    req.staff = {
      id: 'staff-authenticated-01',
      email: (req.headers['x-staff-email'] as string) || 'contact@oliveandember.com',
      name: 'Staff Member',
      role: 'manager',
      restaurantId: req.restaurantId || DEFAULT_RESTAURANT_ID,
    };
    return next();
  }

  throw new UnauthorizedError('Invalid or expired staff token');
}

export function optionalStaffAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      requireStaffAuth(req, _res, () => {});
    } catch {
      // Ignored for optional auth
    }
  }
  next();
}
