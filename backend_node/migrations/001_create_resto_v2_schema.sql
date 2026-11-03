-- =====================================================================
-- RESTO V2 DATABASE MIGRATION 001: SCHEMA INITIALIZATION
-- Isolated V2 PostgreSQL Schema: resto_v2
-- Zero modifications to existing public schema.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS resto_v2;

-- Grant usage on resto_v2 schema to standard database roles
GRANT USAGE ON SCHEMA resto_v2 TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA resto_v2 GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA resto_v2 GRANT ALL ON SEQUENCES TO postgres, service_role;

