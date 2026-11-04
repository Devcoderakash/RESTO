import cors from 'cors';
import { env } from '../config/env.js';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, curl, tests)
    if (!origin) return callback(null, true);

    const allowedOrigins = env.CLIENT_ORIGINS
      ? env.CLIENT_ORIGINS.split(',').map((o) => o.trim().toLowerCase())
      : [];

    const lowerOrigin = origin.toLowerCase();

    // 1. Explicitly configured origins or wildcard
    if (allowedOrigins.includes(lowerOrigin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // 2. Allow any Vercel domain (production, previews, branches)
    if (lowerOrigin.endsWith('.vercel.app') || lowerOrigin.includes('.vercel.app')) {
      return callback(null, true);
    }

    // 3. Allow local development
    if (
      lowerOrigin.includes('localhost') ||
      lowerOrigin.includes('127.0.0.1') ||
      lowerOrigin.includes('0.0.0.0')
    ) {
      return callback(null, true);
    }

    // 4. Reject unrecognized origin safely without throwing 500
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Staff-Internal',
    'X-Restaurant-ID',
    'X-Restaurant-Slug',
    'X-Idempotency-Key',
    'Idempotency-Key',
    'X-Tracking-Token',
    'Last-Event-ID',
  ],
  exposedHeaders: ['X-Response-Time', 'Content-Range'],
});

