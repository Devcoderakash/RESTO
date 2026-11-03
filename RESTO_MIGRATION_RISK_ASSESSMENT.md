# RESTO — Express Migration Risk Assessment & Gap Analysis

**Document Version:** 1.0.0 (Forensic Technical Audit)  
**Date:** 2026-11-03  
**Auditor:** Principal Software Architect, Senior Production SRE & Risk Officer  
**Scope:** Forensic evaluation of risks, migration costs, code rewrites, and database impacts of replacing Django (`backend/`) with Express (`backend_express_backup/`).  
**Operational Status:** READ-ONLY FORENSIC AUDIT (Zero modifications to source code or schemas).

---

## 1. Executive Risk Summary

Replacing the active Django backend with the existing Express backup represents an **EXTREME RISK (NO-GO)** for the RESTO platform.

The Express codebase is not an equivalent, production-ready substitute. It is an early prototype backup missing more than **57% of application API endpoints**, possessing **zero real-time capabilities**, harboring a **critical authentication bypass vulnerability**, and exhibiting **complete schema incompatibility with the live Supabase PostgreSQL database**.

### Risk Level Heatmap
- **Production Data Integrity Risk:** **EXTREME (Potential Data Loss & Schema Breakage)**
- **Application Availability Risk:** **CRITICAL (Real-Time Subsystem 100% Broken)**
- **Security & Authorization Risk:** **CRITICAL (Universal Admin Bypass in Auth Middleware)**
- **Development Effort Required:** **HIGH (4 to 6 Weeks of Re-Engineering)**

---

## 2. The 10 Critical Migration Risk Vectors

### 2.1 Missing API Functionality
If cut over to Express today, the following endpoints would immediately 404:
- `GET /api/realtime/stream`: Breaks live kitchen order popups, waiter chimes, and order tracking.
- `GET /api/realtime/sync`: Breaks dashboard offline recovery and event replay.
- `POST /api/upload`: Breaks dish photo uploads and restaurant branding in the dashboard.
- `GET /api/health/live` & `GET /api/health/ready`: Breaks Render health monitoring and frontend liveness detection.

### 2.2 Business Logic That Must Be Re-Engineered
1. **Order Creation & Pricing:** Express relies on a custom stored procedure `rpc('create_order')` whose signature requires UUIDs and integers. It must be completely rewritten in Node.js using atomic transactions.
2. **Idempotency:** Express checks idempotency in an in-memory JavaScript array. It must be rewritten to perform indexed database checks on `public.orders.idempotency_key`.
3. **Table Lifecycle:** Django's automated table occupancy release upon final bill payment does not exist in Express and must be built from scratch.
4. **Order Status Alignment:** Express uses statuses `'pending'` and `'confirmed'`; the production database and frontend expect `'new'` and `'accepted'`.
5. **Elimination of `localStore`:** The dangerous silent fallback to in-memory mocks must be removed and replaced with robust error propagation.

### 2.3 Required Frontend Code Changes
1. **Real-Time Services:** `dashboard/src/services/realtimeService.ts` and `frontend/src/pages/OrderTrackingPage.tsx` rely on continuous SSE streaming with 20-second chunking. If Express is used, frontend real-time services would have to be downgraded to expensive continuous polling (e.g. polling `/api/orders` every 2 seconds).
2. **Field Adaptations:** React components expecting `isAvailable`, `prepTimeMinutes`, and detailed tax breakdowns would require refactoring to handle Express's alternative naming conventions.

### 2.4 Authentication & Security Risks
1. **Patching the Admin Escalation Bug:** The catch blocks in [`backend_express_backup/src/middleware/auth.ts`](file:///Users/akashlodhi/Downloads/RESTO/backend_express_backup/src/middleware/auth.ts#L29-L56) that automatically grant `restaurant_admin` to invalid tokens must be excised.
2. **Staff Token Parity:** The frontend relies on HMAC-signed bearer staff tokens and customer tracking tokens. Express must be updated to validate these tokens against Django's hash format.

### 2.5 Database Schema Incompatibility
1. **Primary Key Mismatch:** Express expects `UUID` across all tables. The live production database uses `VARCHAR(64)` strings (`rest-olive-ember-01`, `tbl-e25df5aa`, `item-7`).
2. **Table Number Type Mismatch:** Express expects `INTEGER` table numbers (`table_number integer`). Production uses `VARCHAR(20)` (`'01'`, `'02'`).
3. **Missing Columns:** Express queries `categories.active` and `staff.user_id`, neither of which exists in production. Connecting Express causes immediate SQL column exceptions.

### 2.6 Production Data Loss Risks
The production Supabase database currently contains **740+ verified records** (orders, order items, payments, tables, categories, menu items, staff, realtime events).
- Modifying column types from `VARCHAR` to `UUID` to satisfy Express would require dropping foreign key constraints, wiping existing data, or running complex conversion scripts.
- Any orders accepted by Express while falling back to `localStore` would exist only in Node.js RAM and **would be permanently lost upon container restart**.

### 2.7 Real-Time Migration Risks
- Django's continuous SSE engine delivers events to the dashboard in **< 200 ms**.
- Express has no SSE or WebSocket implementation. Migrating to Express would instantly degrade user experience, forcing staff to manually refresh browser pages to discover incoming customer orders.

### 2.8 Deployment & Infrastructure Changes
1. **Render Configuration:** `render.yaml` must be modified from Python to Node.js, requiring new build and start commands (`npm run build && npm start`).
2. **Corrupted Toolchain:** As verified in Phase 9, running `npm run typecheck` in `backend_express_backup` fails with `Cannot find module '../lib/tsc.js'`. The dependencies would require cleanup and testing.

### 2.9 Rollback Strategy
If an Express cutover fails in production:
1. Reverting to Django requires switching `render.yaml` back to `backend/` and rebuilding Python virtual environments.
2. Any customer orders placed while Express was running in `localStore` cannot be recovered or migrated back to Django, creating customer disputes and unfulfilled food orders.

### 2.10 Estimated Migration Complexity & Timeline
- **Direct Database Driver Integration (`pg` / `pg-pool`):** 5 days
- **Rewriting Order Lifecycle & Transaction Logic:** 5 days
- **Building SSE Real-Time Streaming Subsystem:** 5 days
- **Supabase Storage Image Upload Pipeline:** 3 days
- **Fixing Critical Auth Vulnerabilities & Token Parity:** 4 days
- **Schema Parity Alignment & Type Fixes:** 4 days
- **Automated Test Suite Development (0 → 100+ tests):** 6 days
- **Total Estimated Effort:** **32 Developer Days (~5–6 Weeks)**

---

## 3. Migration Verdict: NO-GO

Replacing Django with the existing Express backup is **strongly advised against (NO-GO)**. 

The existing Django backend is already complete, optimized, tested, and running in production. Migrating to Express would introduce critical security vulnerabilities, break real-time operations, and jeopardize existing database integrity without providing any measurable technical advantage.

