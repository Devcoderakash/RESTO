# RESTO V2 — Production Cutover & Rollback Runbook

**Document Version**: 2.0.0-RELEASE  
**Target Date**: November 4, 2026  
**Git Branch**: `resto-v2-staging`  
**Approved Production Database**: Supabase PostgreSQL 17.11 (`zmpthsiiouukjjyrbpnz`)  
**Production Schema**: `resto_v2`  
**Legacy Django Backend**: `https://resto-vc53.onrender.com` (**ACTIVE — DO NOT DISABLE**)  
**Cutover Policy**: **AWAITING USER EXPLICIT AUTHORIZATION — DO NOT CUT OVER TRAFFIC YET**

---

## 1. Overview & Golden Rules

This Runbook defines the exact sequence of actions for executing zero-downtime production cutover from the legacy Django backend to the RESTO V2 Node.js backend.

### Golden Rules of Cutover
1. **Never disable, sleep, or terminate the Django backend on Render before traffic stability is certified.**
2. **Never alter the `public` schema in Supabase.**
3. **If any unhandled error or transaction failure exceeds 0.5% during canary verification, trigger instant rollback immediately.**
4. **All frontend and dashboard modifications consist purely of setting `VITE_API_URL` environment variables.**

---

## 2. Infrastructure Pre-Cutover Checklist

Before initiating traffic cutover:

- [x] Schema `resto_v2` populated with all 36 canonical entities and verified.
- [x] Financial reconciliation verified: ₹1,134.00 orders = ₹1,134.00 payments (₹0.00 variance).
- [x] All 19 production API capabilities tested live and passed (100%).
- [x] Real-browser Playwright test suite passed (100%).
- [x] Client bundles scanned: 0 secret leaks, 0 exposed service role keys.
- [ ] **Render Service Provisioning**: Sync Blueprint `render.yaml` in Render Dashboard to provision container for `resto-backend-node`.
- [ ] **Render Secrets Injected**: Populate `sync: false` environment variables in Render Dashboard for `resto-backend-node`:
  - `DATABASE_URL`: `postgresql://postgres.zmpthsiiouukjjyrbpnz:[PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require`
  - `DIRECT_DATABASE_URL`: `postgresql://postgres.zmpthsiiouukjjyrbpnz:[PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require`
  - `SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcHRoc2lpb3V1a2pqeXJicG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NDIzNjksImV4cCI6MjEwOTExODM2OX0.VUSC2FJqTPOHLEg9oXzMzfMQNvj46viruJ7x_blJq-Y`
  - `SUPABASE_SERVICE_ROLE_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcHRoc2lpb3V1a2pqeXJicG56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzU0MjM2OSwiZXhwIjoyMTA5MTE4MzY5fQ.cffl-5gSh9PJ6M_oxgw9nCazshR411zbNpaEHBuOVTg`

---

## 3. Step-by-Step Production Cutover Execution Plan

```mermaid
flowchart TD
    Step1["Step 1: Deploy & Verify resto-backend-node on Render"]
    Step2["Step 2: Canary Switch - Restaurant Dashboard (Vercel)"]
    Step3["Step 3: Main Switch - Customer Frontend (Vercel)"]
    Step4["Step 4: Live Production Smoke Testing & Monitoring"]
    Step5["Step 5: Post-Cutover Stability Soak Period (72h)"]

    Step1 -->|Health 200 OK| Step2
    Step2 -->|Canary Verified| Step3
    Step3 -->|Traffic Flowing| Step4
    Step4 -->|Zero Anomalies| Step5
```

### Step 1: Provision & Verify Node Backend Service on Render
1. In Render Dashboard, click **Blueprints** ➔ select repository `Devcoderakash/RESTO` ➔ sync branch `resto-v2-staging`.
2. Enter the 4 required secrets (`DATABASE_URL`, `DIRECT_DATABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Click **Apply**.
4. Once the service builds and starts, capture the allocated public URL (e.g., `https://resto-backend-node.onrender.com`).
5. Verify health check:
   ```bash
   curl -s -i https://<resto-backend-node-url>/health/ready
   # Expected: HTTP/2 200 {"status":"ready","database":"connected"}
   ```
6. Verify restaurant catalog:
   ```bash
   curl -s https://<resto-backend-node-url>/api/restaurants/info
   # Expected: HTTP/2 200 {"id":"rest-olive-ember-01","name":"The Olive & Ember"}
   ```

### Step 2: Canary Cutover — Restaurant Dashboard
*Dashboard is chosen as the canary because staff can quickly test order flow without impacting public customers.*

1. In Vercel Project Settings for Restaurant Dashboard (`https://resto-bejw.vercel.app`):
   - Navigate to **Settings** ➔ **Environment Variables**.
   - Edit `VITE_API_URL`:
     ```
     From: https://resto-vc53.onrender.com/api
     To:   https://<resto-backend-node-url>/api
     ```
   - Trigger a Redeploy (Build time: ~30s).
2. Open `https://resto-bejw.vercel.app`.
3. Verify live order table displays existing orders.
4. Verify SSE indicator shows real-time connected state.

### Step 3: Main Cutover — Customer Frontend
1. In Vercel Project Settings for Customer Frontend (`https://resto-hazel-three.vercel.app`):
   - Navigate to **Settings** ➔ **Environment Variables**.
   - Edit `VITE_API_URL`:
     ```
     From: https://resto-vc53.onrender.com/api
     To:   https://<resto-backend-node-url>/api
     ```
   - Trigger a Redeploy (Build time: ~30s).
2. Open `https://resto-hazel-three.vercel.app/menu?table=01`.
3. Verify menu catalog renders with all 7 items, categories, and Unsplash images.

---

## 4. Production Smoke-Test Checklist

Immediately following Step 3 cutover, execute this live smoke verification on Table 01:

| Check | Action | Expected Result | Verified |
| :-: | :--- | :--- | :-: |
| **1** | Open Menu | Navigate to `https://resto-hazel-three.vercel.app/menu?table=01` | Renders Olive & Ember menu, 5 categories, 7 items | [ ] |
| **2** | Add to Cart | Select Margherita Pizza (₹595) | Cart updates to ₹595 + ₹29.75 GST = ₹624.75 | [ ] |
| **3** | Place Order | Enter name "Smoke Test Customer", click Order | Order placed; redirects to `/order-tracking/:id` | [ ] |
| **4** | Dashboard Alert | Check `https://resto-bejw.vercel.app` | Order appears in real time via SSE without refresh | [ ] |
| **5** | Kitchen Workflow | Advance status: Accept ➔ Prep ➔ Ready ➔ Served ➔ Complete | Customer tracking page updates status automatically | [ ] |
| **6** | Table Release | Inspect Table 01 in Table Management tab | Table 01 automatically returns to "Available" | [ ] |

---

## 5. Instant Rollback Blueprint (Zero Data Loss)

If any critical issue arises during cutover:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Operations Engineer
    participant Vercel as Vercel Dashboard
    participant Customer as Customer Frontend (resto-hazel-three.vercel.app)
    participant Dashboard as Restaurant Dashboard (resto-bejw.vercel.app)
    participant Django as Legacy Django Service (resto-vc53.onrender.com)

    Note over Admin,Django: EMERGENCY ROLLBACK INITIATED (< 60 SECONDS)
    Admin->>Vercel: Set VITE_API_URL = https://resto-vc53.onrender.com/api
    Admin->>Vercel: Redeploy Customer Frontend & Restaurant Dashboard
    Vercel-->>Customer: Traffic routed back to Django backend
    Vercel-->>Dashboard: Traffic routed back to Django backend
    Note over Customer,Django: Rollback complete. Zero customer downtime.
```

### Rollback Execution Steps:
1. Open Vercel Dashboard for `resto-hazel-three` and `resto-bejw`.
2. Change `VITE_API_URL` back to `https://resto-vc53.onrender.com/api`.
3. Redeploy previous production deployment.
4. Verify frontend and dashboard communicate with Django backend.
5. **Database Impact**: Zero rollback required in PostgreSQL because `resto_v2` is completely isolated from the legacy schema.

---

## 6. Post-Cutover Monitoring & Decommissioning

- **Monitoring Window (0 - 24 Hours)**:
  - Monitor Render logs for `resto-backend-node` for memory leaks, slow queries, or SSE disconnects.
  - Monitor Supabase database CPU, active connections (pool limit: 20), and disk I/O.
- **Canary Stability Window (24 - 72 Hours)**:
  - Maintain legacy Django service in standby mode.
- **Decommissioning Gate (72+ Hours)**:
  - Only after 72 hours of 100% defect-free operation and formal sign-off, scale down legacy Django web service on Render.
