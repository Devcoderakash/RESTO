import { z } from 'zod';
import dotenv from 'dotenv';
import {
  resolveStagingDatabaseUrls,
  validateDatabaseTarget,
} from '../utils/databaseTargetValidator.js';

dotenv.config();

const resolvedDb = resolveStagingDatabaseUrls(process.env);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  PORT: z.coerce.number().default(5001),
  DATABASE_URL: z.string().default(resolvedDb.databaseUrl),
  DIRECT_DATABASE_URL: z.string().optional().default(resolvedDb.directDatabaseUrl),
  EXPECTED_STAGING_PROJECT_REF: z.string().optional(),
  ALLOW_RESTO_V2_PRIMARY_TARGET: z.coerce.boolean().default(false),
  RESTO_V2_PRIMARY_PROJECT_REF: z.string().optional(),
  DATABASE_SCHEMA: z.string().default('resto_v2'),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(20),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().default(10000),
  SUPABASE_URL: z.string().optional().default(() => process.env.STAGING_SUPABASE_URL || ''),
  SUPABASE_ANON_KEY: z.string().optional().default(() => process.env.STAGING_SUPABASE_ANON_KEY || ''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(() => process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || ''),
  SUPABASE_STORAGE_BUCKET: z.string().default('resto-media'),
  TRACKING_TOKEN_SECRET: z.string().default('resto-demo-tracking-token-secret-2026'),
  STAFF_JWT_SECRET: z.string().default(() => process.env.JWT_SECRET || 'resto-demo-staff-jwt-secret-2026'),
  JWT_ISSUER: z.string().default('resto-backend'),
  JWT_AUDIENCE: z.string().default('resto-dashboard'),
  JWT_EXPIRY: z.string().default('24h'),
  ALLOW_DEMO_AUTH: z.coerce.boolean().default(false),
  CLIENT_ORIGINS: z.string().default(() => process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174'),
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

  const data = result.data;

  // Target validation checks
  if (data.NODE_ENV === 'staging' || data.NODE_ENV === 'production') {
    if (data.EXPECTED_STAGING_PROJECT_REF) {
      validateDatabaseTarget({
        connectionString: data.DATABASE_URL,
        expectedProjectRef: data.EXPECTED_STAGING_PROJECT_REF,
        allowPrimaryTarget: data.ALLOW_RESTO_V2_PRIMARY_TARGET,
        primaryProjectRef: data.RESTO_V2_PRIMARY_PROJECT_REF,
        operationName: `${data.NODE_ENV} environment backend startup`,
      });
    }
  }

  return data;
}

export const env = parseEnv();

