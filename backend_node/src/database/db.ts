import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!poolInstance) {
    const config: pg.PoolConfig = {
      connectionString: env.DATABASE_URL,
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
      idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
      ssl: env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    };

    poolInstance = new Pool(config);

    poolInstance.on('error', (err) => {
      logger.error({ err }, 'Unexpected database client pool error');
    });
  }
  return poolInstance;
}

export function setPool(customPool: pg.Pool): void {
  poolInstance = customPool;
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool();
  const start = performance.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = performance.now() - start;
    logger.debug({ durationMs: duration.toFixed(2), rowCount: result.rowCount }, 'Database query executed');
    return result;
  } catch (err) {
    logger.error({ err, query: text }, 'Database query error');
    throw err;
  }
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  try {
    await query('SELECT 1;');
    const latencyMs = Number((performance.now() - start).toFixed(2));
    return { connected: true, latencyMs };
  } catch (err: any) {
    const latencyMs = Number((performance.now() - start).toFixed(2));
    return { connected: false, latencyMs, error: err?.message || 'Database connection error' };
  }
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    logger.info('Database pool closed gracefully');
  }
}

