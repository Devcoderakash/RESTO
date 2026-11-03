import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

export interface StaffJWTPayload {
  sub: string;
  email: string;
  name: string;
  role: 'super_admin' | 'restaurant_admin' | 'manager' | 'chef' | 'waiter';
  restaurantId: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

export function signStaffToken(
  payload: {
    id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'restaurant_admin' | 'manager' | 'chef' | 'waiter';
    restaurantId: string;
  },
  expiresIn: string = env.JWT_EXPIRY
): string {
  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      restaurantId: payload.restaurantId,
    },
    env.STAFF_JWT_SECRET,
    {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresIn: expiresIn as any,
      algorithm: 'HS256',
    }
  );
}

export function verifyStaffToken(token: string): StaffJWTPayload {
  try {
    const decoded = jwt.verify(token, env.STAFF_JWT_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ['HS256'],
    }) as StaffJWTPayload;

    const validRoles = ['super_admin', 'restaurant_admin', 'manager', 'chef', 'waiter'];
    if (!decoded.role || !validRoles.includes(decoded.role)) {
      throw new UnauthorizedError('Token contains unauthorized or invalid role');
    }

    if (!decoded.sub || !decoded.restaurantId) {
      throw new UnauthorizedError('Token missing subject or restaurant identification');
    }

    return decoded;
  } catch (err: any) {
    if (err instanceof UnauthorizedError) throw err;
    if (err?.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Staff authentication token has expired');
    }
    if (err?.name === 'JsonWebTokenError') {
      throw new UnauthorizedError(`Invalid token: ${err.message}`);
    }
    throw new UnauthorizedError('Token verification failed');
  }
}
