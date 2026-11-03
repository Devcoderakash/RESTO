# RESTO V2 — Node.js / TypeScript Production Backend

**Version:** 2.0.0 (Modular Clean Architecture)  
**Runtime:** Node.js LTS (v20+) + TypeScript Strict Mode  
**Framework:** Express.js + PostgreSQL (`pg` pool) + Supabase V2  

---

## 1. Architectural Overview

`backend_node` is the next-generation backend for RESTO. It replaces the legacy prototype and Django implementations with a high-throughput, modular, strongly-typed TypeScript service.

### Key Architectural Tenets:
1. **Isolated Database Schema (`resto_v2`):** Operates under a dedicated PostgreSQL schema (`resto_v2`) to eliminate any risk to V1 production tables.
2. **Direct Connection Pooling:** Uses native PostgreSQL socket pooling (`pg.Pool`) connected to Supabase PgBouncer (port 6543) with bounded connection timeouts and health probes.
3. **Modular Domain Architecture:** Segregated into 14 distinct feature modules with dedicated routes, controllers, services, repositories, and validators.
4. **Resilient Real-Time Delivery:** Built-in Server-Sent Events (SSE) streaming engine with durable database-backed event cursor tracking, 20-second chunking, and catch-up event sync.
5. **Zero Frontend Regressions:** Strict API contract parity across all 45 customer and dashboard endpoints.

---

## 2. Directory Structure

```text
backend_node/
├── src/
│   ├── config/            # Environment validation & app configuration
│   ├── database/          # pg.Pool connection manager & transaction helpers
│   ├── middleware/        # Auth, error handling, rate limiting, logging
│   ├── modules/           # Domain feature modules (12 modules)
│   │   ├── restaurants/   # Restaurant details & branding
│   │   ├── tables/        # Floor management & occupancy
│   │   ├── categories/    # Menu categories
│   │   ├── menu/          # Menu items catalog
│   │   ├── orders/        # Order placement & state transitions
│   │   ├── payments/      # Payment processing & reconciliation
│   │   ├── staff/         # Staff management & credentials
│   │   ├── service-requests/# Waiter calls & bill assistance
│   │   ├── realtime/      # SSE stream & PostgreSQL LISTEN/NOTIFY bridge
│   │   ├── uploads/       # Supabase Storage image upload
│   │   └── analytics/     # Dashboard overview & daily sales
│   ├── routes.ts          # Master API router wiring 45 endpoints
│   ├── app.ts             # Express app bootstrap & middleware pipeline
│   └── server.ts          # Server listener & graceful shutdown handlers
├── migrations/            # Versioned SQL migrations for resto_v2 (001-004)
├── tests/                 # Vitest & Supertest automated test suites
│   ├── setupTestDb.ts     # In-memory PostgreSQL schema & baseline seed
│   ├── api-contracts.test.ts # 45-endpoint contract test suite
│   ├── business-logic.test.ts# GST, idempotency, payments, state machine
│   ├── security.test.ts   # Auth, token rejection, tenant isolation
│   └── realtime.test.ts   # Outbox, cursor replay, fan-out
├── package.json
└── tsconfig.json
```

---

## 3. Database Connection Architecture (Port 6543 vs Port 5432)

Supabase PostgreSQL manages connections through PgBouncer:

1. **Application Connection Pooler (`DATABASE_URL` — Port 6543):**
   - Configured for **Transaction Pooling mode**.
   - Handles standard application queries, mutations, and database transactions (`BEGIN` ... `COMMIT`).
   - Uses `search_path=resto_v2` to restrict all operations to the isolated V2 schema.

2. **Dedicated Realtime Listener (`DIRECT_DATABASE_URL` — Port 5432):**
   - Configured for **Session Mode / Direct Connection**.
   - **CRITICAL:** Transaction poolers (Port 6543) do NOT support PostgreSQL `LISTEN`. The connection drops immediately.
   - The `RealtimeBridge` uses a standalone `pg.Client` connected to port 5432 to execute `LISTEN resto_v2_realtime_channel`.
   - Incorporates automated reconnection with bounded exponential backoff and full jitter.

---

## 4. Development & Testing Commands

```bash
# 1. Typecheck TypeScript codebase
npm run typecheck

# 2. Compile to production dist/
npm run build

# 3. Run complete automated test suite (73 tests across 4 suites)
npm test

# 4. Run test coverage report
npm run test:coverage

# 5. Start development hot-reload server
npm run dev

# 6. Start production compiled server
npm start
```


