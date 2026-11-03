# RESTO V2 — PHASE 3B: BACKEND INTEGRATION & STAGING TEST REPORT

**Date:** November 3, 2026  
**Auditor:** Principal Node.js Engineer & Integration Lead  
**Backend:** Express + TypeScript RESTO V2 Application (`backend_node`)  
**Database Target:** `postgresql://localhost:5432/resto_v2_rehearsal`  
**Test Suite:** `backend_node/tests/rehearsal-backend-integration.test.ts`  
**Total Tests:** 11 Test Scenarios  
**Results:** 11 Passed / 0 Failed (100% PASS)  

---

## 1. Executive Summary

This report documents the live integration testing of the new Node.js + TypeScript backend connected directly to the migrated local rehearsal database `resto_v2_rehearsal`. Both read workflows across migrated historical V1 data and write workflows using isolated synthetic test transactions were executed and verified.

---

## 2. Test Execution Breakdown

### Section 1: Migrated V1 Data Retrieval & Dashboard Reporting

| Test Case | Method & Endpoint | Payload / Query | Verified Response | Status |
| :--- | :---: | :--- | :--- | :---: |
| **1.1 Restaurant Metadata** | `GET` `/api/restaurants/olive-and-ember` | Slug: `olive-and-ember` | `{id: "rest-olive-ember-01", name: "The Olive & Ember", currency: "INR"}` | **PASS** |
| **1.2 Public Customer Menu** | `GET` `/api/menu` | `?restaurantSlug=olive-and-ember` | Returns 5 categories containing all 7 menu items (*Arancini*, *Pizza*, etc.) | **PASS** |
| **1.3 Table Availability** | `GET` `/api/tables/availability` | `?restaurantSlug=...&tableNumber=01` | Returns all 8 tables; Table 01 confirmed `available` | **PASS** |
| **1.4 Staff Order Feed** | `GET` `/api/orders` | Auth: Bearer Manager JWT | Returns migrated production orders (including `DF-1001`) | **PASS** |
| **1.5 Analytics Overview** | `GET` `/api/dashboard/overview` | Auth: Bearer Manager JWT | Revenue = ₹1,134.00, Total Orders = 2 | **PASS** |

---

### Section 2: Synthetic Order Placement, Idempotency & Lifecycle

To test write paths without corrupting historical records, synthetic test transactions were isolated:

| Test Case | Method & Endpoint | Payload / Details | Verified Response | Status |
| :--- | :---: | :--- | :--- | :---: |
| **2.1 Order Placement** | `POST` `/api/orders` | 2x Truffle Arancini @ ₹425 (Subtotal: ₹850.00) | `201 Created`: Subtotal ₹850.00, GST ₹42.50, Total ₹892.50, trackingToken issued | **PASS** |
| **2.2 Idempotency Replay** | `POST` `/api/orders` | Replayed identical request with same `idempotencyKey` | `200 OK`: `idempotentReplay: true`, returned existing `orderId`, 0 duplicate rows | **PASS** |
| **2.3 State Transitions** | `PATCH` `/api/orders/:id/status` | `preparing` -> `ready` -> `completed` | Verified sequential kitchen lifecycle; updated status timeline | **PASS** |
| **2.4 Payment Recording** | `POST` `/api/payments` | UPI payment for ₹892.50 | `201 Created`: `paymentStatus: "completed"`, order marked completed, table released | **PASS** |

---

### Section 3: Service Requests & Realtime Delta Synchronization

| Test Case | Method & Endpoint | Payload / Details | Verified Response | Status |
| :--- | :---: | :--- | :--- | :---: |
| **3.1 Service Request Lifecycle** | `POST` & `PATCH` `/api/service-requests` | Water request for Table 08 -> `completed` | `201 Created` for customer request; `200 OK` for staff completion | **PASS** |
| **3.2 Realtime Delta Recovery** | `GET` `/api/realtime/sync` | `?restaurantId=...&lastEventId=0` | Returns missed outbox events stream and `latestEventId` cursor | **PASS** |

---

## 3. Automated Vitest Execution Log

```
 RUN  v3.2.7 /Users/akashlodhi/Downloads/RESTO/backend_node

 ✓ tests/rehearsal-backend-integration.test.ts (11 tests) 95ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 1. Migrated V1 Data Retrieval > retrieves migrated restaurant details by slug 30ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 1. Migrated V1 Data Retrieval > retrieves public customer menu containing all 5 categories and 7 items 7ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 1. Migrated V1 Data Retrieval > verifies table availability for migrated tables 3ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 1. Migrated V1 Data Retrieval > lists migrated staff orders via authenticated dashboard endpoint 6ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 1. Migrated V1 Data Retrieval > calculates dashboard metrics across migrated production dataset 3ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 2. Synthetic Order Placement & Concurrency on Rehearsal DB > places a new customer order with tax calculations 17ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 2. Synthetic Order Placement & Concurrency on Rehearsal DB > guarantees idempotency when identical order request is replayed 2ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 2. Synthetic Order Placement & Concurrency on Rehearsal DB > transitions order status through kitchen lifecycle: preparing -> ready -> completed 11ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 2. Synthetic Order Placement & Concurrency on Rehearsal DB > records a payment against the synthetic order 5ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 3. Service Requests & Realtime Delta Synchronization > creates and resolves customer service request (waiter call) 5ms
   ✓ RESTO V2 — Staging & Rehearsal Backend Live Integration Tests > 3. Service Requests & Realtime Delta Synchronization > recovers missed realtime events via delta sync endpoint 3ms

 Test Files  1 passed (1)
      Tests  11 passed (11)
   Duration  756ms
```

---

## 4. Backend Integration Verdict

The Node.js backend operates with complete functional and transactional fidelity when connected to the migrated V2 schema.

**Backend Integration Assessment: 100% PASS.**
