# RESTO — Security & Tenant Isolation Regression Report

**Audit Target:** RESTO Backend & Frontend Architecture  
**Standards:** OWASP Top 10 API Security Risks (2023)  
**Verification Date:** November 3, 2026  
**Auditor:** Senior Security Architect & DevOps Lead  

---

## 1. Security Controls & Threat Mitigation Matrix

| OWASP Threat Category | RESTO Risk Vector | Mitigation Implemented | Verification Evidence | Status |
| :--- | :--- | :--- | :--- | :--- |
| **API1: Broken Object Level Auth (BOLA)** | Scraping other customers' order details | SHA-256 HMAC tracking tokens (`accessToken`) verified using `hmac.compare_digest` | Request without token returns 404/401 | PASS |
| **API2: Broken Authentication** | Public access to staff dashboard endpoints | Staff endpoints protected by `IsStaffOrDashboardAccess`; Bearer tokens validated | Unauthenticated requests return 401 | PASS |
| **API3: Broken Object Property Level Auth** | Client-supplied prices or manipulated GST | Server recalculates line totals, 5% GST, and final totals from database prices | Injected prices overwritten by ORM | PASS |
| **API4: Unrestricted Resource Consumption** | Rapid order spam or table hoarding | Atomic transaction row locking (`select_for_update`) and idempotency checks | Duplicate submit returns existing order | PASS |
| **API5: Broken Function Level Auth** | Customer accessing table management or KDS | Strict role separation between public endpoints and staff endpoints | Customer cannot invoke `/api/tables` POST | PASS |
| **API7: Server-Side Request Forgery (SSRF)** | Arbitrary image upload or URL fetching | Supabase Storage scoped strictly to private bucket `resto-media` | Arbitrary URL upload disallowed | PASS |
| **API8: Security Misconfiguration** | Database credentials leaked in logs | `db_utils.py` redacts credentials; health checks report only booleans | Logs contain zero plaintext passwords | PASS |
| **Credential in Query Strings** | Staff tokens exposed in SSE stream URLs | Removed `staffToken` query parameter; enforced `Authorization: Bearer` headers | Query param tokens rejected | PASS |
| **Tenant Isolation Bypass** | Multi-tenant cross-contamination | Every query filters by `restaurant=restaurant` resolved from validated slug | Cross-tenant lookups return 404 | PASS |

---

## 2. Key Architectural Security Implementations

### A. Customer Order Tracking (BOLA / IDOR Protection)
In [`backend/apps/orders/views.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/orders/views.py):
```python
if order.tracking_token_hash:
    is_staff = False
    try:
        is_staff = IsStaffOrDashboardAccess().has_permission(request, None)
    except Exception:
        is_staff = False

    if not is_staff:
        if not access_token or not verify_tracking_token(access_token, order.tracking_token_hash):
            raise NotFound({"error": {"code": "NOT_FOUND", "message": "Order not found"}})
```
- Customers cannot guess or enumerate order IDs to view other tables' orders or guest names.
- Timing-safe comparison (`hmac.compare_digest`) prevents timing side-channel attacks.

### B. Secret Key Management & Bundle Inspection
- **Frontend Inspection:** Neither `VITE_SUPABASE_SERVICE_ROLE_KEY` nor database credentials exist in `frontend/.env`, `dashboard/.env`, or the compiled Vite dist bundles.
- **Backend Inspection:** Supabase service-role keys and PostgreSQL credentials reside solely within Render server-side environment variables.
- **Credential Redaction in Logs:** All database configuration logging in `backend/config/settings.py` strips passwords, hosts, and usernames, outputting only validated boolean flags and scheme protocols.

