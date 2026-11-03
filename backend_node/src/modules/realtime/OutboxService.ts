import pg from 'pg';
import { query } from '../../database/db.js';
import { RealtimeEventBus } from './RealtimeEventBus.js';
import { RealtimeEvent } from './types.js';

export interface CreateEventParams {
  restaurantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: any;
}

export class OutboxService {
  private static instance: OutboxService | null = null;
  private readonly eventBus: RealtimeEventBus;

  constructor(eventBus?: RealtimeEventBus) {
    this.eventBus = eventBus || RealtimeEventBus.getInstance();
  }

  public static getInstance(): OutboxService {
    if (!OutboxService.instance) {
      OutboxService.instance = new OutboxService();
    }
    return OutboxService.instance;
  }

  public async publishEvent(
    client: pg.PoolClient | undefined,
    params: CreateEventParams
  ): Promise<RealtimeEvent> {
    const sql = `
      INSERT INTO resto_v2.realtime_events (
        restaurant_id, event_type, entity_type, entity_id, payload
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, restaurant_id, event_type, entity_type, entity_id, payload, created_at;
    `;
    const values = [
      params.restaurantId,
      params.eventType,
      params.entityType,
      params.entityId,
      JSON.stringify(params.payload || {}),
    ];

    let row: any;
    if (client) {
      const res = await client.query(sql, values);
      row = res.rows[0];
    } else {
      const res = await query(sql, values);
      row = res.rows[0];
    }

    const event: RealtimeEvent = {
      id: Number(row.id),
      restaurantId: row.restaurant_id,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      createdAt: row.created_at,
    };

    // Immediate local broadcast fallback
    this.eventBus.broadcast(event.restaurantId, event);
    return event;
  }

  public async getEventsSince(
    restaurantId: string,
    lastEventId: number,
    limit = 100
  ): Promise<RealtimeEvent[]> {
    const sql = `
      SELECT id, restaurant_id, event_type, entity_type, entity_id, payload, created_at
      FROM resto_v2.realtime_events
      WHERE restaurant_id = $1 AND id > $2
      ORDER BY id ASC
      LIMIT $3;
    `;
    const res = await query(sql, [restaurantId, lastEventId, limit]);
    return res.rows.map((row) => ({
      id: Number(row.id),
      restaurantId: row.restaurant_id,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      createdAt: row.created_at,
    }));
  }
}

