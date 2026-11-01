# RESTO Backend — Django REST Framework & Supabase PostgreSQL

Production-ready backend for the RESTO restaurant management platform.

## Architecture

- **Framework**: Django 5 + Django REST Framework
- **Database**: PostgreSQL (Supabase) with local SQLite fallback
- **Authentication**: Private Network / Gateway-based for Dashboard (no login required on localhost), HMAC-SHA256 tracking tokens for customer orders
- **Port**: `5001`

## Setup & Running

```bash
# 1. Activate Virtual Environment
source venv/bin/activate

# 2. Install Dependencies
pip install -r requirements.txt

# 3. Apply Migrations
python manage.py migrate

# 4. Seed Initial Data
python seed_data.py

# 5. Run Server on Port 5001
python manage.py runserver 0.0.0.0:5001
```

## Production Deployment & Security Strategy

- In production, set `DJANGO_DEBUG=False` and supply `DATABASE_URL` pointing to your Supabase PostgreSQL instance (e.g. Supabase Session Pooler).
- The Restaurant Dashboard operates without a password login form. Protect the dashboard in production behind a Zero Trust Network Access (ZTNA) gateway such as **Cloudflare Access**, **Tailscale**, or an IP-whitelisted VPN.
