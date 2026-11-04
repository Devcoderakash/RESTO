-- =====================================================================
-- RESTO V2 DATABASE HARDENING PATCH: SEARCH_PATH PROTECTION
-- Target Function: resto_v2.notify_realtime_event()
-- Purpose: Mitigate search_path hijacking in trigger execution context
-- Status: REVIEWED & PREPARED (DO NOT APPLY TO PRODUCTION IN THIS PHASE)
-- =====================================================================

CREATE OR REPLACE FUNCTION resto_v2.notify_realtime_event()
RETURNS trigger
SET search_path = pg_catalog, resto_v2
LANGUAGE plpgsql AS $$
DECLARE
    notification_payload json;
BEGIN
    notification_payload = json_build_object(
        'id', NEW.id,
        'restaurant_id', NEW.restaurant_id,
        'event_type', NEW.event_type,
        'entity_type', NEW.entity_type,
        'entity_id', NEW.entity_id,
        'created_at', NEW.created_at,
        'payload', NEW.payload
    );

    -- pg_notify payload limit is 8000 bytes; if payload is oversized, emit reference only
    IF length(notification_payload::text) > 7500 THEN
        notification_payload = json_build_object(
            'id', NEW.id,
            'restaurant_id', NEW.restaurant_id,
            'event_type', NEW.event_type,
            'entity_type', NEW.entity_type,
            'entity_id', NEW.entity_id,
            'created_at', NEW.created_at,
            '_oversized', true
        );
    END IF;

    PERFORM pg_notify('resto_v2_realtime_channel', notification_payload::text);
    RETURN NEW;
END;
$$;
