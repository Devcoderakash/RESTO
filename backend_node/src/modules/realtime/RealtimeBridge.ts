import pg from 'pg';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { RealtimeEventBus } from './RealtimeEventBus.js';
import { RealtimeEvent } from './types.js';

const { Client } = pg;

export class RealtimeBridge {
  private client: pg.Client | null = null;
  private isConnecting = false;
  private isDestroyed = false;
  private retryAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly eventBus: RealtimeEventBus;
  private readonly connectionString: string;

  constructor(eventBus?: RealtimeEventBus, customConnStr?: string) {
    this.eventBus = eventBus || RealtimeEventBus.getInstance();
    this.connectionString = customConnStr || env.DIRECT_DATABASE_URL || env.DATABASE_URL;
  }

  public async start(): Promise<void> {
    if (this.isDestroyed || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const isLocal = this.connectionString.includes('localhost') || this.connectionString.includes('127.0.0.1');
      this.client = new Client({
        connectionString: this.connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
      });

      await this.client.connect();
      logger.info('PostgreSQL Realtime Bridge connected successfully for LISTEN/NOTIFY');
      this.retryAttempt = 0;

      await this.client.query('LISTEN resto_v2_realtime_channel');

      this.client.on('notification', (msg) => {
        if (msg.channel === 'resto_v2_realtime_channel' && msg.payload) {
          try {
            const raw = JSON.parse(msg.payload);
            const event: RealtimeEvent = {
              id: Number(raw.id),
              restaurantId: raw.restaurant_id,
              eventType: raw.event_type,
              entityType: raw.entity_type,
              entityId: raw.entity_id,
              payload: raw.payload || {},
              createdAt: raw.created_at || new Date().toISOString(),
            };
            this.eventBus.broadcast(event.restaurantId, event);
          } catch (err) {
            logger.error({ err }, 'Failed to parse PostgreSQL notification payload');
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error({ err }, 'PostgreSQL Realtime Bridge connection error');
        this.scheduleReconnect();
      });

      this.client.on('end', () => {
        logger.warn('PostgreSQL Realtime Bridge connection closed');
        this.scheduleReconnect();
      });
    } catch (err: any) {
      logger.warn({ err: err?.message }, 'Failed to initialize PostgreSQL Realtime Bridge (will retry)');
      this.scheduleReconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed) return;
    if (this.client) {
      try {
        this.client.end();
      } catch (_) {}
      this.client = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const baseDelay = Math.min(30000, 1000 * Math.pow(2, this.retryAttempt));
    const jitter = Math.floor(Math.random() * 1000);
    const delay = baseDelay + jitter;
    this.retryAttempt++;

    logger.debug({ delayMs: delay, attempt: this.retryAttempt }, 'Scheduling Realtime Bridge reconnect');
    this.reconnectTimer = setTimeout(() => {
      this.start().catch((err) => {
        logger.error({ err }, 'Error in Realtime Bridge reconnect cycle');
      });
    }, delay);
    this.reconnectTimer.unref();
  }

  public isConnected(): boolean {
    return this.client !== null;
  }

  public async stop(): Promise<void> {
    this.isDestroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      try {
        await this.client.end();
      } catch (_) {}
      this.client = null;
    }
    logger.info('PostgreSQL Realtime Bridge stopped');
  }
}

