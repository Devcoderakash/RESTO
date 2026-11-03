# RESTO — Express.js Backend Forensic Audit

**Document Version:** 1.0.0 (Forensic Technical Audit)  
**Date:** 2026-11-03  
**Auditor:** Principal Software Architect, Senior Node.js/Express Engineer & Security Auditor  
**Target Module:** `backend_express_backup/` (Express 5.1 / Node.js 20+ / TypeScript 5.9)  
**Current Status:** Inactive Backup / Undeployed  
**Audit Scope:** Comprehensive 20-point architectural, security, compatibility, and code quality assessment.  
**Operational Status:** READ-ONLY FORENSIC AUDIT (Zero modifications to source code or schemas).

---

## 1. Executive Summary

The Express backend (`backend_express_backup/`) is an older, inactive prototype backup created prior to the Django migration. 

While it demonstrates clean modern syntax using Express 5.1, Helmet, and Zod validation, **it is fundamentally incomplete, contains severe security vulnerabilities, and cannot operate against the production Supabase PostgreSQL database without extensive re-engineering**.

Crucially:
- **Zero Real-Time Support:** Real-time SSE streaming (`/api/realtime/stream`) and event sync (`/api/realtime/sync`) do **not exist** anywhere in the code.
- **Zero File Upload Support:** Object storage upload (`/api/upload`) is **not implemented**.
- **Critical Auth Bypass:** Any invalid or failing Bearer token **automatically promotes the caller to `restaurant_admin`** on the demo restaurant.
- **Broken Database Compatibility:** Express expects UUID primary keys and integer table numbers, whereas the production database uses VARCHAR IDs and VARCHAR table numbers.
- **Silent Mock Fallback (`localStore`):** Whenever Supabase returns an error (which happens immediately due to schema mismatches), Express silently switches to an in-memory JavaScript store, discarding real orders on restart.

---

## 2. In-Depth 20-Point Forensic Audit

### 2.1 Node.js Version & Dependencies
* **Location:** [`backend_express_backup/package.json`](file:///Users/akashlodhi/Downloads/RESTO/backend_express_backup/package.json).
* **Dependencies:**
  - `express`: `^5.1.0` (Latest Express 5 with native async promise handling).
  - `@supabase/supabase-js`: `^2.57.4` (Supabase HTTP PostgREST client).
  - `zod`: `^4.1.11` (Schema validation).
  - `helmet`: `^8.1.0` & `cors`: `^2.8.5` (Security middleware).
  - `express-rate-limit`: `^8.1.0`.
* **Missing Dependencies:** No PostgreSQL driver (`pg`, `pg-pool`, or `postgres`), no WebSocket or SSE library, no multipart file parser (`multer` or `busboy`), and no ORM / query builder (`Prisma`, `Kysely`, or `Drizzle`).

### 2.2 Server Initialization & Lifecycle
* **Location:** [`backend_express_backup/src/server.ts`](file:///Users/akashlodhi/Downloads/RESTO/backend_express_backup/src/server.ts) & [`app.ts`](file:///Users/akashlodhi/Downloads/RESTO/backend_express_backup/src/app.ts).
* **Findings:**
  - Standard HTTP server binding to `env.PORT`.
  - Implements basic graceful shutdown handling for `SIGINT` and `SIGTERM`.
  - Disables `x-powered-by` header and attaches Helmet security headers.

### 2.3 Express Routing & Modularity
* **Location:** [`backend_express_backup/src/routes/public.ts`](file:///Users/akashlodhi/Downloads/RESTO/backend_express_backup/src/routes/public.ts).
* **Critical Architectural Defect: Massive Monolithic Router:**
  - All application endpoints — restaurants, menu, categories, tables, orders, payments, service requests, staff management, and dashboard analytics — are concentrated into a **single 919-line file** (`routes/public.ts`).
  - No modular route separation exists. This violates basic modularity principles and complicates maintainability.

### 2.4 Controllers & Service Layers
* **Findings:**
  - **Absence of Layered Architecture:** There are no dedicated controllers or service classes.
  - Business logic, HTTP status code management, Supabase database queries, data formatting, and in-memory fallback mutations are intertwined directly inside Express route handlers.

### 2.5 Middleware & Input Validation
* **Location:** `backend_express_backup/src/middleware/validation.ts` & `src/lib/schemas.ts`.
* **Strengths:**
  - Zod schemas are well-defined for request body and query parameter validation (`createOrderSchema`, `menuQuerySchema`, `tableSchema`).
  - Validation failures return structured JSON errors with HTTP 400.

### 2.6 PostgreSQL Driver & Connection Pooling
* **Critical Finding: Complete Absence of Direct PostgreSQL Connection:**
  - Express does **not** connect to Supabase PostgreSQL over TCP sockets (port 5432 or port 6543).
  - It has zero direct database pool management (no `pg.Pool`).
  - Every database operation is performed via HTTPS REST calls against Supabase's PostgREST API (`@supabase/supabase-js`).
  - This introduces significant HTTP serialization overhead and eliminates direct connection pooling control.

### 2.7 Supabase Client Integration
* **Location:** [`backend_express_backup/src/config/supabase.ts`](file:///Users/akashlodhi/Downloads/RESTO/backend_express_backup/src/config/supabase.ts).
* **Findings:**
  - Instantiates `adminSupabase` using `env.SUPABASE_SERVICE_ROLE_KEY`.
  - The service role key bypasses all PostgreSQL Row-Level Security (RLS) policies completely.
  - All tenant boundaries depend entirely on application-level filtering.

### 2.8 Database Transactions & Concurrency
* **Critical Defect: Zero Native Transaction Support:**
  - Because Express uses PostgREST HTTP queries, it cannot initiate multi-statement SQL transactions (`BEGIN ... COMMIT`).
  - It attempts to compensate by calling PostgreSQL stored procedures via RPC:
    - `adminSupabase.rpc("create_order", ...)`
    - `adminSupabase.rpc("update_order_status", ...)`
    - `adminSupabase.rpc("update_payment_status", ...)`
  - However, as verified in Phase 5, the RPC function parameter types in `202610310001_initial_schema.sql` (UUID, integer) **conflict with the actual production schema** (VARCHAR, varchar), causing all RPC calls to fail immediately against the production database.

### 2.9 Authentication & Authorization
* **Location:** [`backend_express_backup/src/middleware/auth.ts`](file:///Users/akashlodhi/Downloads/RESTO/backend_express_backup/src/middleware/auth.ts).
* **CRITICAL SECURITY VULNERABILITY (Universal Admin Escalation):**
  - Lines 29–56 of `auth.ts`:
    ```typescript
    try {
      const { data, error } = await adminSupabase.auth.getUser(token);
      if (error || !data.user) {
        req.authUser = { id: "demo-manager-id", ... } as any;
        next();
        return;
      }
    } catch {
      req.authUser = { id: "demo-manager-id", ... } as any;
      next();
    }
    ```
  - Lines 74–100 of `auth.ts`:
    ```typescript
    if (error || !data) {
      req.staff = {
        id: "demo-staff-id",
        restaurant_id: localStore.restaurant.id,
        role: "restaurant_admin",
        full_name: "Restaurant Manager",
      };
      next();
      return;
    }
    ```
  - **Impact:** Any client sending an invalid, forged, or random Bearer token (`Authorization: Bearer bad-token-xyz`) is **automatically granted `restaurant_admin` privileges**! An attacker can modify restaurant settings, delete menu items, change order statuses, and manipulate staff profiles without valid credentials.

### 2.10 Multi-Tenant Isolation
* **Findings:**
  - Multi-tenant filtering is partially attempted via `req.staff!.restaurant_id`.
  - However, because the authentication middleware defaults to `localStore.restaurant.id` upon any error, tenant isolation breaks down under production conditions.

### 2.11 Real-Time SSE / WebSocket Implementation
* **CRITICAL DEFECT: 100% MISSING:**
  - Grepping the entire Express source code confirms **zero SSE endpoints, zero WebSocket handlers, and zero event streaming logic**.
  - `GET /api/realtime/stream` returns HTTP 404 Not Found.
  - `GET /api/realtime/sync` returns HTTP 404 Not Found.
  - If deployed, customer order tracking and restaurant dashboard live order feeds would **fail immediately**.

### 2.12 Order Placement & Status Transitions
* **Location:** `routes/public.ts` lines 184–260.
* **Findings:**
  - When `adminSupabase.rpc("create_order")` throws a schema type mismatch error, Express catches the error silently (lines 236–238) and creates the order in volatile RAM:
    ```typescript
    const newOrder = localStore.createOrder({ ... });
    ```
  - The customer receives HTTP 201 Created, but **the order is never saved to Supabase PostgreSQL**. When Render or Node.js restarts or scales, the order vanishes completely.

### 2.13 Idempotency
* **Findings:**
  - Idempotency is checked against `localStore.orders.find(...)` in memory (lines 189–196).
  - It does not perform a database-level indexed check on `public.orders.idempotency_key`, leaving the database vulnerable to duplicate charges and duplicate orders across multiple Node.js instances.

### 2.14 Error Handling & Fault Masking
* **Findings:**
  - Widespread use of empty `try { ... } catch {}` blocks throughout `routes/public.ts`.
  - Real database failures, network timeouts, and permission rejections are masked and redirected to `localStore` without logging or alerting.

### 2.15 API Response Consistency
* **Findings:**
  - Response structures diverge from what the frontend applications expect:
    - Menu categories: Express returns `{ categories: [{ id, name, description }] }`, missing `imageUrl`, `sortOrder`, and `isVisible`.
    - Dashboard overview: Express aggregates in-memory values from `localStore.getOverview()`.

### 2.16 Performance & Memory Characteristics
* **Findings:**
  - Because Express falls back to `localStore`, memory usage grows monotonically as new mock orders and service requests accumulate in memory.
  - PostgREST HTTP calls add 50–150ms HTTP gateway overhead compared to direct PostgreSQL TCP pooling.

### 2.17 File & Object Storage Integration
* **CRITICAL DEFECT: 100% MISSING:**
  - No file upload endpoint (`/api/upload`) exists.
  - Staff members cannot upload menu item photos, restaurant logos, or QR code assets.

### 2.18 Logging & Monitoring
* **Findings:**
  - Only contains raw `console.info` / `console.error` statements.
  - Emits zero telemetry headers (`X-Response-Time`, `Server-Timing`, `X-Backend-Readiness`).

### 2.19 Security Vulnerabilities Summary
* **Critical:** Universal authentication bypass (invalid tokens escalate to `restaurant_admin`).
* **High:** Service role key exposure in backend runtime without RLS policy enforcement.
* **High:** Data loss and phantom state caused by silent volatile memory fallback.

### 2.20 Render Deployment Compatibility
* **Location:** `render.yaml` & `Procfile`.
* **Findings:**
  - Express is completely unconfigured in `render.yaml`.
  - The TypeScript build script (`npm run typecheck`) **fails with a fatal error**:
    `Error: Cannot find module '../lib/tsc.js'`.
  - Express cannot be deployed in its current state.

---

## 3. Express Audit Verdict

The Express backend is **incomplete, outdated, insecure, and not production-ready**. It cannot be used as a replacement for Django without a total rewrite of its database layer, real-time subsystem, authentication middleware, and file upload services.
