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
│   ├── modules/           # Domain feature modules
│   │   ├── restaurants/   # Restaurant details & branding
│   │   ├── tables/        # Floor management & occupancy
│   │   ├── categories/    # Menu categories
│   │   ├── menu/          # Menu items catalog
│   │   ├── orders/        # Order placement & state transitions
│   │   ├── payments/      # Payment processing & reconciliation
│   │   ├── staff/         # Staff management & credentials
│   │   ├── waiter-requests/# Waiter calls & bill assistance
│   │   ├── tracking/      # HMAC customer order tracking
│   │   ├── realtime/      # SSE stream & sync dispatcher
│   │   ├── uploads/       # Supabase Storage image upload
│   │   ├── analytics/     # Dashboard overview & daily sales
│   │   └── settings/      # Operational restaurant settings
│   ├── app.ts             # Express app bootstrap & middleware pipeline
│   └── server.ts          # Server listener & graceful shutdown handlers
├── migrations/            # Versioned SQL migrations for resto_v2
├── tests/                 # Vitest & Supertest automated test suites
├── package.json
└── tsconfig.json
```
