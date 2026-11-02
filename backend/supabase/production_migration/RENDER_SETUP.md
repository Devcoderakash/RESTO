# RESTO — Render Production Environment Configuration Guide

This guide details the exact environment variables required for deploying the RESTO Django backend on Render with Supabase PostgreSQL.

---

## 1. Required Environment Variables

Configure these variables in the **Render Dashboard** $\rightarrow$ **RESTO** Web Service $\rightarrow$ **Environment** tab:

| Variable | Required | Value / Format | Notes |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **YES** | `postgresql://postgres.[REF]:[PASSWORD]@[POOLER_HOST]:6543/postgres?sslmode=require` | Supabase Transaction Pooler (Port 6543) |
| `SUPABASE_URL` | **YES** | `https://zmpthsiiouukjjyrbpnz.supabase.co` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **YES** | `eyJh...` | Found in Supabase Settings $\rightarrow$ API $\rightarrow$ `service_role` secret |
| `DJANGO_DEBUG` | **YES** | `False` | Strictly `False` in production (disables SQLite fallback) |
| `DJANGO_ALLOWED_HOSTS` | **YES** | `*` or `resto-vc53.onrender.com` | Allowed host headers |
| `DJANGO_SECRET_KEY` | **YES** | `[random-50-character-secret]` | Production Django cryptographic key |
| `TRACKING_TOKEN_SECRET` | **YES** | `[random-64-character-secret]` | Key for SHA-256 customer tracking tokens |
| `CLIENT_ORIGINS` | **YES** | `https://resto-hazel-three.vercel.app,https://resto-bejw.vercel.app` | Allowed CORS origins |
| `PYTHON_VERSION` | **YES** | `3.11.9` | Matches Render runtime |

---

## 2. Supabase Connection String Format

In the Supabase Dashboard, click the green **Connect** button at the top of the page. Select **Transaction Pooler** (URI mode):

```
postgresql://postgres.zmpthsiiouukjjyrbpnz:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### Password Encoding Guidelines:
- **Remove brackets:** If the template shows `[YOUR-PASSWORD]`, replace the whole token including brackets (e.g. `mypassword123`, not `[mypassword123]`).
- **Special characters:** If your database password contains characters like `@`, `#`, `$`, `%`, `&`, `+`, `/`, `?`, RESTO's custom `parse_database_url` utility automatically decodes and normalizes them safely.
- **Transaction Pooler (Port 6543):** RESTO automatically configures `CONN_MAX_AGE=0` and `disable_server_side_cursors=True` when connecting via Port 6543, avoiding connection pooling conflicts.

---

## 3. Build & Deployment Lifecycle

When deploying on Render:
1. Render executes `backend/build.sh`.
2. Dependencies are installed (`pip install -r requirements.txt`).
3. `python manage.py check --database default` verifies PostgreSQL connectivity before any migrations run.
4. `python manage.py migrate --fake-initial --no-input` registers migrations against existing Supabase tables.
5. `python seed_data.py` safely verifies restaurant operational state without overwriting migrated data.
6. Gunicorn boots `config.wsgi:application` bound to Supabase PostgreSQL.
