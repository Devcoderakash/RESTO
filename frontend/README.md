# DineFlow — Premium QR-Based Restaurant Ordering Platform

> **The Olive & Ember** • *Crafted with Passion. Served with Love.*  
> An artisanal digital restaurant experience powered by **DineFlow**.

DineFlow is a modern, customer-facing digital restaurant menu and ordering website. Diners scan the unique QR code on their restaurant table (e.g. `/menu?table=07`), explore the culinary menu, customize dishes, add items to cart, and place orders directly from their tables.

---

## 🍽️ Brand Identity & Design System

- **Restaurant:** The Olive & Ember (Wood-Fired Hearth & Contemporary Continental)
- **Platform:** DineFlow
- **Color Palette:**
  - **Warm Ivory / Cream (`#FAF8F3`):** Primary background offering an inviting, warm tactile aesthetic.
  - **Deep Charcoal (`#22211F`):** Deep editorial typography and primary surface accents.
  - **Champagne Gold (`#B99A62`):** Luxury culinary accent for badges, actions, and highlights.
  - **Soft Beige (`#E9E4DA`):** Delicate dividing borders and card outlines.
  - **Pure Card White (`#FFFFFF`):** High-contrast dish presentation.
  - **Culinary Dietary Badges:** Authentic Indian FSSAI-style green square (Veg) and maroon triangle (Non-Veg).
- **Typography:**
  - *Headings:* **Playfair Display** (refined high-contrast editorial serif)
  - *Body / Interface:* **Plus Jakarta Sans** (clean, modern geometric sans-serif)

---

## ⚡ Tech Stack

- **Framework:** React.js (v19) with Vite & TypeScript
- **Styling:** Tailwind CSS with custom palette tokens and glassmorphism utilities
- **State Management:** Zustand with `persist` middleware for cart and table context; restaurant data is loaded from the REST API
- **Routing:** React Router DOM (v7)
- **Icons:** Lucide React
- **Notifications:** Sonner with dark charcoal & champagne gold toast styling
- **Celebration Effects:** Canvas Confetti

---

## 🚀 Key Features

### 1. QR Table Identification & Session Context
- Reads the table number dynamically from URL query parameters (e.g., `/menu?table=01`, `/menu?table=07`).
- Prominently displays: `"YOU ARE DINING AT TABLE 07"` with QR status badge.
- **Table Switcher & Simulator:** Click the table badge or use the quick table tool to test Table 01, 02, 03, 04, 07, 12, or custom tables.
- **Safety Prompt:** If the table changes while the cart contains items, prompts the diner for confirmation before clearing the cart to prevent cross-table order mixups.

### 2. Digital Culinary Menu
- Categories and available menu items are loaded from the REST API; search, dietary filters, Chef's Picks, and sorting remain client-side.
- **Filters & Search:** Real-time search by dish name, ingredients, or tags; Veg/Non-Veg filter chips; Chef’s Special toggle; and sorting by Recommended, Popular, and Price (Low-to-High / High-to-Low).
- **Realistic Details:** High-resolution food photography, preparation time, calories, and authentic descriptions.
- **Out-of-Stock Handling:** Gracefully demonstrates out-of-stock items (e.g. *Slow-Braised Rosemary Lamb Shank*) with a dimmed "Sold Out Today" badge and disabled order actions.

### 3. Food Customizations & Detail Modal
- Dynamic pricing calculation for portions, add-ons, and luxury upgrades.
- Spice level selector (Mild / Medium / Hot).
- Portion size options (Standard vs. Sharing).
- Dietary notes and allergy alert input.
- Real-time price updates and quantity controls.

### 4. Interactive Shopping Cart & Mobile Bar
- Slide-over side drawer and desktop summary.
- Sticky floating bottom bar for mobile diners.
- Transparent tax breakdown: Subtotal, 5% GST (2.5% CGST + 2.5% SGST), and 5% Restaurant Service Charge.
- Full line-item customization summary and editable special instructions.

### 5. Table Checkout Experience
- Verified dining table context banner.
- Guest details (Name, contact for receipt).
- Kitchen instructions and allergy alerts.
- Payment preferences:
  1. **Pay at Counter / Table Settle (Cash / Card Tap)**
  2. **Zero-Contact Instant UPI Payment (Demo flow)**
- Sends the cart to the backend, which validates availability and calculates the order total. Successful checkout clears the cart and opens order tracking.

### 6. Live Order Tracking
- 5 Kitchen Stages:
  1. *Order Received*
  2. *Order Accepted*
  3. *Preparing in Kitchen*
  4. *Ready to Serve*
  5. *Served at Table*
- Status is fetched from the backend and refreshed periodically; customer pages do not advance order states.

### 7. Table Hospitality Services
- **Guest Wi-Fi:** Opens network modal (`OliveGuest` / `welcome2026`) with 1-click clipboard copy and toast notifications.
- **Call Waiter:** Sends the selected service request to the restaurant backend.
- **Request Bill:** Sends a request to the restaurant backend; the server calculates the final amount.

### 8. Diner Reviews & Accolades
- Overall rating calculation (4.85 ★ based on 340+ reviews).
- Star rating breakdown bars.
- Guest review cards with verified diner badges.
- **Write a Review Modal:** Diners can post star ratings (1–5), comments, and favorite dishes with instant local storage persistence.

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── assets/              # Logos and SVG assets
│   ├── components/
│   │   ├── cart/            # CartDrawer, CartItem, CartSummary
│   │   ├── checkout/        # CheckoutForm, PaymentOptions
│   │   ├── layout/          # RestaurantHeader, RestaurantFooter, MobileCartBar, TableIndicator
│   │   ├── menu/            # CategoryNavigation, SearchBar, FoodCard, FoodGrid, DietaryBadge
│   │   ├── modals/          # FoodDetailModal, WifiModal, CallWaiterModal, RequestBillModal, TableSwitchModal
│   │   ├── restaurant/      # RestaurantHero, RestaurantInfo
│   │   ├── reviews/         # ReviewSection, ReviewCard, ReviewFormModal
│   │   └── ui/              # Button, Badge, Dialog
│   ├── data/                # Typed mock datasets (restaurant.ts, menu.ts, reviews.ts)
│   ├── lib/                 # Utilities (utils.ts, formatters.ts)
│   ├── pages/               # MenuPage, CheckoutPage, OrderTrackingPage, NotFoundPage
│   ├── store/               # Zustand stores (cartStore.ts, tableStore.ts, orderStore.ts)
│   ├── types/               # TypeScript interfaces (menu.ts, cart.ts, order.ts, reviews.ts, restaurant.ts)
│   ├── App.tsx              # Router and notifications setup
│   ├── index.css            # Tailwind directives and custom tokens
│   └── main.tsx             # React entrypoint
├── index.html               # Head tags, Google Fonts (Playfair Display & Plus Jakarta Sans)
├── tailwind.config.js       # Brand color palette, shadows, typography
├── tsconfig.json
└── vite.config.ts
```

---

## 🛠️ Setup & Running Locally

### 1. Configure the API
```bash
cp .env.example .env
```
Set `VITE_API_URL` to the backend API and `VITE_RESTAURANT_SLUG` to the restaurant slug configured in the database. The example uses `http://localhost:5000/api` and `olive-and-ember`.

For local menu/table UI exploration without a configured backend, set `VITE_DEMO_MODE=true` to use sample menu and table data. Orders and service requests still require a configured backend. Keep demo mode disabled for production.

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the backend and configure its Supabase credentials
Follow the setup and migration instructions in [`../backend/README.md`](../backend/README.md). The customer application requires a running backend and does not fall back to local demo orders or menu data.

### 4. Start Vite Development Server
```bash
npm run dev
```
Open [http://127.0.0.1:5173/?table=07](http://127.0.0.1:5173/?table=07) in your browser.

### 5. Production Build
```bash
npm run build
```

For backend endpoint details, migrations, demo seed data, and all-app startup instructions, see [`../backend/README.md`](../backend/README.md).
4. **Reviews (`src/components/reviews/ReviewSection.tsx`):**
   - Persist reviews directly into a PostgreSQL `reviews` table with optional photo uploads.
