# RESTO V2 — Phase 4B Cloud Staging Environment & Pre-Flight Audit

**Date**: November 4, 2026  
**Auditor**: Principal Node.js Architect, PostgreSQL Database Architect & DevOps / SRE Lead  
**Status**: **STOP GATE REACHED — AWAITING STAGING PROJECT SETUP / CREDENTIALS**

---

## 1. Executive Summary & Pre-Flight Audit

In accordance with Phase 4B Step 1, a comprehensive inspection of all environment configurations, repositories, and cloud services was conducted to determine whether a dedicated Supabase staging project exists.

### Verification Findings:
1. **Production Project Identified**: `zmpthsiiouukjjyrbpnz` (`https://zmpthsiiouukjjyrbpnz.supabase.co`).
   - This project contains live production data (`public` schema) and serves the active Django backend on Render (`resto-backend` / `resto-vc53.onrender.com`).
   - **Boundary Enforcement**: In accordance with strict instructions ("Never reuse production Supabase credentials"), this project is strictly isolated and zero write operations or staging migrations have been executed against it.
2. **Dedicated Staging Supabase Project**: **UNAVAILABLE / NOT CONFIGURED**.
   - No secondary Supabase project URL or service key exists in `.env`, `.env.*`, environment variables, or user configuration.
3. **Cloud Render Configuration**:
   - `render.yaml` currently only defines production services (`resto-backend`, `resto-frontend`, `resto-dashboard`).
   - Staging web services (`resto-backend-staging`, `resto-frontend-staging`, `resto-dashboard-staging`) have not yet been provisioned in Render.

---

## 2. Strict Stop-Gate Enforcement

> [!CAUTION]
> **MANDATORY STOP-GATE TRIGGERED**
> The user instructions explicitly state:
> *"Inspect whether a dedicated Supabase staging project exists. If unavailable, stop and request project setup. Never reuse production Supabase credentials."*
>
> In strict compliance, execution has stopped before applying any migrations or deploying any services.

---

## 3. Required Staging Environment Specifications

To proceed with Phase 4B cloud staging deployment, the following isolated staging resources are required:

### 3.1 Supabase Staging Project Requirements
A separate, dedicated Supabase project (e.g., `resto-v2-staging`) provisioned via the Supabase Dashboard:

| Parameter | Description | Example / Target Format |
|---|---|---|
| `STAGING_SUPABASE_URL` | Staging API Gateway URL | `https://<staging-ref>.supabase.co` |
| `STAGING_SUPABASE_ANON_KEY` | Public anonymous client key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | High-privilege administrative backend key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `STAGING_DATABASE_URL` | Direct PostgreSQL connection string or Transaction Pooler | `postgresql://postgres.<staging-ref>:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres` |
| `STAGING_DIRECT_DATABASE_URL` | Direct connection for persistent LISTEN/NOTIFY bridge | `postgresql://postgres:[PASSWORD]@db.<staging-ref>.supabase.co:5432/postgres` |
| Storage Bucket | Media assets bucket | `resto-media` |

### 3.2 Render Staging Service Blueprint
The staging deployment requires separate Render services to ensure zero downtime and zero collision with production:

```yaml
# Proposed Staging Services Addition to render.yaml
services:
  # 1. Staging Node.js Backend Service
  - type: web
    name: resto-backend-staging
    env: node
    rootDir: backend_node
    buildCommand: "npm install && npm run build"
    startCommand: "node dist/server.js"
    healthCheckPath: "/api/health/ready"
    envVars:
      - key: NODE_ENV
        value: "production"
      - key: PORT
        value: "10000"
      - key: DATABASE_URL
        sync: false # Set in Render Dashboard with Staging Pooler
      - key: DIRECT_DATABASE_URL
        sync: false # Set in Render Dashboard with Staging Direct 5432 for LISTEN
      - key: DATABASE_SCHEMA
        value: "resto_v2"
      - key: CLIENT_ORIGINS
        value: "https://resto-frontend-staging.onrender.com,https://resto-dashboard-staging.onrender.com"
      - key: STAFF_JWT_SECRET
        generateValue: true
      - key: TRACKING_TOKEN_SECRET
        generateValue: true
      - key: ALLOW_DEMO_AUTH
        value: "false"

  # 2. Staging Customer Frontend
  - type: web
    name: resto-frontend-staging
    env: static
    rootDir: frontend
    buildCommand: "npm install && npm run build"
    staticPublishPath: "dist"
    envVars:
      - key: VITE_API_URL
        value: "https://resto-backend-staging.onrender.com/api"
      - key: VITE_RESTAURANT_SLUG
        value: "olive-and-ember"
      - key: VITE_DEMO_MODE
        value: "false"

  # 3. Staging Restaurant Dashboard
  - type: web
    name: resto-dashboard-staging
    env: static
    rootDir: dashboard
    buildCommand: "npm install && npm run build"
    staticPublishPath: "dist"
    envVars:
      - key: VITE_API_URL
        value: "https://resto-backend-staging.onrender.com/api"
      - key: VITE_RESTAURANT_SLUG
        value: "olive-and-ember"
      - key: VITE_DEMO_MODE
        value: "false"
```

---

## 4. Multi-Instance & Real-Time Test Architecture

Once staging is provisioned, the multi-instance architecture will be tested as follows:

```mermaid
flowchart TD
    subgraph Staging_Cluster["Render Cloud Staging Cluster"]
        InstanceA["Node.js Instance A (Port 10000)"]
        InstanceB["Node.js Instance B (Port 10001)"]
    end

    subgraph Supabase_Staging["Supabase PostgreSQL V2 Staging"]
        StagingDB[("PostgreSQL 16 (resto_v2)")]
        OutboxTable["resto_v2.realtime_events"]
        PgNotify["pg_notify('resto_realtime_events')"]
    end

    subgraph Clients["Frontend Clients"]
        Customer["Customer Frontend (Connected to Instance A)"]
        Dashboard["Restaurant Dashboard (Connected to Instance B)"]
    end

    Customer -->|1. POST /orders| InstanceA
    InstanceA -->|2. Transactional Write + Outbox| StagingDB
    StagingDB -->|3. Trigger| PgNotify
    PgNotify -->|4. Persistent LISTEN| InstanceB
    InstanceB -->|5. SSE Broadcast| Dashboard
```

1. **Client Isolation**: Customer frontend connects to Instance A; Restaurant Dashboard connects to Instance B.
2. **Transactional Outbox**: An order created on Instance A writes atomically to `resto_v2.orders` and `resto_v2.realtime_events`.
3. **PostgreSQL LISTEN/NOTIFY Bridge**: The PostgreSQL notify trigger alerts Instance B via its dedicated direct connection.
4. **SSE Event Delivery**: Instance B delivers the `order.created` event to the connected dashboard in < 50ms.
5. **Cursor Reconnection**: Verifies client reconnection with `lastEventId` to ensure zero lost events across network disconnects.

---

## 5. Next Steps Awaiting User Action

To proceed with Step 2 (Database Migration), Step 3 (Backend Deployment), Step 4 (Frontend Staging Deployment), Step 5 (Browser Testing), and Step 6 (Multi-Instance Realtime):

1. **Provide Staging Credentials**: Please provide the staging Supabase project credentials (or add them to `backend_node/.env.staging`), OR
2. **Authorize Local Multi-Instance Staging Simulation**: If cloud staging projects are not yet created on Supabase/Render, authorize a local multi-instance cluster simulation (running Instance A on port 5005, Instance B on port 5006, connected via PostgreSQL `LISTEN/NOTIFY`, tested via automated headless browser automation).

