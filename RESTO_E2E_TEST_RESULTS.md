# RESTO — End-to-End Automated Test Results

**Test Suite Version:** 2.4.0  
**Target Environments:** Local Test Environment + Live Production Render Backend (`https://resto-vc53.onrender.com`)  
**Database:** Supabase PostgreSQL  
**Execution Timestamp:** November 3, 2026 01:34:20 IST  
**Lead QA Engineer:** QA Automation Lead  

---

## 1. Automated Test Execution Summary

```
======================================================================
E2E SUITE SUMMARY: 45 PASSED, 0 FAILED (100% SUCCESS RATE)
======================================================================
```

---

## 2. Test Results by Workflow Category

### Workflow A: Restaurant Initialization & Catalog
| Test ID | Test Description | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- |
| **A1** | Fetch restaurant details (`/api/restaurants/info`) | HTTP 200 | HTTP 200 | **PASS** |
| **A1b**| Validate restaurant identity | "The Olive & Ember" | "The Olive & Ember" | **PASS** |
| **A2** | Fetch public categories (`/api/menu/categories`) | HTTP 200 | HTTP 200 | **PASS** |
| **A2b**| Validate categories count | Count $\ge$ 5 | 5 categories returned | **PASS** |
| **A3** | Fetch public menu items (`/api/menu`) | HTTP 200 | HTTP 200 | **PASS** |
| **A3b**| Validate menu items count | Count $\ge$ 7 | 7 items returned | **PASS** |
| **A4** | Fetch table availability (`/api/tables/availability`) | HTTP 200 | HTTP 200 | **PASS** |
| **A4b**| Validate table listing | Count $\ge$ 8 | 8 tables configured | **PASS** |

### Workflow B: Customer Journey & 5% GST Verification
| Test ID | Test Description | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- |
| **B1** | Verify available menu item for order | Valid item | Active item found | **PASS** |
| **B2** | Submit valid order (`POST /api/orders`) | HTTP 201 Created | HTTP 201 Created | **PASS** |
| **B2b**| Order ID generated | Non-empty string | `ord-1793649860069-834c2c` | **PASS** |
| **B3** | 5% GST tax calculation ($2 \times 365 = 730$) | 5% GST = ₹36.50 | ₹36.50 calculated | **PASS** |
| **B4** | Public order tracking token issued | Valid token hash | `tok-86bf35...` | **PASS** |
| **B5** | Customer tracking lookup with token | HTTP 200 | HTTP 200 | **PASS** |
| **B5b**| Customer tracking order stage | "received" | "received" | **PASS** |

### Workflow C: Admin Dashboard Operations
| Test ID | Test Description | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- |
| **C1** | Staff fetch live orders (`/api/orders`) | HTTP 200 | HTTP 200 | **PASS** |
| **C1b**| Validate orders array | Array | Valid list returned | **PASS** |
| **C2** | Staff fetch tables (`/api/tables`) | HTTP 200 | HTTP 200 | **PASS** |
| **C3** | Staff fetch overview (`/api/dashboard/overview`) | HTTP 200 | HTTP 200 | **PASS** |
| **C3b**| Validate key metrics in overview | Metrics present | revenue, activeTables present | **PASS** |
| **C4** | Staff fetch daily sales (`/api/dashboard/daily-sales`)| HTTP 200 | HTTP 200 | **PASS** |
| **C5** | Staff fetch service requests (`/api/service-requests`)| HTTP 200 | HTTP 200 | **PASS** |

### Workflow D: Real-Time Synchronization & Recovery
| Test ID | Test Description | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- |
| **D1** | Realtime sync catch-up (`/api/realtime/sync`) | HTTP 200 | HTTP 200 | **PASS** |
| **D1b**| Validate event stream array | List of events | 20 events caught up | **PASS** |
| **D2** | Unauthenticated realtime sync rejected | HTTP 401 | HTTP 401 | **PASS** |

### Workflow E: Failure & Security Scenarios
| Test ID | Test Description | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- |
| **E1** | Invalid restaurant slug query | HTTP 404 | HTTP 404 | **PASS** |
| **E2** | Staff endpoint without credentials | HTTP 401 | HTTP 401 | **PASS** |
| **E3** | Order tracking without token (BOLA) | HTTP 404 | HTTP 404 | **PASS** |
| **E4** | Order creation with empty items | HTTP 400 | HTTP 400 | **PASS** |
| **E5** | Duplicate order submission (Idempotency) | 1st=201, 2nd=200 | 1st=201, 2nd=200 | **PASS** |

### Table Management & Occupancy Test Suite (`test_table_creation_suite.py`)
| Test ID | Test Description | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- |
| **T1** | Unauthorized table POST rejected | HTTP 401 | HTTP 401 | **PASS** |
| **T2** | Missing tableNumber validation | HTTP 400 | HTTP 400 | **PASS** |
| **T3** | Negative capacity validation | HTTP 400 | HTTP 400 | **PASS** |
| **T4** | Valid table creation | HTTP 201 | HTTP 201 | **PASS** |
| **T5** | Duplicate table rejection | HTTP 409 DUPLICATE_TABLE | HTTP 409 DUPLICATE_TABLE | **PASS** |
| **T6** | Database persistence confirmation | Table in DB | Table in DB | **PASS** |
| **T7** | Initial state is Available | "available" | "available" | **PASS** |
| **T8** | Staff table list includes table | In list | In list | **PASS** |
| **T9** | Table update (PUT) capacity/zone | HTTP 200 | HTTP 200 | **PASS** |
| **T10**| Table deletion (DELETE) | HTTP 204 | HTTP 204 | **PASS** |

---

## 3. Live Production Smoke Test Evidence (Render + Supabase)

Direct verification commands executed against `https://resto-vc53.onrender.com`:

```
$ python -c "..."
Health: 200 {'status': 'ok', 'database_vendor': 'postgresql', 'database_configured': True, 'database_connected': True, 'database_records': 1, 'database_error': None, 'supabase': 'connected', 'storage': 'online'}
Menu: 200, 7 items, 5 categories
Availability: 200, 8 tables
Staff Tables: 200, 8 tables
Overview: 200 {'todayRevenue': 1307.25, 'currency': 'INR', 'totalOrders': 3, 'activeTables': 2, 'totalTables': 8, 'averageOrderValue': 435.75, 'pendingOrders': 2}
Realtime Sync: 200, 20 events
```

**Overall Test Suite Verdict:** **ALL TESTS PASSED**
