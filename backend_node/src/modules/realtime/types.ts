import { Response } from 'express';

export interface RealtimeEventPayload {
  id?: number | string;
  restaurant_id?: string;
  event_type?: string;
  entity_type?: string;
  entity_id?: string;
  payload?: any;
  created_at?: string;
  [key: string]: any;
}

export interface RealtimeEvent {
  id: number;
  restaurantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: any;
  createdAt: string;
}

export interface SSEClient {
  id: string;
  restaurantId: string;
  targetOrderId?: string;
  res: Response;
  connectedAt: Date;
  lastEventId: number;
}

