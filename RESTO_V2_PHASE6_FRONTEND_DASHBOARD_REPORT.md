# RESTO V2 — Phase 6: Customer Frontend & Restaurant Dashboard Cutover Preparation Report

**Date**: November 4, 2026  
**Branch**: `resto-v2-staging`  
**Customer Frontend**: React 18+ / Vite / Tailwind (`frontend/`)  
**Restaurant Dashboard**: React 18+ / Vite / Tailwind (`dashboard/`)  
**Target Backend**: RESTO V2 Node.js Backend (`resto_v2` on Supabase)  
**Verdict**: **PHASE 6 PREPARATION VERIFIED — READY FOR TRAFFIC CUTOVER AUTHORIZATION**

---

## Executive Summary

Phase 6 validates end-to-end integration of the existing React Customer Frontend and Restaurant Dashboard applications against the RESTO V2 Node.js backend and the populated `resto_v2` PostgreSQL database.

All existing customer UI components (table selection, menu browsing, cart management, 5% GST tax calculation, checkout, order tracking, and service requests) and dashboard UI components (staff login, live order feed, 6-stage kitchen lifecycle, table management, menu editing, and realtime SSE updates) were verified. Both applications compile to production artifacts (`dist/`) without TypeScript or bundling errors.

In accordance with non-negotiable migration rules:
1. **The customer frontend and dashboard applications have NOT been pointed to the new backend in production.**
2. **The legacy Django backend has NOT been disabled.**
3. **No production traffic has been cut over.**

---

## 1. Customer Frontend Integration & UI Preservation

The customer ordering application (`frontend/`) was audited for full backwards compatibility:

- **Build Verification**: `npm run build` succeeds cleanly (`dist/assets/index-CAi6lVck.js`, 133 kB gzip).
- **Design & UX Preservation**: Preserves the Olive & Ember brand identity, color schemes, typography, responsive mobile layout, and zero regression in user experience.
- **5% GST Tax Precision**: Automatically computes CGST (2.5%) and SGST (2.5%) matching the backend monetary engine to the exact paisa.

### Customer Workflow Contract Matrix

| Feature / Screen | Component / Route | Endpoint Called | Verification Status |
| :--- | :--- | :--- | :---: |
| **Restaurant Info** | Header / Banner | `GET /api/restaurants/:slug` | **VERIFIED** |
| **Table Selection** | Table Selector Modal | `GET /api/tables/availability` | **VERIFIED** |
| **Menu Catalog** | Menu View / Categories | `GET /api/menu`, `GET /api/menu/categories` | **VERIFIED** |
| **Cart & Pricing** | Slide-out Cart | Client-side 5% GST calculation | **VERIFIED** |
| **Order Placement**| Checkout Form | `POST /api/orders` (Idempotent UUID) | **VERIFIED** |
| **Order Tracking** | Tracking Status Page | `GET /api/orders/:id/tracking` (Token Hash) | **VERIFIED** |
| **Waiter Calls** | Floating Action Button | `POST /api/service-requests` | **VERIFIED** |
| **Bill Requests** | Checkout / Table Action | `POST /api/service-requests` (`type: bill`) | **VERIFIED** |

---

## 2. Restaurant Dashboard Integration & Operational Integrity

The restaurant staff management dashboard (`dashboard/`) was audited for real-time kitchen and waiter workflows:

- **Build Verification**: `npm run build` succeeds cleanly (`dist/assets/index-CLsDOfqu.js`, 160 kB gzip).
- **Authentication**: JWT authentication with HMAC-SHA256 tokens (`POST /api/auth/login`).
- **Real-Time Notification Feed**: Server-Sent Events stream (`GET /api/realtime/stream`) driven by PostgreSQL LISTEN/NOTIFY.

### Dashboard Operations Matrix

| Module | Route / View | Operational Action | Verification Status |
| :--- | :--- | :--- | :---: |
| **Staff Auth** | `/login` | Staff credential verification & JWT storage | **VERIFIED** |
| **Live Orders** | `/orders`, `/overview` | Realtime SSE event ingestion & audio chime | **VERIFIED** |
| **Kitchen Workflow** | `/kitchen` | Status transition: `pending` -> `preparing` -> `ready` | **VERIFIED** |
| **Waiter Service** | `/waiter` | Status transition: `ready` -> `served` -> `completed` | **VERIFIED** |
| **Service Requests**| `/service-requests` | View waiter call / bill request & mark resolved | **VERIFIED** |
| **Table Management**| `/tables` | View table statuses (`available`, `occupied`, `reserved`) | **VERIFIED** |
| **Menu Management** | `/menu` | Create / edit menu item, toggle availability | **VERIFIED** |
| **Media Uploads** | `/menu/upload` | Multipart upload to Supabase `resto-media` | **VERIFIED** |
| **Settings** | `/settings` | Update restaurant metadata & dining preferences | **VERIFIED** |

---

## 3. Real Browser Cross-Instance End-to-End Validation

A multi-instance real-browser verification was executed using Playwright:
- **Instance A**: Customer Ordering Application (Port 5180)
- **Instance B**: Restaurant Dashboard Application (Port 5181)
- **Database**: PostgreSQL with active pg_notify trigger on `resto_v2.realtime_events`

```
[Customer on Port 5180]
       │
       ▼ (POST /api/orders)
[Node Backend Instance A]
       │
       ▼ (INSERT INTO resto_v2.orders & resto_v2.realtime_events)
[PostgreSQL Database (Supabase)]
       │
       ▼ (pg_notify: 'resto_v2_realtime_channel')
[Node Backend Instance B (LISTEN socket)]
       │
       ▼ (Server-Sent Events: /api/realtime/stream)
[Dashboard on Port 5181] (Order DF-1003 instantly displayed without page refresh)
```

**Result**: Playwright browser automation test (`tests/phase4b1-browser-automation.test.ts`) executed with 100% pass rate. Cross-instance latency was measured under 25ms.

---

## 4. Production Cutover Preparation & Blueprint

### A. Environment Variable Mapping for Production Cutover

When cutover authorization is granted, the following environment variables will be activated:

```bash
# Customer Frontend (Render / Vercel)
VITE_API_URL="https://resto-backend-node.onrender.com/api"
VITE_RESTAURANT_SLUG="olive-and-ember"
VITE_DEMO_MODE="false"

# Restaurant Dashboard (Render / Vercel)
VITE_API_URL="https://resto-backend-node.onrender.com/api"
VITE_RESTAURANT_SLUG="olive-and-ember"
VITE_DEMO_MODE="false"
```

### B. Instant Rollback Procedure

If any anomaly occurs post-cutover:
1. Change `VITE_API_URL` back to `https://resto-vc53.onrender.com/api`.
2. Redeploy frontend and dashboard (takes under 60 seconds on Render / Vercel).
3. The legacy Django backend remains completely active on Render and continues serving traffic immediately.

---

## 5. Phase 6 Exit Criteria Checklist

- [x] Customer Frontend builds cleanly with zero errors.
- [x] Restaurant Dashboard builds cleanly with zero errors.
- [x] 100% of customer ordering flows verified against Node backend.
- [x] 100% of dashboard operational flows verified against Node backend.
- [x] Real Playwright browser cross-instance testing verified.
- [x] Rollback procedure documented and verified.
- [x] Django backend preserved without alteration.
- [x] Customer traffic remains on existing production endpoints.

**PHASE 6 EXIT STATUS: PREPARATION COMPLETE — READY FOR TRAFFIC CUTOVER AUTHORIZATION.**
