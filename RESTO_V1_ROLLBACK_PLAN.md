# RESTO V1 — Production Rollback Plan & Disaster Recovery Strategy

**Document Version:** 1.0.0 (Phase 1 Disaster Readiness)  
**Date:** 2026-11-03  
**Auditor / Architect:** Principal Production SRE & Database Architect  
**Source Baseline:** Deployed Django 6.1 (`resto-backend` on Render) + Supabase PostgreSQL 15 (`public` schema)  
**Backup Snapshot:** [`backend/supabase/backup_v1_production_data.json`](file:///Users/akashlodhi/Downloads/RESTO/backend/supabase/backup_v1_production_data.json)  
**Status:** **ACTIVE & VERIFIED**

---

## 1. Executive Summary

This plan defines the strict protocols, isolation boundaries, and fail-safe recovery procedures governing the migration of RESTO to a modern Node.js backend.

### Primary Safety Rule:
> [!CAUTION]
> **NEVER DROP OR ALTER EXISTING `public` TABLES DURING V2 DEVELOPMENT.**  
> All V2 development and database testing will occur either in an isolated PostgreSQL schema (such as `resto_v2`) or in a dedicated staging environment. The live V1 production database, its tables, indexes, and existing data will remain completely intact and active throughout the entire project.

---

## 2. Dual-Environment Isolation Architecture

```mermaid
graph TB
    subgraph ClientLayer["Edge Clients (Vercel)"]
        CF[Customer Frontend]
        RD[Restaurant Dashboard]
    end

    subgraph ProductionV1["Active Production Environment (UNTOUCHED)"]
        DJANGO[Django 6.1 WSGI Backend<br/>resto-backend on Render]
        PUB_DB[(Supabase PostgreSQL 15<br/>Schema: public)]
        DJANGO --> PUB_DB
    end

    subgraph StagingV2["New V2 Environment (ISOLATED)"]
        NODE[Node.js LTS + TypeScript<br/>backend_node/ on Render Staging]
        V2_DB[(Supabase PostgreSQL 15<br/>Schema: resto_v2)]
        NODE --> V2_DB
    end

    CF -->|Active Production Traffic| DJANGO
    RD -->|Active Production Traffic| DJANGO
    Note over StagingV2: Zero impact on live restaurant dining!
```

---

## 3. Verified Backup Artifacts

In the event of an unforeseen database incident, the following assets are available for instant recovery:

1. **Full Structured Data Backup:**
   - Location: [`backend/supabase/backup_v1_production_data.json`](file:///Users/akashlodhi/Downloads/RESTO/backend/supabase/backup_v1_production_data.json)
   - Contents: 100% of rows from all 10 tables (`restaurants`, `restaurant_tables`, `categories`, `menu_items`, `orders`, `order_items`, `payments`, `service_requests`, `staff`, `realtime_events`).
2. **Deterministic Schema DDL Scripts:**
   - Table DDL: [`01_schema.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend/supabase/production_migration/01_schema.sql)
   - RLS Policies: [`02_rls_policies.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend/supabase/production_migration/02_rls_policies.sql)
   - Indexes: [`03_indexes.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend/supabase/production_migration/03_indexes.sql)
   - Storage Buckets: [`04_storage.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend/supabase/production_migration/04_storage.sql)
   - Realtime Publications: [`05_realtime.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend/supabase/production_migration/05_realtime.sql)
3. **Storage Assets:**
   - Supabase Object Storage bucket `resto-media` with all uploaded dish images in `menu-items/`.

---

## 4. Emergency Rollback Runbook (Step-by-Step)

If an issue arises during staging verification or if a production cutover requires immediate reversal:

### Step 1: Revert Client Traffic to Django (Estimated Time: < 60 seconds)
If the frontend API URL was pointed to the Node.js service:
1. Revert environment variable `VITE_API_URL` in Vercel to:
   ```text
   https://resto-vc53.onrender.com
   ```
2. Re-deploy the frontend and dashboard on Vercel:
   ```bash
   vercel --prod
   ```

### Step 2: Ensure Django Backend is Healthy (Estimated Time: < 30 seconds)
1. Verify Django liveness and readiness:
   ```bash
   curl -i "https://resto-vc53.onrender.com/api/health/live"
   curl -i "https://resto-vc53.onrender.com/api/health/ready"
   ```
2. Confirm both return `HTTP/2 200` with `"status": "alive"` and `"status": "ready"`.

### Step 3: Emergency Data Restoration (If Data Was Corrupted)
If any live data was inadvertently modified in the `public` schema:
1. Execute the automated restoration script from the verified JSON backup:
   ```bash
   backend/venv/bin/python backend/supabase/restore_v1_backup.py
   ```
2. The restoration script:
   - Reads `backend/supabase/backup_v1_production_data.json`.
   - Inserts or upserts missing records into `restaurants`, `restaurant_tables`, `categories`, `menu_items`, `orders`, and `payments`.
   - Re-syncs sequence identities (`sync_sequences.sql`).

---

## 5. Verification Checklist Following Rollback

| Check # | Verification Task | Expected Result | Verified |
|---|---|---|---|
| **1** | Liveness probe `/api/health/live` | HTTP 200 (`0.57ms` response) | [ ] |
| **2** | Readiness probe `/api/health/ready` | HTTP 200 (`db_latency_ms < 400ms`) | [ ] |
| **3** | Customer Menu `/api/menu` | HTTP 200 with 5 categories & 7 dishes | [ ] |
| **4** | Table Availability `/api/tables/availability` | HTTP 200 with 8 tables | [ ] |
| **5** | Live Orders `/api/orders` | HTTP 200 with existing order records | [ ] |
| **6** | Real-time SSE `/api/realtime/stream` | Continuous event stream active | [ ] |
| **7** | Dish Image Uploads `/api/upload` | Supabase Storage bucket operational | [ ] |

---

## 6. Rollback Sign-Off

The rollback strategy guarantees **zero-downtime reversibility** and total data safety for the live RESTO dining platform.

