# RESTO V2 — Phase 4B.4 Primary Target Authorization

**Status**: APPROVED & CODIFIED  
**Date**: November 4, 2026  
**Environment**: Production Database Repurposing Preflight  
**Target Project Reference**: `zmpthsiiouukjjyrbpnz`  
**Target Supabase URL**: `https://zmpthsiiouukjjyrbpnz.supabase.co`  
**Git Branch**: `resto-v2-staging`  

---

## 1. Executive Summary & Authorization Context

The RESTO system architecture transition originally planned an isolated staging Supabase project prior to cloud production deployment. On November 4, 2026, the user issued an explicit infrastructure directive:

> **Directive**: Repurpose the existing Supabase project (`zmpthsiiouukjjyrbpnz`) directly as the RESTO V2 primary production database. No separate cloud staging project will be provisioned. The `public` schema has been cleaned, and existing Supabase Auth and Storage resources must be preserved without modification.

Phase 4B.4 acts as the formal **authorization and read-only preflight gate** for this primary deployment target. This phase strictly prohibits write operations, migrations, data imports, or traffic cutovers.

---

## 2. Infrastructure Identity & Target Specifications

| Parameter | Primary Production Specification | Verification Status |
| :--- | :--- | :--- |
| **Supabase Project Reference** | `zmpthsiiouukjjyrbpnz` | Verified |
| **Supabase Project URL** | `https://zmpthsiiouukjjyrbpnz.supabase.co` | Verified (HTTP 200) |
| **PostgREST Base URL** | `https://zmpthsiiouukjjyrbpnz.supabase.co/rest/v1/` | Verified (HTTP 200) |
| **Storage Base URL** | `https://zmpthsiiouukjjyrbpnz.supabase.co/storage/v1/` | Verified (HTTP 200) |
| **Auth Base URL** | `https://zmpthsiiouukjjyrbpnz.supabase.co/auth/v1/` | Verified (HTTP 200) |
| **V2 Target Database Schema** | `resto_v2` | Schema isolation enforced |
| **Active Django Render Service** | `https://resto-vc53.onrender.com` | Verified intact (HTTP 200) |

---

## 3. Strict Safety Boundaries for Phase 4B.4

To prevent accidental modification, service disruption, or data loss, Phase 4B.4 adhered to the following strict boundaries:

1. **Read-Only Inspection**: Zero writes, zero schema creations, zero table drops, zero truncations.
2. **Auth Preservation**: Zero modifications to Supabase Auth configuration, roles, or users.
3. **Storage Preservation**: Zero modifications, renames, or deletions of the `resto-media` bucket or its objects.
4. **Backend Inactivity**: No deployment of `backend_node` to Render; no changes to frontend or dashboard environment variables.
5. **No Production Branch Commits**: All configuration and test additions committed exclusively to `resto-v2-staging`.
6. **No Secret Exposure**: Zero exposure of database passwords, service-role keys, or JWT secrets in logs or documentation.

---

## 4. Codified Opt-In Guard Mechanism

To prevent automated scripts or engineers from accidentally applying migrations or commands to the primary target without explicit intent, `backend_node/src/utils/databaseTargetValidator.ts` has been hardened with a dual opt-in requirement:

```typescript
// Validation requirements for primary target zmpthsiiouukjjyrbpnz
export function checkPrimaryProjectAuthorization(options: {
  allowPrimaryTarget?: boolean | string;
  primaryProjectRef?: string;
}): { authorized: boolean; reason?: string } {
  const allow =
    options.allowPrimaryTarget === true ||
    options.allowPrimaryTarget === 'true' ||
    process.env.ALLOW_RESTO_V2_PRIMARY_TARGET === 'true';

  const ref =
    options.primaryProjectRef ||
    process.env.RESTO_V2_PRIMARY_PROJECT_REF;

  if (!allow) {
    return {
      authorized: false,
      reason:
        `Target matches RESTO V2 primary production project '${APPROVED_PRIMARY_PROJECT_REF}'. ` +
        `Execution requires explicit opt-in: set ALLOW_RESTO_V2_PRIMARY_TARGET=true.`,
    };
  }

  if (ref !== APPROVED_PRIMARY_PROJECT_REF) {
    return {
      authorized: false,
      reason:
        `Primary target execution requires explicit RESTO_V2_PRIMARY_PROJECT_REF='${APPROVED_PRIMARY_PROJECT_REF}', ` +
        `got '${ref || '[NOT_SET]'}'.`,
    };
  }

  return { authorized: true };
}
```

### Protection Against Unapproved Production References
Unapproved legacy production project references (including `krsdjcxgfnlsstjwuqlj`) remain unconditionally blocked under all circumstances, even if primary target opt-in flags are provided.

### Permanent Destructive Rollback Block
Even when explicit primary target authorization is provided, destructive rollback operations (`validateRollbackAuthorization`) against `zmpthsiiouukjjyrbpnz` are **permanently prohibited and fail-closed**:
```typescript
if (target.isPrimary || options.connectionString.includes(APPROVED_PRIMARY_PROJECT_REF)) {
  throw new Error(
    `ROLLBACK BLOCKED: Destructive rollback operations are strictly prohibited against RESTO V2 primary production project '${APPROVED_PRIMARY_PROJECT_REF}'.`
  );
}
```

---

## 5. Summary of Authorization Status

| Scope Component | Authorization Status | Enforced Guardrail |
| :--- | :--- | :--- |
| **Primary Project Target** | AUTHORIZED | `zmpthsiiouukjjyrbpnz` |
| **Read-Only Preflight** | EXECUTED | Verified 0 tables in `public`, Storage intact, Auth intact |
| **V2 Migration Execution** | PENDING AUTHORIZATION | Blocked until Phase 4B.5 |
| **V1 Data Import** | PENDING AUTHORIZATION | Blocked until Phase 4B.5 |
| **Render Cloud Deployment** | PENDING AUTHORIZATION | Blocked until Phase 4B.5 |
| **Destructive Rollback** | PERMANENTLY BLOCKED | Hardcoded exception thrown |
