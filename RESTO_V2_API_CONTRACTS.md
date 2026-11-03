# RESTO V2 — Comprehensive API Contract & Route Mapping Specification

**Document Version:** 1.0.0 (Phase 2 API Specifications)  
**Date:** 2026-11-03  
**Auditor / Architect:** Principal API Architect & Full-Stack Integration Engineer  
**Scope:** Exhaustive mapping of all 45 API endpoints across Customer App (`frontend/`) and Admin Dashboard (`dashboard/`) to their corresponding `backend_node/` implementations.  
**Compatibility Guarantee:** **100% Zero-Redesign Frontend Parity**

---

## 1. Executive Summary

To ensure seamless production switchover without modifying either frontend application, `backend_node` adopts a **Strict Contract Preservation Architecture**:
1. **Dual-Route Mounting:** Every endpoint is mounted with and without the `/api` prefix (e.g. `/api/orders` and `/orders`).
2. **Trailing Slash Normalization:** Middleware transparently handles both `/api/tables` and `/api/tables/`.
3. **Exact Field Name Compatibility:** Responses provide both camelCase and snake_case aliases where existing frontend components consume them (e.g. `tableNumber` and `table_number`).

---

## 2. Complete 45-Endpoint Mapping Specification

### 2.1 System Probes & Health (3 Routes)

#### 1. `GET /api/health/live` & `GET /health/live`
- **Controller:** `modules/analytics/controller.ts` -> `getLiveness`
- **Auth:** Public
- **Response (200 OK):**
  ```json
  {
    "status": "alive",
    "service": "resto-backend-node",
    "timestamp": "2026-11-03T21:20:00.000Z"
  }
  ```

#### 2. `GET /api/health/ready` & `GET /health/ready`
- **Controller:** `modules/analytics/controller.ts` -> `getReadiness`
- **Auth:** Public
- **DB Query:** `SELECT 1;`
- **Response (200 OK or 503 Service Unavailable):**
  ```json
  {
    "status": "ready",
    "database": "connected",
    "database_vendor": "postgresql",
    "db_latency_ms": 1.25,
    "timestamp": "2026-11-03T21:20:00.000Z"
  }
  ```

#### 3. `GET /api/health` & `GET /health`
- **Controller:** `modules/analytics/controller.ts` -> `getHealthDiagnostics`
- **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "database_vendor": "postgresql",
    "database_configured": true,
    "database_connected": true,
    "db_latency_ms": 1.5,
    "supabase": "connected",
    "storage": "online",
    "timestamp": "2026-11-03T21:20:00.000Z"
  }
  ```

---

### 2.2 Restaurants & Configuration (4 Routes)

#### 4. `GET /api/restaurants/info`
- **Query Params:** `?slug=olive-and-ember`
- **Controller:** `modules/restaurants/controller.ts` -> `getRestaurantInfo`
- **Response (200 OK):**
  ```json
  {
    "id": "rest-olive-ember-01",
    "name": "The Olive & Ember",
    "slug": "olive-and-ember",
    "description": "Wood-fired Mediterranean and contemporary dining.",
    "address": "14, Wood Street, Bengaluru",
    "phone": "+91 98765 43210",
    "email": "concierge@oliveandember.com",
    "wifi_ssid": "OliveGuest",
    "wifi_password": "welcome2026",
    "tax_percentage": 5.0,
    "service_charge_percentage": 0.0,
    "currency": "INR"
  }
  ```

#### 5. `GET /api/restaurants/:slug`
- **Response (200 OK):** Same schema as above.

#### 6. `GET /api/staff/restaurant-settings`
- **Auth:** Staff Bearer Token
- **Controller:** `modules/settings/controller.ts` -> `getStaffSettings`
- **Response (200 OK):** Includes full opening hours, tax, service charge, wifi, and notification settings.

#### 7. `PUT /api/restaurants/settings`
- **Auth:** Staff Bearer Token
- **Payload:**
  ```json
  {
    "name": "The Olive & Ember",
    "taxPercentage": 5.0,
    "serviceChargePercentage": 0.0,
    "wifiSsid": "OliveGuest",
    "wifiPassword": "welcome2026",
    "openingHours": { "daily": "12:00 PM – 11:30 PM" }
  }
  ```
- **Response (200 OK):** Updated settings object.

---

### 2.3 Tables Management (6 Routes)

#### 8. `GET /api/tables/availability`
- **Query Params:** `?restaurantSlug=olive-and-ember`
- **Business Logic:** Queries tables and cross-references active dining orders.
- **Response (200 OK):**
  ```json
  {
    "tables": [
      { "number": "01", "table_number": "01", "capacity": 4, "zone": "Main Dining", "status": "available" },
      { "number": "06", "table_number": "06", "capacity": 4, "zone": "Main Dining", "status": "occupied" }
    ]
  }
  ```

#### 9. `GET /api/tables`
- **Auth:** Staff Bearer Token
- **Response (200 OK):**
  ```json
  {
    "tables": [
      { "id": "tbl-e25df5aa", "table_number": "01", "tableNumber": "01", "capacity": 4, "zone": "Main Dining", "status": "available", "qr_code_url": "/menu?table=01" }
    ]
  }
  ```

#### 10. `POST /api/tables`
- **Auth:** Staff Bearer Token
- **Payload:** `{"tableNumber": "09", "capacity": 6, "zone": "Patio & Outdoor", "status": "available"}`
- **Response (201 Created):** Created table record with generated `id` (`tbl-...`).

#### 11. `PUT /api/tables/:id`
- **Auth:** Staff Bearer Token
- **Payload:** `{"tableNumber": "09", "capacity": 8, "zone": "Patio & Outdoor", "status": "available"}`
- **Response (200 OK):** Updated table record.

#### 12. `PATCH /api/tables/:id/status`
- **Auth:** Staff Bearer Token
- **Payload:** `{"status": "available"}`
- **Validation:** Rejects clearing to `'available'` with HTTP 409 if active uncompleted orders remain on the table.
- **Response (200 OK):** Updated status record.

#### 13. `DELETE /api/tables/:id`
- **Auth:** Staff Bearer Token
- **Validation:** Rejects deletion with HTTP 409 if table has active dining orders.
- **Response (204 No Content)**

---

### 2.4 Menu & Categories (10 Routes)

#### 14. `GET /api/menu`
- **Query Params:** `?restaurantSlug=olive-and-ember`
- **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "item-1",
        "name": "Truffle & Wild Mushroom Arancini",
        "description": "Crispy rice croquettes...",
        "price": 425.0,
        "categoryId": "cat-starters",
        "categoryName": "Starters",
        "imageUrl": "https://...",
        "foodType": "veg",
        "isVeg": true,
        "isPopular": true,
        "isChefSpecial": true,
        "isAvailable": true,
        "prepTimeMinutes": 16,
        "customizationGroups": [...]
      }
    ],
    "categories": [
      { "id": "cat-starters", "name": "Starters", "description": "Small plates..." }
    ]
  }
  ```

#### 15. `GET /api/menu/categories`
- **Response (200 OK):** Category list with `id`, `name`, `description`, `image_url`, `sort_order`.

#### 16. `GET /api/staff/menu`
- **Auth:** Staff Bearer Token
- **Response (200 OK):** Full management items with category associations and counts.

#### 17. `POST /api/staff/menu` & `POST /api/menu`
- **Auth:** Staff Bearer Token
- **Payload:**
  ```json
  {
    "name": "Smoked Burrata",
    "categoryId": "cat-starters",
    "price": 495.0,
    "foodType": "veg",
    "description": "Heirloom tomatoes...",
    "available": true,
    "popular": false,
    "preparationTimeMinutes": 12
  }
  ```
- **Response (201 Created):** Created dish record.

#### 18. `PATCH /api/menu/:id`
- **Auth:** Staff Bearer Token
- **Payload:** Partial item updates.
- **Response (200 OK):** Updated dish record.

#### 19. `PATCH /api/menu/:id/availability`
- **Auth:** Staff Bearer Token
- **Payload:** `{"available": false}`
- **Response (200 OK):** `{"id": "item-1", "available": false}`

#### 20. `DELETE /api/menu/:id`
- **Auth:** Staff Bearer Token
- **Response (204 No Content)**

#### 21. `POST /api/upload` (Storage Upload)
- **Auth:** Staff Bearer Token
- **Request:** `multipart/form-data` with `file`
- **Controller:** `modules/uploads/controller.ts`
- **Response (200 OK):**
  ```json
  {
    "url": "https://zmpthsiiouukjjyrbpnz.supabase.co/storage/v1/object/public/resto-media/menu-items/dish-abc.png",
    "path": "menu-items/dish-abc.png",
    "size": 13057
  }
  ```

#### 22. `POST /api/categories`
- **Auth:** Staff Bearer Token
- **Payload:** `{"name": "Chef Specials", "sortOrder": 6, "isVisible": true}`
- **Response (201 Created)**

#### 23. `PUT /api/categories/:id`
- **Auth:** Staff Bearer Token
- **Payload:** `{"name": "Chef Tasting Menu", "sortOrder": 6, "isVisible": true}`
- **Response (200 OK)**

#### 24. `DELETE /api/categories/:id`
- **Auth:** Staff Bearer Token
- **Response (204 No Content)**

---

### 2.5 Orders & Realtime State Machine (5 Routes)

#### 25. `POST /api/orders` (Order Placement)
- **Payload:**
  ```json
  {
    "restaurantSlug": "olive-and-ember",
    "tableNumber": "04",
    "customerName": "Rohan Sharma",
    "customerPhone": "+919876543210",
    "idempotencyKey": "idemp-9988-aabb",
    "paymentMethod": "upi",
    "items": [
      {
        "menuItemId": "item-1",
        "quantity": 2,
        "selectedAddons": [{ "id": "sharing", "name": "Sharing Plate", "price": 180 }]
      }
    ]
  }
  ```
- **Controller:** `modules/orders/controller.ts` -> `createOrder`
- **Business Logic:**
  1. Idempotency indexed lookup.
  2. Database price verification (tamper-proof).
  3. Atomic transaction insert: `Order` + `OrderItems` + Table `status='occupied'`.
  4. Generates HMAC-SHA256 tracking token.
  5. Emits `order:created` SSE event.
- **Response (201 Created):**
  ```json
  {
    "id": "ord-1793716091124-77a812",
    "orderNumber": "DF-1002",
    "tableNumber": "04",
    "customerName": "Rohan Sharma",
    "status": "pending",
    "accessToken": "tok-7c98e21a...",
    "breakdown": {
      "subtotal": 1210.0,
      "cgst": 30.25,
      "sgst": 30.25,
      "gstTotal": 60.50,
      "serviceCharge": 0.0,
      "finalTotal": 1270.50
    },
    "items": [...]
  }
  ```

#### 26. `GET /api/orders`
- **Auth:** Staff Bearer Token
- **Query Params:** `?limit=50&offset=0&status=pending`
- **Response (200 OK):**
  ```json
  {
    "orders": [...],
    "total": 2,
    "limit": 50,
    "offset": 0
  }
  ```

#### 27. `GET /api/orders/:id`
- **Auth:** Staff Bearer Token
- **Response (200 OK):** Detailed order record with items.

#### 28. `GET /api/orders/:id/tracking`
- **Query Params:** `?accessToken=tok-7c98e21a...`
- **Security:** HMAC hash comparison against `tracking_token_hash`.
- **Response (200 OK):** Customer tracking payload with breakdown and ETA.

#### 29. `PATCH /api/orders/:id/status`
- **Auth:** Staff Bearer Token
- **Payload:** `{"status": "confirmed"}` (or `"preparing"`, `"ready"`, `"served"`, `"completed"`, `"cancelled"`)
- **Business Logic:** Row lock, transition validation, status update, SSE event emit.
- **Response (200 OK):** Updated order.

---

### 2.6 Service Requests (3 Routes)

#### 30. `POST /api/service-requests`
- **Payload:**
  ```json
  {
    "restaurantSlug": "olive-and-ember",
    "tableNumber": "04",
    "requestType": "call_waiter",
    "message": "Need water and napkins"
  }
  ```
- **Response (201 Created):** Service request record. Emits `service:requested` SSE event.

#### 31. `GET /api/service-requests`
- **Auth:** Staff Bearer Token
- **Response (200 OK):** `{"serviceRequests": [...]}`

#### 32. `PATCH /api/service-requests/:id`
- **Auth:** Staff Bearer Token
- **Payload:** `{"status": "completed"}`
- **Response (200 OK):** Updated request. Emits `service:resolved` SSE event.

---

### 2.7 Payments & Billing (3 Routes)

#### 33. `GET /api/payments`
- **Auth:** Staff Bearer Token
- **Response (200 OK):** `{"payments": [...]}`

#### 34. `POST /api/payments`
- **Auth:** Staff Bearer Token
- **Payload:**
  ```json
  {
    "orderId": "ord-1793716091124-77a812",
    "amount": 1270.50,
    "paymentMethod": "upi",
    "transactionReference": "UPI-REF-887766"
  }
  ```
- **Business Logic:** Atomic insert into `payments`, order `status='completed'`, auto-releases table if no active orders remain. Emits `payment:received`, `order:completed`, and `table:released` SSE events.
- **Response (201 Created)**

#### 35. `PATCH /api/payments/:id/status`
- **Auth:** Staff Bearer Token
- **Payload:** `{"status": "completed"}`
- **Response (200 OK)**

---

### 2.8 Dashboard Analytics (3 Routes)

#### 36. `GET /api/dashboard/overview`
- **Auth:** Staff Bearer Token
- **Response (200 OK):**
  ```json
  {
    "todayRevenue": 1685.25,
    "currency": "INR",
    "totalOrders": 2,
    "activeTables": 1,
    "totalTables": 8,
    "averageOrderValue": 842.62,
    "pendingOrders": 1
  }
  ```

#### 37. `GET /api/dashboard/recent-orders`
- **Auth:** Staff Bearer Token
- **Response (200 OK):** Top 10 recent orders.

#### 38. `GET /api/dashboard/daily-sales`
- **Auth:** Staff Bearer Token
- **Response (200 OK):**
  ```json
  {
    "sales": [
      { "date": "2026-11-02", "total": 1270.50 },
      { "date": "2026-11-03", "total": 414.75 }
    ]
  }
  ```

---

### 2.9 Staff & Authentication (5 Routes)

#### 39. `GET /api/staff`
- **Auth:** Staff Bearer Token
- **Response (200 OK):** `{"staff": [...]}`

#### 40. `POST /api/staff`
- **Auth:** Staff Bearer Token
- **Payload:** `{"name": "Ananya Roy", "email": "ananya@oliveandember.com", "role": "chef"}`
- **Response (201 Created)**

#### 41. `PATCH /api/staff/:id/status`
- **Auth:** Staff Bearer Token
- **Payload:** `{"isActive": false}`
- **Response (200 OK)**

#### 42. `POST /api/auth/login`
- **Payload:** `{"email": "manager@oliveandember.com", "password": "..."}`
- **Response (200 OK):**
  ```json
  {
    "accessToken": "staff-token-...",
    "refreshToken": "staff-refresh-...",
    "expiresAt": 1793730000,
    "user": { "id": "staff-manager-01", "email": "manager@oliveandember.com" }
  }
  ```

#### 43. `GET /api/auth/me`
- **Auth:** Staff Bearer Token
- **Response (200 OK):** Current staff user profile and permissions.

---

### 2.10 Real-Time Subsystem (2 Routes)

#### 44. `GET /api/realtime/stream`
- **Protocol:** Server-Sent Events (`text/event-stream`)
- **Query Params:** `?restaurantSlug=olive-and-ember&targetOrderId=...`
- **Mechanics:** 20-second chunk rotation, 5-second `: keep-alive\n\n` comments, event stream frame formatting.

#### 45. `GET /api/realtime/sync`
- **Auth:** Staff Bearer Token
- **Query Params:** `?restaurantSlug=olive-and-ember&lastEventId=142`
- **Response (200 OK):**
  ```json
  {
    "events": [
      { "id": 143, "type": "order:created", "timestamp": "...", "payload": {...} }
    ]
  }
  ```

