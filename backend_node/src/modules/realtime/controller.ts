import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { OutboxService } from './OutboxService.js';
import { RealtimeEventBus } from './RealtimeEventBus.js';

const eventBus = RealtimeEventBus.getInstance();
const outboxService = OutboxService.getInstance();

export async function streamEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.restaurantId || 'rest-olive-ember-01';
    const targetOrderId = (req.query.orderId as string) || (req.query.targetOrderId as string);
    const lastEventIdHeader = req.headers['last-event-id'] as string;
    const lastEventIdQuery = req.query.lastEventId as string;
    const rawLastEventId = lastEventIdHeader || lastEventIdQuery;
    const lastEventId = rawLastEventId ? parseInt(rawLastEventId, 10) : 0;

    // 1. Establish SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // 2. Initial connection handshake comment
    res.write(`: connected at ${new Date().toISOString()}\n\n`);

    // 3. Replay missed events from Outbox if lastEventId is supplied
    if (lastEventId > 0) {
      try {
        const missedEvents = await outboxService.getEventsSince(restaurantId, lastEventId, 50);
        for (const evt of missedEvents) {
          if (!targetOrderId || evt.entityType !== 'order' || evt.entityId === targetOrderId) {
            const payloadData = {
              ...evt.payload,
              id: evt.id,
              eventType: evt.eventType,
              entityType: evt.entityType,
              entityId: evt.entityId,
              timestamp: evt.createdAt,
            };
            res.write(`id: ${evt.id}\nevent: ${evt.eventType}\ndata: ${JSON.stringify(payloadData)}\n\n`);
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to replay missed events from outbox');
      }
    }

    // 4. Register client in local event bus
    const client = eventBus.registerClient(restaurantId, res, targetOrderId, lastEventId);

    // 5. Clean teardown on client abort
    req.on('close', () => {
      eventBus.removeClient(client);
    });

    // 6. Rotate stream after MAX_DURATION to prevent stuck proxy connections
    const timer = setTimeout(() => {
      eventBus.removeClient(client);
      try {
        res.end();
      } catch (_) {}
    }, env.SSE_MAX_STREAM_DURATION_MS);
    timer.unref();
  } catch (error) {
    next(error);
  }
}

export async function syncMissedEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.restaurantId || 'rest-olive-ember-01';
    const lastEventId = req.query.lastEventId ? parseInt(req.query.lastEventId as string, 10) : 0;

    const events = await outboxService.getEventsSince(restaurantId, lastEventId, 100);
    const latestEventId = events.length > 0 ? events[events.length - 1].id : lastEventId;

    res.json({
      events: events.map((e) => ({
        id: e.id,
        type: e.eventType,
        eventType: e.eventType,
        entityType: e.entityType,
        entityId: e.entityId,
        timestamp: e.createdAt,
        payload: e.payload,
      })),
      latestEventId,
    });
  } catch (error) {
    next(error);
  }
}
