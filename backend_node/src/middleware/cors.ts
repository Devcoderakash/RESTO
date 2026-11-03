import cors from 'cors';
import { env } from '../config/env.js';

const allowedOrigins = env.CLIENT_ORIGINS.split(',').map((o) => o.trim());

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, curl, tests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In production, reject unapproved origins
    if (env.NODE_ENV === 'production') {
      return callback(new Error(`CORS blocked: origin '${origin}' is not authorized`), false);
    }

    // In non-production only, allow wildcards or local testing
    if (allowedOrigins.includes('*') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

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
    'X-Idempotency-Key',
    'X-Tracking-Token',
    'Last-Event-ID',
  ],
  exposedHeaders: ['X-Response-Time', 'Content-Range'],
});

