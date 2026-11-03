import cors from 'cors';
import { env } from '../config/env.js';

const allowedOrigins = env.CLIENT_ORIGINS.split(',').map((o) => o.trim());

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or matching origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow during development/staging
    }
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
