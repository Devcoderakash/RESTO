# RESTO V2 — Phase 5: Node.js Backend Production Deployment Report

**Date**: November 4, 2026  
**Branch**: `resto-v2-staging`  
**Backend Framework**: Node.js 22+ / Express / TypeScript (compiled to `dist/`)  
**Production Blueprint**: `render.yaml` (`resto-backend-node`)  
**Database**: Supabase PostgreSQL 17.11 (`zmpthsiiouukjjyrbpnz`)  
**Schema**: `resto_v2`  
**Verdict**: **PHASE 5 DEPLOYMENT PREPARATION VERIFIED — READY FOR CUTOVER APPROVAL**

---

## Executive Summary

Phase 5 prepares the RESTO V2 production Node.js/TypeScript backend service for deployment on Render. 

The standalone Node backend was compiled into `dist/`, audited for production readiness, and validated live against the populated `resto_v2` production schema. Connection pooling via PgBouncer (port 6543), dedicated LISTEN/NOTIFY socket connectivity, Server-Sent Events (SSE) notification streaming, and health probes were verified.

The infrastructure blueprint `render.yaml` was updated to declare the new `resto-backend-node` production service alongside the legacy Django service (`resto-backend`). In strict adherence to cutover safety rules, **the legacy Django service has NOT been disabled**, and **customer frontend and dashboard URLs remain pointed to existing endpoints**.

---

## 1. Production Build & Architecture Audit

| Subsystem | Configuration / Mechanism | Audit Status | Details |
| :--- | :--- | :---: | :--- |
| **Compiler & Build** | TypeScript 5.7+ (`tsc -p tsconfig.json`) | **VERIFIED** | Clean compilation to `dist/` (0 errors) |
| **HTTP Server** | Node.js native `http.createServer(app)` | **VERIFIED** | Express 4.21+ with Helmet security headers |
| **Connection Pooling** | `pg.Pool` targeting Supabase Transaction Pooler | **VERIFIED** | Min: 2, Max: 20 connections; idle timeout 30s |
| **LISTEN/NOTIFY** | Dedicated `pg.Client` over SSL | **VERIFIED** | Listens on `resto_v2_realtime_channel` with auto-reconnect |
| **Dual Route Mounting**| Mounts on both `/api/*` and `/*` | **VERIFIED** | Full backwards compatibility; zero 301 redirect traps |
| **CORS Policy** | Whitelist with credential support | **VERIFIED** | Allowed origins configured for Render and Vercel |
| **JWT Authentication** | HMAC-SHA256 (`jsonwebtoken`) | **VERIFIED** | 24-hour expiry; role-based access control |
| **Graceful Shutdown** | Handlers for `SIGTERM` and `SIGINT` | **VERIFIED** | Closes HTTP server, realtime socket, and DB pool |

---

## 2. Health & Readiness Probe Verification

Live verification was conducted against the compiled production server (`node dist/server.js`) connected to Supabase:

### A. Readiness Probe (`GET /health/ready`)
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-Response-Time: 1132.44ms

{
  "status": "ready",
  "database": "connected",
  "database_vendor": "postgresql",
  "db_latency_ms": 1127.95,
  "timestamp": "2026-11-04T12:41:37.517Z"
}
```

### B. Catalog Retrieval Probe (`GET /api/restaurants/info`)
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-Response-Time: 178.60ms

{
  "id": "rest-olive-ember-01",
  "name": "The Olive & Ember",
  "slug": "olive-and-ember",
  "description": "Artisanal Mediterranean & Wood-Fired Hearth Dining",
  "address": "14 Wood Street, Indiranagar, Bengaluru",
  "tax_percentage": 5,
  "currency": "INR",
  "is_active": true
}
```

### C. Live Menu Catalog (`GET /api/menu`)
- Returns all 5 active categories: Starters, Main Course, Pizza & Pasta, Beverages, Desserts.
- Returns all 7 menu items with high-resolution Unsplash image URLs and exact decimal prices.

---

## 3. Render Infrastructure Blueprint (`render.yaml`)

The production Render Blueprint declares `resto-backend-node` as a distinct web service:

```yaml
  # 4. RESTO V2 Production Node.js Backend
  - type: web
    name: resto-backend-node
    env: node
    rootDir: backend_node
    buildCommand: "npm install && npm run build"
    startCommand: "node dist/server.js"
    healthCheckPath: "/health/ready"
    envVars:
      - key: NODE_ENV
        value: "production"
      - key: PORT
        value: "10000"
      - key: DATABASE_URL
        sync: false # Transaction Pooler (Port 6543) configured in Render Dashboard
      - key: DIRECT_DATABASE_URL
        sync: false # Direct/Session connection (Port 5432) configured in Render Dashboard
      - key: RESTO_V2_PRIMARY_PROJECT_REF
        value: "zmpthsiiouukjjyrbpnz"
      - key: ALLOW_RESTO_V2_PRIMARY_TARGET
        value: "true"
      - key: DATABASE_SCHEMA
        value: "resto_v2"
      - key: DB_POOL_MIN
        value: "2"
      - key: DB_POOL_MAX
        value: "20"
      - key: CLIENT_ORIGINS
        value: "https://resto-vc53.onrender.com,https://resto-frontend.onrender.com,https://resto-dashboard.onrender.com,https://resto-dining.vercel.app,https://resto-dashboard.vercel.app"
      - key: CORS_ALLOWED_ORIGINS
        value: "https://resto-vc53.onrender.com,https://resto-frontend.onrender.com,https://resto-dashboard.onrender.com,https://resto-dining.vercel.app,https://resto-dashboard.vercel.app"
      - key: STAFF_JWT_SECRET
        generateValue: true
      - key: JWT_SECRET
        generateValue: true
      - key: TRACKING_TOKEN_SECRET
        generateValue: true
      - key: ALLOW_DEMO_AUTH
        value: "false"
      - key: SUPABASE_URL
        value: "https://zmpthsiiouukjjyrbpnz.supabase.co"
      - key: SUPABASE_STORAGE_BUCKET
        value: "resto-media"
```

---

## 4. Rollback & Failover Procedures

1. **Independent Coexistence**:
   - The Node.js service runs independently from the existing Python Django service.
   - Django continues running untouched on `https://resto-vc53.onrender.com`.
2. **Instant Traffic Rollback**:
   - If any anomaly is observed post-deployment, frontend and dashboard services can remain on or instantly revert to the existing Django service URL.
3. **Database Isolation**:
   - Node backend operates strictly within schema `resto_v2`.
   - The `public` schema and Supabase Auth remain completely unmodified.

---

## 5. Phase 5 Exit Criteria Checklist

- [x] Node.js production build (`dist/`) verified clean (0 compilation errors).
- [x] Connection pooling and dedicated realtime LISTEN/NOTIFY verified.
- [x] `/health/ready` probe verified with live PostgreSQL latency metrics.
- [x] Dual-route mounting verified (supports both `/api/*` and `/*`).
- [x] `render.yaml` updated with `resto-backend-node` declaration.
- [x] Zero hardcoded secrets committed to git.
- [x] Django service preserved and NOT disabled.
- [x] Customer frontend and dashboard URLs NOT switched.

**PHASE 5 EXIT STATUS: READY FOR TRAFFIC CUTOVER AUTHORIZATION.**
