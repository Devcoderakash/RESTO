# RESTO V2 — Digital Dining & Hospitality Management Platform

A high-performance digital dining, QR-ordering, and kitchen operations platform powered by Node.js, TypeScript, React 19, and Supabase PostgreSQL.

---

## Architecture Overview

```text
RESTO/
├── frontend/        # Customer Dining & QR Ordering App (React 19, TypeScript, Vite, Tailwind CSS)
├── dashboard/       # Restaurant Floor & Kitchen Operations Hub (React 19, TypeScript, Vite, Tailwind CSS)
├── backend_node/    # Production Backend API & Realtime Service (Node.js, Express, TypeScript, pg)
└── backups/         # Canonical V1 Production Data & Storage Backups
```

### Components
- **Customer Frontend (`frontend/`)**: Port `5180` / `5173`
  - Flow: Scan QR / Select Table → Browse Live Menu → Cart & Customization → Order Placement → Live SSE Tracking
  - Features: Server-side pricing & GST calculation, service requests (water, waiter, bill), Wi-Fi modal.
- **Restaurant Dashboard (`dashboard/`)**: Port `5181` / `5174`
  - Real-time kitchen display & order management (6-stage state machine: `pending` → `confirmed` → `preparing` → `ready` → `served` → `completed`).
  - Table occupancy management, waiter request resolution, and sales analytics.
- **Node.js Backend (`backend_node/`)**: Port `5005` / `5001`
  - Express + TypeScript + native PostgreSQL connection pooler.
  - Cross-instance realtime pub/sub bridge using PostgreSQL `LISTEN/NOTIFY`.
  - Fail-closed target validation, strict schema isolation (`resto_v2`), and cryptographically verified JWT auth.
- **Database (`Supabase PostgreSQL`)**:
  - Isolated schema: `resto_v2` with Row-Level Security (RLS) policies.

---

## Quick Start (Local Development)

### 1. Backend Service
```bash
cd backend_node
npm install
npm run build
npm start
# Running on http://localhost:5005
```

### 2. Customer Frontend
```bash
cd frontend
npm install
npm run dev -- --port 5180
# Running on http://localhost:5180
```

### 3. Restaurant Dashboard
```bash
cd dashboard
npm install
npm run dev -- --port 5181
# Running on http://localhost:5181
```

---

## Testing & Quality Assurance

Run test suites from `backend_node/`:

```bash
cd backend_node

# Run full Vitest suite
npm test

# Run isolated dry-run and reconciliation
npx vitest run tests/phase4b6-dry-run.test.ts

# Run security and target authorization tests
npx vitest run tests/phase4b4-primary-authorization.test.ts

# Run end-to-end browser automation (requires frontend & dashboard running)
npx vitest run tests/phase4b1-browser-automation.test.ts
```

---

## Production Deployment

- **Backend**: Render Web Service (`resto-backend-node`) configured via `render.yaml`.
- **Frontends**: Vercel Static Deployments (`resto-frontend`, `resto-dashboard`).
- **Database**: Supabase PostgreSQL (`zmpthsiiouukjjyrbpnz`).
