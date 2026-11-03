import { Response } from 'express';
import { logger } from '../../utils/logger.js';
import { RealtimeEvent, SSEClient } from './types.js';

export class RealtimeEventBus {
  private static instance: RealtimeEventBus | null = null;
  private clients: Map<string, Set<SSEClient>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHeartbeat();
  }

  public static getInstance(): RealtimeEventBus {
    if (!RealtimeEventBus.instance) {
      RealtimeEventBus.instance = new RealtimeEventBus();
    }
    return RealtimeEventBus.instance;
  }

  public registerClient(
    restaurantId: string,
    res: Response,
    targetOrderId?: string,
    lastEventId = 0
  ): SSEClient {
    const client: SSEClient = {
      id: `sse-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      restaurantId,
      targetOrderId,
      res,
      connectedAt: new Date(),
      lastEventId,
    };

    if (!this.clients.has(restaurantId)) {
      this.clients.set(restaurantId, new Set());
    }
    this.clients.get(restaurantId)!.add(client);

    logger.debug({ clientId: client.id, restaurantId, targetOrderId }, 'SSE client registered');
    return client;
  }

  public removeClient(client: SSEClient): void {
    const set = this.clients.get(client.restaurantId);
    if (set) {
      set.delete(client);
      if (set.size === 0) {
        this.clients.delete(client.restaurantId);
      }
    }
    logger.debug({ clientId: client.id }, 'SSE client removed');
  }

  public broadcast(restaurantId: string, event: RealtimeEvent): void {
    const subscribers = this.clients.get(restaurantId);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const payloadData = {
      ...event.payload,
      id: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      timestamp: event.createdAt,
    };

    const frame = `id: ${event.id}\nevent: ${event.eventType}\ndata: ${JSON.stringify(payloadData)}\n\n`;

    for (const client of subscribers) {
      // If client is filtered by specific order, check match
      if (client.targetOrderId && event.entityType === 'order' && event.entityId !== client.targetOrderId) {
        continue;
      }

      try {
        client.res.write(frame);
        client.lastEventId = event.id;
      } catch (err) {
        logger.error({ err, clientId: client.id }, 'Failed to write to SSE client, removing');
        this.removeClient(client);
      }
    }
  }

  public sendEventToClient(client: SSEClient, event: RealtimeEvent): void {
    const payloadData = {
      ...event.payload,
      id: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      timestamp: event.createdAt,
    };
    const frame = `id: ${event.id}\nevent: ${event.eventType}\ndata: ${JSON.stringify(payloadData)}\n\n`;
    try {
      client.res.write(frame);
      client.lastEventId = event.id;
    } catch (err) {
      this.removeClient(client);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const ping = `: keep-alive ${new Date().toISOString()}\n\n`;
      for (const [, set] of this.clients.entries()) {
        for (const client of set) {
          try {
            client.res.write(ping);
          } catch {
            this.removeClient(client);
          }
        }
      }
    }, 5000);
    this.heartbeatInterval.unref();
  }

  public stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const [, set] of this.clients.entries()) {
      for (const client of set) {
        try {
          client.res.end();
        } catch (_) {}
      }
    }
    this.clients.clear();
  }
}
