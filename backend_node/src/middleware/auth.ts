import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import { verifyStaffToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

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
  const restaurantId = (req.headers['x-restaurant-id'] as string) || (req.query.restaurantId as string) || (req.query.restaurant_id as string) || DEFAULT_RESTAURANT_ID;

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

  const isDemoToken =
    token.startsWith('demo-staff-') ||
    token === 'demo-staff-token' ||
    token === 'demo-staff-token-manager' ||
    token === 'demo-staff-token-chef' ||
    token === 'demo-staff-token-waiter';

  // 1. Check if demo tokens are permitted via ALLOW_DEMO_AUTH
  if (isDemoToken) {
    if (!env.ALLOW_DEMO_AUTH) {
      logger.warn({ token: token.slice(0, 10) }, 'Rejected demo token in secure mode (ALLOW_DEMO_AUTH=false)');
      throw new UnauthorizedError('Demo authentication is strictly disabled. Cryptographically verified JWT required.');
    }

    // Explicit local development fallback only
    logger.debug({ token }, 'Permitting demo staff token in explicit development mode');
    if (token === 'demo-staff-token-chef') {
      req.staff = {
        id: 'staff-chef-01',
        email: 'chef@oliveandember.com',
        name: 'Executive Chef',
        role: 'chef',
        restaurantId: req.restaurantId || DEFAULT_RESTAURANT_ID,
      };
      return next();
    }
    if (token === 'demo-staff-token-waiter') {
      req.staff = {
        id: 'staff-waiter-01',
        email: 'waiter@oliveandember.com',
        name: 'Floor Waiter',
        role: 'waiter',
        restaurantId: req.restaurantId || DEFAULT_RESTAURANT_ID,
      };
      return next();
    }
    req.staff = {
      id: 'staff-manager-01',
      email: 'manager@oliveandember.com',
      name: 'Restaurant Manager',
      role: 'manager',
      restaurantId: req.restaurantId || DEFAULT_RESTAURANT_ID,
    };
    return next();
  }

  // 2. Cryptographic JWT Verification
  const decoded = verifyStaffToken(token);
  req.staff = {
    id: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role,
    restaurantId: decoded.restaurantId,
  };
  req.restaurantId = decoded.restaurantId;
  next();
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
