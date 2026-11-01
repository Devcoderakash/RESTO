# RESTO API

REST API for the customer ordering site and restaurant dashboard. The API uses Supabase Auth for staff sign-in and the Supabase service-role key only inside the backend. Customers do not need accounts.

## Requirements

- Node.js 20+
- npm
- Supabase project with PostgreSQL and Auth enabled

## Local setup

1. Install backend dependencies:

   ```sh
   cd backend
   npm install
   ```

2. Copy `.env.example` to `.env` and set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and a random `TRACKING_TOKEN_SECRET` of at least 32 characters. Keep `.env` out of source control. The service-role key must never be copied into either Vite frontend.

3. Apply `supabase/migrations/202610310001_initial_schema.sql` in the Supabase SQL Editor (or with the Supabase CLI), then run `supabase/seed.sql` to create the The Olive & Ember demo restaurant, categories, tables, and sample menu.

4. Create staff users through Supabase Auth, then add a matching `public.users` and `public.staff` record for that Auth user. The dashboard signs in through `POST /api/auth/login` and requires an active staff assignment. The `/api/staff` invite endpoint can invite additional staff when used by an authenticated manager.

5. Start the API:

   ```sh
   npm run dev
   ```

   The API listens on port `5000`; `GET /health` checks that the HTTP server is up. A successful health response does not test the Supabase connection.

## Applications

Configure both Vite applications with `VITE_API_URL=http://localhost:5000/api` and `VITE_RESTAURANT_SLUG=olive-and-ember`. Start the customer site and dashboard in separate terminals with `npm run dev` from their respective folders. The customer defaults to port `5173`, and the dashboard defaults to `5174`.

The dashboard API requires a valid Supabase Auth bearer token. Create the initial manager through Supabase Auth and insert the corresponding staff rows before using protected endpoints.

## API routes

Public customer routes:

- `GET /api/restaurants`, `GET /api/restaurants/:slug`
- `GET /api/menu?restaurantSlug=...`, `GET /api/menu/categories?restaurantSlug=...`
- `GET /api/tables/availability?restaurantSlug=...`
- `POST /api/orders`
- `GET /api/orders/:id/tracking?accessToken=...`
- `POST /api/service-requests`

Authentication:

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`

Staff routes require `Authorization: Bearer <supabase-access-token>` and resolve the tenant from the signed-in staff record:

- `GET /api/orders`, `PATCH /api/orders/:id/status`
- `GET /api/tables`, `POST /api/tables`, `PUT /api/tables/:id`, `PATCH /api/tables/:id/status`, `DELETE /api/tables/:id`
- `GET /api/staff/menu`, `POST /api/menu`, `PATCH /api/menu/:id`, `PATCH /api/menu/:id/availability`, `DELETE /api/menu/:id`
- `POST /api/categories`, `PUT /api/categories/:id`, `DELETE /api/categories/:id`
- `GET /api/service-requests`, `PATCH /api/service-requests/:id`
- `GET /api/payments`, `POST /api/payments`, `PATCH /api/payments/:id/status`
- `GET /api/dashboard/overview`, `GET /api/dashboard/recent-orders`, `GET /api/dashboard/daily-sales`
- `GET /api/staff/restaurant-settings`, `PUT /api/restaurants/settings`, `GET /api/staff`, `POST /api/staff`, `PATCH /api/staff/:id/status`

Order creation requires an `idempotencyKey`. The server validates the restaurant, table, item availability, and selected add-ons, recalculates totals, and uses the `create_order` Postgres function to lock the table and persist the order atomically. The returned `accessToken` is a customer tracking token; it is separate from the staff Auth token.

Order status changes and payment status updates are checked server-side. Table clearing is rejected while active orders remain. Payment support is record-keeping/demo only; no external payment gateway is connected.

## Realtime and testing

The migration adds orders, tables, and service requests to the Supabase Realtime publication when it is available. The current dashboard uses periodic REST refresh as a fallback. Realtime subscriptions have not been verified against a configured Supabase project, so the application does not claim that they are live.

Run the TypeScript build with `npm run build`. Database migrations, RLS policy behavior, Auth setup, and the customer-to-kitchen workflow still require a configured Supabase project for end-to-end verification.
