import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5001),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/postgres'),
  DIRECT_DATABASE_URL: z.string().optional(),
  DATABASE_SCHEMA: z.string().default('resto_v2'),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(20),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().default(10000),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('resto-media'),
  TRACKING_TOKEN_SECRET: z.string().default('resto-demo-tracking-token-secret-2026'),
  STAFF_JWT_SECRET: z.string().default('resto-demo-staff-jwt-secret-2026'),
  JWT_ISSUER: z.string().default('resto-backend'),
  JWT_AUDIENCE: z.string().default('resto-dashboard'),
  JWT_EXPIRY: z.string().default('24h'),
  ALLOW_DEMO_AUTH: z.coerce.boolean().default(false),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
  SSE_HEARTBEAT_INTERVAL_MS: z.coerce.number().default(5000),
  SSE_MAX_STREAM_DURATION_MS: z.coerce.number().default(20000),
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:', result.error.format());
    throw new Error('Environment configuration validation failed');
  }
  return result.data;
}

export const env = parseEnv();

