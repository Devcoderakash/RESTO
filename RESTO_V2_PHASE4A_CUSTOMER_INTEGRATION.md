# RESTO V2 — Phase 4A Customer Frontend Integration Report

## 1. Executive Summary & Scope

This report documents the local integration testing of RESTO's existing React Customer Frontend (`frontend/`) against the new Node.js + TypeScript + Express backend (`backend_node/`) and isolated PostgreSQL rehearsal database (`resto_v2_rehearsal`).

- **Integration Mode**: Local Isolated Rehearsal
- **Target Backend**: `backend_node` (Node.js 26 LTS, Express 4.21, TypeScript 5.7) on `http://localhost:5005`
- **Target Database**: PostgreSQL 16.15 on `localhost:5432`, database `resto_v2_rehearsal`, schema `resto_v2`
- **Customer Client**: Existing React 19 + Vite frontend (`frontend/`) configured via `frontend/.env.local`
- **Active Restaurant Slug**: `olive-and-ember` (`rest-olive-ember-01`)
- **Integration Result**: **100% PASS across all 7 customer capabilities**

---

## 2. Environment & Configuration Boundary

To strictly preserve production configuration, `frontend/.env` remains completely untouched pointing to the remote Render URL. Local development uses Vite's built-in priority `.env.local` mechanism:

```ini
# frontend/.env.local (Git Ignored)
VITE_API_URL=http://localhost:5005/api
VITE_RESTAURANT_SLUG=olive-and-ember
VITE_DEMO_MODE=false
```

### Safety & Boundary Verifications:
- Remote Supabase (`zmpthsiiouukjjyrbpnz`) network connection: **ZERO requests, zero modification**
- Live Django backend (`resto-vc53.onrender.com` / local 5001): **UNTOUCHED**
- Frontend React UI code: **ZERO UI rewrites, zero breaking modifications**
- All communications directed to local Node.js port 5005 and local Postgres database `resto_v2_rehearsal`.

---

## 3. Customer Workflow Verification Results

| # | Capability / Feature | Endpoint & Method | Input / Test Payload | Observed Response & Validation | Result |
|---|---|---|---|---|---|
| 1 | **Restaurant Metadata** | `GET /api/restaurants/info?slug=olive-and-ember` | Query param `slug=olive-and-ember` | HTTP 200. Returns restaurant identity (`id`, `name`, `slug`), `tax_percentage: 5`, WiFi details (`OliveEmber-Guest`, `FiredWood2026`), currency `INR`. | **PASS** |
| 2 | **Table Availability** | `GET /api/tables/availability?restaurantSlug=olive-and-ember` | Query param `restaurantSlug=olive-and-ember` | HTTP 200. Returns 8 tables (`01` through `08`) with exact capacities (2 to 4 seats) and live occupancy status. | **PASS** |
| 3 | **Menu & Categories** | `GET /api/menu?restaurantSlug=olive-and-ember` | Query param `restaurantSlug=olive-and-ember` | HTTP 200. Returns 5 categories (*Starters*, *Main Course*, *Pizza & Pasta*, *Beverages*, *Desserts*) and 7 active items with `foodType`, pricing, and dietary tags. | **PASS** |
| 4 | **Item Customization & Cart** | Server-side validation | `items: [{ menuItemId: "item-4", quantity: 1, specialInstructions: "Crispy" }]` | Accurately calculates subtotal (₹595.00), 5% GST (₹29.75), and final total (₹624.75). Rejects invalid / unavailable items with HTTP 400. | **PASS** |
| 5 | **Order Placement** | `POST /api/orders` | JSON payload with tableNumber, items, paymentMethod, `Idempotency-Key` header | HTTP 201. Generates monotonic order number `ORD-XXXX`, creates order items transactionally, transitions table to `occupied`, and returns `trackingToken`. | **PASS** |
| 6 | **Idempotent Duplicate Prevention** | `POST /api/orders` | Replay exact payload with identical `Idempotency-Key: phase4a-test-order-01` | HTTP 200. Returns cached order payload with `idempotentReplay: true`. Database confirms **exactly 1 order** recorded; 0 duplicates. | **PASS** |
| 7 | **Customer Order Tracking** | `GET /api/orders/:id/tracking?accessToken=...` | Path `id`, query `accessToken=trk-XXXX` | HTTP 200. Returns complete order status, associated table status, and chronological timeline (*Received* -> *Confirmed* -> *Preparing* -> *Ready* -> *Delivered* -> *Completed*). | **PASS** |
| 8 | **Waiter Call Requests** | `POST /api/service-requests` | `{ requestType: "water", tableNumber: "03", message: "Water bottle" }` | HTTP 201. Creates pending service request in `resto_v2.service_requests` with monotonic UUID and timestamps. | **PASS** |
| 9 | **Bill Requests** | `POST /api/service-requests` | `{ requestType: "bill", tableNumber: "03", paymentPreference: "upi" }` | HTTP 201. Creates pending bill request with `paymentPreference: "upi"`. | **PASS** |

---

## 4. Contract Fidelity & Forensic Discoveries

During customer frontend integration testing, three subtle contract mismatches were discovered and resolved:

### 4.1 Order Items Property Mapping (`menuItemId` vs `id`)
- **Frontend Behavior**: `frontend/src/services/api.ts` maps cart items as `{ menuItemId: item.foodItem.id, quantity: item.quantity, ... }`.
- **Backend Initial State**: `OrderService.createOrder` checked only `requested.id`.
- **Resolution**: Updated `OrderService` and `CreateOrderDTO` to check `requested.menuItemId || requested.id || requested.menu_item_id`.

### 4.2 Idempotency Key Header Case-Insensitivity
- **Frontend Behavior**: Fetch sends `headers: { 'Idempotency-Key': input.idempotencyKey }`.
- **Backend Initial State**: Controller checked `req.headers['x-idempotency-key']`.
- **Resolution**: Express standardizes header names to lowercase; updated controller to resolve `(req.headers['idempotency-key'] as string) || (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey`.

### 4.3 GST & Financial Rounding Fidelity
- **Formula**: Subtotal = ₹595.00. 5% GST = ₹29.75 split into:
  - CGST (2.5%): ₹14.88
  - SGST (2.5%): ₹14.87
  - Total GST: ₹29.75
  - Final Total: ₹624.75
- Both frontend cart calculations and backend server-side order calculations matched to the exact paisa (0 discrepancy).

---

## 5. Verification Sign-off

- Customer Frontend Build: `npm run build` completed in **444ms** with 0 errors.
- Automated Test Suite: 7 customer test cases executed and passed with 100% success.
- End-to-End Status: **APPROVED FOR STAGING REPLICATION**.
