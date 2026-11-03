# RESTO — Backend Security & Vulnerability Forensic Audit

**Document Version:** 1.0.0 (Forensic Technical Audit)  
**Date:** 2026-11-03  
**Auditor:** Principal Application Security Architect & Production Security SRE  
**Scope:** Forensic security audit comparing Django (`backend/`) and Express (`backend_express_backup/`) across OWASP Top 10 API Security Risks.  
**Operational Status:** READ-ONLY FORENSIC AUDIT (Zero modifications to source code or schemas).

---

## 1. Executive Security Summary

A rigorous security comparison reveals that **the Django backend is hardened, defensively structured, and protected against common API vulnerabilities**, whereas **the Express backup contains a Critical authentication bypass that allows unauthenticated callers to execute administrative actions**.

### Severity Breakdown
- **Django Backend:** 0 Critical, 0 High, 1 Medium (CORS wildcards for preview domains), 1 Low.
- **Express Backend:** **1 Critical (Universal Admin Escalation on invalid tokens)**, **2 High (RLS bypass via Service Role Key, Shared In-Memory Data Pollution)**, 1 Medium (Hardcoded demo bypass in login), 1 Low.

---

## 2. Master Vulnerability Comparison Matrix

| Security Threat Category | Django Backend (`backend/`) | Express Backup (`backend_express_backup/`) | Severity (Express) |
|---|---|---|---|
| **Authentication Bypass** | **Protected:** Strict token verification (`IsStaffOrDashboardAccess`). Invalid tokens return HTTP 401. | **CRITICAL FLAW:** Catch blocks in `auth.ts` automatically assign `restaurant_admin` to any invalid Bearer token. | **CRITICAL** |
| **BOLA / IDOR (Order Tracking)** | **Protected:** Enforces HMAC-SHA256 token verification (`verify_tracking_token`) before releasing order details. | **Protected:** Hashes tracking token and checks against database or RAM hash. | Low |
| **SQL Injection** | **Protected:** 100% parameterized queries via Django ORM SQL compiler. | **Protected:** PostgREST parameterized queries via Supabase client. | Low |
| **Row-Level Security (RLS) Bypass** | **Enforced:** Connects via application database user; queries scoped strictly in ORM. | **BYPASS:** Uses `SUPABASE_SERVICE_ROLE_KEY` exclusively, bypassing all RLS policies. | **HIGH** |
| **Multi-Tenant Data Isolation** | **Enforced:** All querysets filter by `restaurant=restaurant`. Cross-tenant staff access blocked. | **VULNERABLE:** Token fallback forces all unauthenticated queries into `localStore.restaurant.id`. | **HIGH** |
| **Broken Function-Level Auth** | **Protected:** Sensitive mutations (`/api/tables`, `/api/menu`, `/api/orders/<pk>/status`) require staff authorization. | **VULNERABLE:** Because invalid tokens auto-escalate to admin, staff routes can be called by anyone. | **CRITICAL** |
| **Unsafe File Uploads** | **Protected:** Validates MIME types, extensions, size limits (<5MB), and generates unique UUID paths. | **MISSING:** Upload endpoint does not exist. | N/A |
| **Credential & Secret Exposure** | **Protected:** `print_safe_diagnostics` redacts passwords; error handlers sanitize stack traces. | **Protected:** Redacts env variables on startup. | Low |
| **Cross-Origin Resource Sharing (CORS)**| `CORS_ALLOW_ALL_ORIGINS = True` (Permissive for preview domains). | Validates `CLIENT_ORIGINS` from environment. | Medium (Django) |
| **Rate Limiting** | Handled at Cloudflare Edge proxy layer. | Handled via `express-rate-limit` middleware in memory. | Low |
| **Security Headers** | Emits `X-Content-Type-Options`, `X-Frame-Options: DENY`, `HSTS`, `CSP`. | Emits Helmet default security headers. | Low |

---

## 3. Deep-Dive on Critical Vulnerabilities in Express

### 3.1 CRITICAL: Universal Admin Escalation via Invalid Token (`auth.ts`)
In [`backend_express_backup/src/middleware/auth.ts`](file:///Users/akashlodhi/Downloads/RESTO/backend_express_backup/src/middleware/auth.ts#L29-L56):
```typescript
try {
  const { data, error } = await adminSupabase.auth.getUser(token);
  if (error || !data.user) {
    // If Supabase token check fails but it's a demo session
    req.authUser = {
      id: "demo-manager-id",
      email: "contact@grandbistrolounge.com",
    } as any;
    next();
    return;
  }
} catch {
  req.authUser = { id: "demo-manager-id", ... } as any;
  next();
}
```
And in lines 74–100:
```typescript
if (error || !data) {
  req.staff = {
    id: "demo-staff-id",
    restaurant_id: localStore.restaurant.id,
    role: "restaurant_admin",
    full_name: "Restaurant Manager",
  };
  next();
  return;
}
```

#### Attack Scenario:
1. Attacker sends:
   ```http
   DELETE /api/menu/item-123 HTTP/1.1
   Host: api.resto.com
   Authorization: Bearer totally-fake-token-12345
   ```
2. `adminSupabase.auth.getUser('totally-fake-token-12345')` returns an error (`invalid token`).
3. Express catches the error and assigns `req.authUser.id = 'demo-manager-id'`.
4. `requireStaff` checks for staff profile, catches an error or finds no user, and assigns `role = 'restaurant_admin'`.
5. The request passes through `allowRoles("restaurant_admin")` successfully.
6. **Result:** The menu item is deleted by an unauthorized attacker.

---

## 4. Security Audit Verdict

The Django backend demonstrates **robust production-grade security**, strict HMAC token verification for customer tracking, parameterized query compilation, and sanitized error logging. 

The Express backend contains a **show-stopping critical security flaw** that completely bypasses authentication and elevates arbitrary callers to restaurant administrators. Express cannot be deployed to any public environment without rewriting its authentication subsystem.

