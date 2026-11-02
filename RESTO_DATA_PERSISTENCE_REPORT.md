# RESTO — Permanent Data Persistence & Integrity Report

**Generated:** November 2026  
**System:** RESTO / DineFlow  
**Primary Data Store:** Supabase PostgreSQL 15 (AWS ap-south-1 Mumbai)  
**Client Storage Strategy:** Transient SWR UI Cache (Browser `localStorage`)

---

## 1. Single Source of Truth: Supabase PostgreSQL

All core entity data in RESTO is permanently persisted and strictly mastered in Supabase PostgreSQL:
- **`restaurants`**: Root tenant records with business hours, address, currency (`INR`), and GSTIN.
- **`restaurant_tables`**: Physical floor tables, capacity, dining zones, active status, and QR tokens.
- **`categories`**: Menu catalog taxonomy with ordering priority and visibility flags.
- **`menu_items`**: Dish specifications, dietary attributes (`veg` / `non-veg`), allergen tags, add-on groups, and prices.
- **`orders`**: Permanent financial and fulfillment ledger, order items, customer identity, payment status, 5% GST breakdown, and fulfillment stages (`received`, `preparing`, `ready`, `served`, `completed`, `cancelled`).
- **`service_requests`**: Waiter calls, water requests, cutlery requests, and digital bill generation requests.
- **`realtime_events`**: Append-only transactional event log powering Server-Sent Events (SSE) and sequence synchronization.

---

## 2. Browser Storage vs Master Database Separation

To eliminate historical data corruption and disappearing data bugs:

| Layer | Technology | Retention Policy | Authority | Usage Rule |
| :--- | :--- | :--- | :--- | :--- |
| **System of Record** | Supabase PostgreSQL | Permanent / ACID | **Authoritative (100%)** | All mutations MUST persist here before confirmation. |
| **Event Sequence Log** | `realtime_events` table | Append-only sequence | **Authoritative (100%)** | Powers missed event replay (`id > lastEventId`). |
| **Client UI Cache** | Browser `localStorage` | Ephemeral SWR cache | **Non-authoritative (0%)** | Used solely to paint UI in 0ms on page reload. Never treated as source of truth. |
| **Client Session Cache**| Browser `sessionStorage`| Session lifespan | **Transient** | Temporary staff tokens and order tracking tokens. |

### Elimination of the "Data Disappears on Refresh" Defect
1. **Previous Flaw**: When a user refreshed the browser, Zustand stores re-initialized to `[]`. If the subsequent API call encountered network latency, the screen remained blank or showed 0 records.
2. **Permanent Resolution**: 
   - On page mount, stores immediately read the latest snapshot from `localStorage` (`resto_cache_dashboard_tables`, `resto_cache_dashboard_orders`, etc.).
   - If the user refreshes 10 times consecutively, the cached tables, orders, and menu items remain visible on every frame.
   - The background fetch performs a non-destructive revalidation. If the network call succeeds, it silently updates the store; if it fails, it preserves the existing state and alerts the user.

---

## 3. Opening Day Clean State Audit

In accordance with opening day production requirements:
1. **Table Availability Reset**:
   - Historical test orders (`DF-1001`, `DF-1002`, `DF-1003`) were audited and verified as `completed`.
   - The 8 active physical tables (`01` through `08`) were verified in PostgreSQL with status `'available'`.
   - The customer table availability API (`/api/tables/availability?restaurantSlug=olive-and-ember`) confirms all 8 tables are ready for customer dining sessions.
2. **Menu Catalog Audit**:
   - 7 production menu items across 5 categories are verified in PostgreSQL.
   - Prices, descriptions, food types, and dietary classifications are intact.
3. **Sequence Synchronization**:
   - The `realtime_events` sequence is synchronized with PostgreSQL table IDs, preventing sequence collisions on new event creation.

---

## 4. Foreign Key Integrity & Constraints

- All `menu_items` reference valid `categories` or `NULL` (SET NULL on delete).
- All `orders` reference valid `restaurants` (`rest-olive-ember-01`).
- All `order_items` reference valid `orders` (`ON DELETE CASCADE`).
- All `restaurant_tables` enforce unique `(restaurant_id, table_number)` combinations.

---

## 5. Persistence Verification Checklist

- [x] Primary Key uniqueness enforced across all tables.
- [x] Foreign keys intact and enforced with relational integrity.
- [x] Browser refresh tested: UI retains 100% of visible state across reloads.
- [x] Network disconnection tested: UI retains visible records without wiping.
- [x] Test order cleanup complete: all 8 physical tables available for new guests.

