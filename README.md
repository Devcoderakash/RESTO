# RESTO — Restaurant Table Ordering & Management Platform

A high-performance, full-stack digital dining and kitchen management platform connecting customers, kitchen staff, and managers in real time.

---

## Architecture Overview

```text
RESTO/
├── frontend/               # Customer Digital Ordering Interface (React 19, TypeScript, Vite, Tailwind CSS)
├── dashboard/              # Restaurant & Kitchen Admin Management (React 19, TypeScript, Vite, Tailwind CSS)
└── backend/                # Backend API (Python, Django, Django REST Framework, Supabase PostgreSQL)
```

- **Customer Frontend (`frontend/`)**: Port `5173`
  - Flow: Select Table $\rightarrow$ Browse Live Menu $\rightarrow$ Customize & Add to Cart $\rightarrow$ Place Order $\rightarrow$ Live Order Tracking
  - Features: Server-calculated prices (tamper-proof), live Wi-Fi credentials modal, waiter / bill calling
- **Restaurant Dashboard (`dashboard/`)**: Port `5174`
  - Direct access without login friction for private restaurant networks
  - Live order management pipeline: `pending` $\rightarrow$ `confirmed` $\rightarrow$ `preparing` $\rightarrow$ `ready` $\rightarrow$ `served` $\rightarrow$ `completed`
  - Real-time waiter requests and table occupancy control
- **Backend (`backend/`)**: Port `5001`
  - Django REST Framework + Supabase PostgreSQL
  - Row-Level Security, atomic order transactions, state-machine validation
  - Idempotency key deduplication on order placements

---

## Quick Start

### 1. Backend (Django)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:5001
```

### 2. Customer Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

### 3. Restaurant Dashboard (React + Vite)
```bash
cd dashboard
npm install
npm run dev
# Running on http://localhost:5174
```

---

## Automated Verification Suite
Run the 46-point production verification test suite:
```bash
node test_production_suite.mjs
```
All 46 test assertions cover database persistence, order lifecycle, payments, staff authorization, and tamper prevention.
