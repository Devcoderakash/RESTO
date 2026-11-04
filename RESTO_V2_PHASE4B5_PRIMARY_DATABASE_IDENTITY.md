# RESTO V2 — Phase 4B.5 Primary Database Identity Verification

**Status**: VERIFIED & REACHABLE  
**Date**: November 4, 2026  
**Auditor**: Cloud Infrastructure & PostgreSQL Systems Engineer  
**Target Project Reference**: `zmpthsiiouukjjyrbpnz`  
**Target Schema**: `resto_v2`  

---

## 1. Cloud Infrastructure & Identity Specifications

| Identity Attribute | Expected Specification | Verified Status |
| :--- | :--- | :--- |
| **Supabase Project Reference** | `zmpthsiiouukjjyrbpnz` | Verified |
| **Supabase Project URL** | `https://zmpthsiiouukjjyrbpnz.supabase.co` | HTTP 200 OK |
| **Cloud Region** | AWS Mumbai (`ap-south-1`) | Verified |
| **Direct Session Host (Port 5432)** | `db.zmpthsiiouukjjyrbpnz.supabase.co:5432` | TCP Connected (Port Open) |
| **Transaction Pooler Host (Port 6543)** | `aws-0-ap-south-1.pooler.supabase.com:6543` | TCP Connected (Port Open) |
| **PostgreSQL User Identity** | `postgres.zmpthsiiouukjjyrbpnz` | Enforced by Validator |
| **Target Database Name** | `postgres` | Standard Supabase DB |
| **Target Schema** | `resto_v2` | Enforced Isolation |

---

## 2. Multi-Layer Identity & Connectivity Audit

### 2.1 Network Connectivity Audit
Direct TCP socket probes confirmed that both required PostgreSQL network interfaces are active, resolving, and accepting connections:
- `aws-0-ap-south-1.pooler.supabase.com:6543` $\rightarrow$ **REACHABLE** (Used for standard HTTP request query pooling).
- `db.zmpthsiiouukjjyrbpnz.supabase.co:5432` $\rightarrow$ **REACHABLE** (Used for persistent `LISTEN resto_v2_realtime_channel` connections).

### 2.2 PostgREST OpenAPI Identity Audit
- Probed `GET https://zmpthsiiouukjjyrbpnz.supabase.co/rest/v1/` using the service role key.
- Result: HTTP 200 OK.
- OpenAPI schema metadata confirms:
  - 0 exposed tables in `public`.
  - Schema `resto_v2` is not yet created or exposed (confirmed by `Accept-Profile: resto_v2` returning `HTTP 406 Not Acceptable`).

### 2.3 Fail-Closed Target Validator Protections
`backend_node/src/utils/databaseTargetValidator.ts` enforces the following identity controls:
1. **Target Allowlist**: Rejects any connection string that does not explicitly resolve to `zmpthsiiouukjjyrbpnz`.
2. **Local Target Guard**: Refuses execution if a `localhost` or `127.0.0.1` connection string is used when targeting the primary cloud project.
3. **Legacy Production Blocklist**: Unconditionally blocks `krsdjcxgfnlsstjwuqlj` even if opt-in flags are toggled.
4. **Credential Sanitation**: Masks all passwords in logs and error traces (`:****@`).

---

## 3. Direct PostgreSQL Connection Configuration

In accordance with enterprise secret management:
- Production database passwords are NOT stored in repository source code or commit history.
- For Step 5 execution, the target connection must be supplied via runtime environment variables:
  ```bash
  DATABASE_URL="postgresql://postgres.zmpthsiiouukjjyrbpnz:[DB_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
  ALLOW_RESTO_V2_PRIMARY_TARGET=true
  RESTO_V2_PRIMARY_PROJECT_REF=zmpthsiiouukjjyrbpnz
  ```
- Any execution without these explicit environment variables is immediately rejected fail-closed.

---

## 4. Identity Verification Verdict

**Verdict**: **PASS**  
The identity and network endpoints of primary Supabase project `zmpthsiiouukjjyrbpnz` are confirmed. All fail-closed validation rules are active.
