# DineFlow — Restaurant Admin Dashboard

A premium, modern, responsive Restaurant Management Dashboard for **DineFlow**, a multi-restaurant QR-based ordering and operations SaaS platform.

Built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS**, **Zustand** (with LocalStorage state persistence), **React Router DOM v7**, **Lucide Icons**, **Recharts**, and **Sonner** notifications.

---

## 🎨 Branding & Design System

- **Sidebar Background:** Deep Charcoal (`#201F1C`)
- **Main App Background:** Warm Off-White (`#F8F7F3`)
- **Cards & Surfaces:** Pure White (`#FFFFFF`)
- **Primary Brand Accent:** Champagne Gold (`#B99A62` / `#D3BA8D` / `#9A7D45`)
- **Primary Text:** Dark Charcoal (`#252421`)
- **Secondary Text:** Muted Grey (`#85827A`)
- **Borders & Dividers:** Soft Beige (`#EAE7DF`)
- **Typography:** *Playfair Display* (Editorial headings) & *Plus Jakarta Sans* (SaaS interface)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure the API
Copy `.env.example` to `.env.local` and set `VITE_API_URL` to the backend API URL and `VITE_RESTAURANT_SLUG` to the restaurant slug configured in Supabase. Start the backend with its Supabase environment configured and apply its migrations before using the dashboard.

For local UI exploration without Supabase, set `VITE_DEMO_MODE=true`. The login page displays the temporary demo credentials and loads sample dashboard data locally. Demo changes are not persisted to the backend. Keep demo mode disabled for production.

The dashboard requires a staff account created in Supabase Auth and linked to an active staff record. Sign in at `/login`; protected pages and staff portals require a valid session. The access token is kept in session storage and cleared when the API rejects it as expired.

### 3. Run Local Development Server
```bash
npm run dev
```
The dashboard will start on `http://localhost:5174/`.

### 4. Build for Production
```bash
npm run build
```

Dashboard live data is refreshed by API polling every 20 seconds. Supabase Realtime subscriptions are not currently configured.

---

## 📦 Navigation Modules & Architecture

### 1. Main Navigation
- **Overview (`/`):** API-backed revenue, order, table, and pending-order metrics; 14-day sales chart; recent orders feed; and table occupancy.
- **Orders (`/orders`):** Comprehensive live dining ticket management covering all 7 stages (`New`, `Accepted`, `Preparing`, `Ready`, `Served`, `Completed`, `Cancelled`), advanced multi-keyword search, table filtering, full slide-out order drawer with item modifiers, printable receipts/invoices, order cancellation with mandatory reason prompts, and CSV export.
- **Tables (`/tables`):** Visual table floor plan across zones (*Main Dining Hall*, *Patio & Outdoor*, *VIP Lounge*, *Rooftop Terrace*), session timer, capacity indicators, table status switcher, one-tap "Clear Table", and unique table QR code generator (`/menu?table=01`) with downloadable SVG & formatted PNG table stands.
- **Menu Management (`/menu`):** Dish creation and editing, high-resolution food photography presets and URL uploads, category assignments, vegetarian/non-veg flags, prep times, calorie tags, availability toggles, popular dish toggles, and grid/table view modes.
- **Category Management (`/categories`):** Hierarchical category sorting, display order adjustments, category cover imagery, item counts, and QR visibility toggles.

### 2. Management Navigation
- **Staff Management (`/staff`):** API-backed staff list, invitations, and active status changes. Profile editing, removal, and per-module permissions are not supported by the current API.
- **Customer Directory (`/customers`):** Diner profiles, loyalty tier classification (*Gold VIP*, *Silver*, *Bronze*), lifetime dining spend, visit history, customer review ratings, and internal concierge notes.
- **Payment Management (`/payments`):** API-backed payment records and status filters. Recording a refund updates RESTO's payment status only; no external payment gateway is connected.
- **Inventory & Supplies (`/inventory`):** Pantry stock tracker, unit metrics (*kg*, *L*, *pcs*, *cans*, *boxes*), safety re-order threshold alerts, out-of-stock banners, and inventory adjustment logs (*restock*, *usage*, *waste*).
- **Offers & Coupons (`/offers`):** Promotional code generation, percentage vs fixed discounts, minimum cart values, maximum caps, redemption tracking, and active/expired state management.

### 3. Analytics & Feedback
- **Reports & Analytics (`/reports`):** Daily, weekly, monthly, and quarterly performance metrics, category revenue shares, peak dining hour heatmaps, table velocity turnaround, payment method distributions, best-selling dishes margin audit, and CSV export.
- **Customer Reviews (`/reviews`):** Rating analysis (1 to 5 stars), verified dining order linkage, food vs service score breakdowns, rating filters, and official management reply drawer.

### 4. Settings & Utilities
- **Restaurant Settings (`/settings`):** Identity profile, operating hours schedule, guest Wi-Fi network configuration with direct-connect QR code, GST/VAT tax rates, service charges, currency settings, kitchen prep buffer times, notification preferences, and account password security.
- **Global Search (⌘K / Ctrl+K):** Omni-search across orders, tables, dishes, guests, and staff members.
- **Notification Center:** Slide-out drawer with unread badges, categorised alerts, and instant jump links.

---

## 💾 State Management & Persistence

Operational data such as orders, tables, menu items, service requests, payments, and staff is loaded from the backend API; server-confirmed changes are not treated as durable until the API accepts them. The staff access token is stored for the current browser session. Some legacy modules that are not connected to the backend still use local demo state and should not be treated as operational records.
