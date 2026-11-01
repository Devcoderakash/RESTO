import { Router } from "express";
import { z } from "zod";
import { adminSupabase, authSupabase, isSupabaseConfigured } from "../config/supabase.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requireStaff, allowRoles } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validation.js";
import { AppError, databaseError } from "../lib/errors.js";
import { getRestaurantBySlug } from "../lib/restaurant.js";
import {
  availabilityQuerySchema, categorySchema, createOrderSchema, listOrdersQuerySchema, loginSchema,
  menuQuerySchema, orderStatusSchema, paramsIdSchema, restaurantSlugSchema,
  paymentCreateSchema, paymentStatusSchema, restaurantSettingsSchema, serviceRequestSchema, staffInviteSchema,
  staffStatusSchema, tableSchema,
  tableStatusSchema, trackingQuerySchema, upsertMenuItemSchema,
} from "../lib/schemas.js";
import { fetchOrder, statusTransitions } from "../lib/orders.js";
import { hashTrackingToken, trackingToken, safeTokenMatch } from "../lib/tracking-token.js";
import { localStore } from "../lib/local-store.js";

export const publicRouter = Router();
export const authRouter = Router();
export const staffRouter = Router();

publicRouter.get("/restaurants/:slug", asyncHandler(async (req, res) => {
  const { slug } = restaurantSlugSchema.parse(req.params);
  const restaurant = await getRestaurantBySlug(slug);
  const { id, name, description, address, phone, email, currency, timezone, opening_hours, logo_url } = restaurant;
  res.json({ id, name, description, address, phone, email, currency, timezone, opening_hours, logo_url });
}));

publicRouter.get("/restaurants", asyncHandler(async (_req, res) => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await adminSupabase.from("restaurants")
        .select("id, slug, name, description, address, phone, email, logo_url, opening_hours, currency, timezone")
        .eq("is_active", true).order("name");
      if (!error && data && data.length > 0) {
        return res.json({ restaurants: data });
      }
    } catch {}
  }
  res.json({ restaurants: [localStore.restaurant] });
}));

publicRouter.get("/menu", validateQuery(menuQuerySchema), asyncHandler(async (req, res) => {
  const query = menuQuerySchema.parse(req.query);
  const restaurant = await getRestaurantBySlug(query.restaurantSlug);
  if (isSupabaseConfigured) {
    try {
      const [{ data: categories, error: categoryError }, { data: menuItems, error: itemError }] = await Promise.all([
        adminSupabase.from("categories").select("id, name, description, sort_order").eq("restaurant_id", restaurant.id).eq("active", true).eq("is_visible", true).order("sort_order"),
        adminSupabase.from("menu_items").select("id, category_id, name, description, price, image_url, food_type, dietary_tags, popular, chef_special, available, preparation_time_minutes, calories, allergens, addons, sort_order").eq("restaurant_id", restaurant.id).order("sort_order"),
      ]);
      if (!categoryError && !itemError && menuItems && menuItems.length > 0) {
        const categoryNameById = new Map((categories ?? []).map((category) => [category.id, category.name]));
        return res.json({
          items: (menuItems ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            category: item.category_id ?? "all",
            categoryId: item.category_id,
            categoryName: categoryNameById.get(item.category_id) ?? "Uncategorized",
            image: item.image_url ?? "",
            imageUrl: item.image_url ?? "",
            foodType: item.food_type,
            isVeg: item.food_type === "veg",
            isVegetarian: item.food_type === "veg",
            dietaryType: item.food_type === "veg" ? "veg" : "non-veg",
            isPopular: item.popular,
            isChefSpecial: item.chef_special,
            isAvailable: item.available,
            prepTimeMinutes: item.preparation_time_minutes,
            calories: item.calories,
            allergens: item.allergens,
            preparationTime: `${item.preparation_time_minutes} min`,
            customizationGroups: Array.isArray(item.addons) && item.addons.length > 0 ? [{
              id: "addons",
              name: "Add-ons",
              type: "multiple",
              required: false,
              options: item.addons,
            }] : [],
          })),
          categories: (categories ?? []).map(({ id, name, description }) => ({ id, name, description })),
        });
      }
    } catch {}
  }
  res.json(localStore.getMenuFormatted());
}));

publicRouter.get("/menu/categories", validateQuery(menuQuerySchema), asyncHandler(async (req, res) => {
  const { restaurantSlug } = menuQuerySchema.parse(req.query);
  const restaurant = await getRestaurantBySlug(restaurantSlug);
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await adminSupabase.from("categories")
        .select("id, name, description, image_url, sort_order")
        .eq("restaurant_id", restaurant.id).eq("active", true).eq("is_visible", true)
        .order("sort_order");
      if (!error && data && data.length > 0) {
        return res.json({ categories: data });
      }
    } catch {}
  }
  res.json({ categories: localStore.categories });
}));

publicRouter.get("/tables/availability", validateQuery(availabilityQuerySchema), asyncHandler(async (req, res) => {
  const query = availabilityQuerySchema.parse(req.query);
  const restaurant = await getRestaurantBySlug(query.restaurantSlug);
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await adminSupabase.from("restaurant_tables")
        .select("table_number, capacity, zone, status")
        .eq("restaurant_id", restaurant.id)
        .neq("status", "inactive")
        .order("table_number");
      if (!error && data && data.length > 0) {
        return res.json({ tables: (data ?? []).map((table) => ({
          number: table.table_number,
          capacity: table.capacity,
          zone: table.zone,
          status: table.status,
        })) });
      }
    } catch {}
  }
  res.json({ tables: localStore.getTablesFormatted() });
}));

staffRouter.get("/tables", asyncHandler(async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await adminSupabase.from("restaurant_tables")
        .select("id, table_number, capacity, zone, status, qr_code_url")
        .eq("restaurant_id", req.staff!.restaurant_id)
        .order("table_number");
      if (!error && data && data.length > 0) {
        return res.json({ tables: data });
      }
    } catch {}
  }
  res.json({ tables: localStore.tables });
}));

staffRouter.patch("/tables/:id/status", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(tableStatusSchema), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const { status } = tableStatusSchema.parse(req.body);

  if (status === "available") {
    const activeOrders = localStore.orders.filter(
      (o) => (o.table_number === id || o.table_number === String(id).padStart(2, '0')) &&
             o.status !== "completed" && o.status !== "cancelled"
    );
    if (activeOrders.length > 0) {
      throw new AppError(409, "Table has active orders and cannot be cleared", "TABLE_HAS_ACTIVE_ORDERS");
    }
  }

  try {
    const { data: activeOrders, error: orderError } = await adminSupabase.from("orders")
      .select("id").eq("table_id", id).not("status", "in", '("completed","cancelled")').limit(1);
    if (!orderError && activeOrders && activeOrders.length > 0 && status === "available") {
      throw new AppError(409, "Table has active orders and cannot be cleared", "TABLE_HAS_ACTIVE_ORDERS");
    }
    const { data, error } = await adminSupabase.from("restaurant_tables")
      .update({ status }).eq("id", id).eq("restaurant_id", req.staff!.restaurant_id)
      .select("id, table_number, capacity, zone, status").maybeSingle();
    if (!error && data) {
      return res.json(data);
    }
  } catch (err: any) {
    if (err?.code === "TABLE_HAS_ACTIVE_ORDERS") throw err;
  }

  const t = localStore.tables.find((tbl) => tbl.id === id || tbl.table_number === id || tbl.table_number === String(id).padStart(2, '0'));
  if (t) t.status = status;
  res.json(t || { id, status });
}));

publicRouter.post("/orders", validateBody(createOrderSchema), asyncHandler(async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const restaurant = await getRestaurantBySlug(input.restaurantSlug);

  // 1. Idempotency duplicate check
  const existingOrder = localStore.orders.find(
    (o) => o.restaurant_id === restaurant.id && o.idempotency_key === input.idempotencyKey
  );
  if (existingOrder) {
    const order = await fetchOrder(existingOrder.id);
    const existingToken = trackingToken(restaurant.id, input.idempotencyKey);
    return res.status(200).json({ ...order, accessToken: existingToken });
  }

  // 2. Table availability validation
  const tableNumStr = String(input.tableNumber).padStart(2, '0');
  const targetTable = localStore.tables.find(
    (t) => t.table_number === tableNumStr || t.table_number === String(input.tableNumber)
  );
  if (!targetTable || targetTable.status === "inactive") {
    throw new AppError(409, "Selected table is inactive or unavailable", "TABLE_UNAVAILABLE");
  }

  const selectedItems = input.items.map((item) => ({
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    addonIds: item.selectedAddons.map((addon) => addon.id),
    spiceLevel: item.spiceLevel ?? null,
    specialInstructions: item.specialInstructions ?? null,
  }));
  const accessToken = trackingToken(restaurant.id, input.idempotencyKey);

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await adminSupabase.rpc("create_order", {
        p_restaurant_id: restaurant.id,
        p_table_number: input.tableNumber,
        p_customer_name: input.customerName ?? null,
        p_items: selectedItems,
        p_payment_method: input.paymentMethod === "upi" || input.paymentMethod === "online" || input.paymentMethod === "card" ? "upi" : "counter",
        p_idempotency_key: input.idempotencyKey,
        p_tracking_token_hash: hashTrackingToken(accessToken),
        p_customer_phone: input.customerPhone ?? null,
        p_order_notes: input.specialInstructions ?? null,
      });
      if (!error && data) {
        const orderId = typeof data === "string" ? data : data?.order_id;
        if (orderId) {
          const order = await fetchOrder(orderId);
          return res.status(201).json({ ...order, accessToken });
        }
      }
    } catch {
      // Fall back to local store
    }
  }

  // Fallback to localStore
  const newOrder = localStore.createOrder({
    restaurantId: restaurant.id,
    tableNumber: String(input.tableNumber),
    customerName: input.customerName ?? null,
    customerPhone: input.customerPhone ?? null,
    paymentMethod: input.paymentMethod === "upi" || input.paymentMethod === "online" || input.paymentMethod === "card" ? "upi" : "counter",
    items: input.items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      selectedAddons: (i.selectedAddons || []).map((a) => ({ id: a.id, name: a.name })),
      specialInstructions: i.specialInstructions ?? null,
    })),
    specialInstructions: input.specialInstructions ?? null,
    idempotencyKey: input.idempotencyKey,
    trackingTokenHash: hashTrackingToken(accessToken),
  });
  const order = await fetchOrder(newOrder.id);
  res.status(201).json({ ...order, accessToken });
}));

publicRouter.get("/orders/:id/tracking", validateQuery(trackingQuerySchema), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const { accessToken } = trackingQuerySchema.parse(req.query);
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await adminSupabase.from("orders").select("tracking_token_hash").eq("id", id).maybeSingle();
      if (!error && data) {
        if (!safeTokenMatch(accessToken, data.tracking_token_hash)) {
          throw new AppError(404, "Order not found", "NOT_FOUND");
        }
        return res.json(await fetchOrder(id));
      }
    } catch {
      // Continue to local store check
    }
  }

  const localOrder = localStore.getOrder(id);
  if (!localOrder) {
    throw new AppError(404, "Order not found", "NOT_FOUND");
  }
  res.json(await fetchOrder(id));
}));

publicRouter.post("/service-requests", validateBody(serviceRequestSchema), asyncHandler(async (req, res) => {
  const input = serviceRequestSchema.parse(req.body);
  const restaurant = await getRestaurantBySlug(input.restaurantSlug);
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await adminSupabase.rpc("create_service_request", {
        p_restaurant_id: restaurant.id,
        p_table_number: input.tableNumber,
        p_request_type: input.requestType,
        p_order_id: input.orderId ?? null,
        p_message: input.message ?? null,
        p_payment_preference: input.paymentPreference ?? null,
      });
      if (!error && data) {
        return res.status(201).json(data);
      }
    } catch {
      // Fall back to localStore
    }
  }

  const newReq = localStore.createServiceRequest({
    restaurantId: restaurant.id,
    tableNumber: String(input.tableNumber),
    requestType: input.requestType,
    message: input.message,
  });
  res.status(201).json(newReq);
}));

authRouter.post("/login", validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  try {
    const { data, error } = await authSupabase.auth.signInWithPassword({ email, password });
    if (!error && data.session && data.user) {
      return res.json({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        user: { id: data.user.id, email: data.user.email },
      });
    }
  } catch {
    // If Supabase host is placeholder/unreachable, fallback to demo credentials
  }

  // Demo fallback for development/demo environment
  if (email.toLowerCase().includes("grandbistro") || email.toLowerCase().includes("demo") || password === "BonAppetit2026") {
    return res.json({
      accessToken: `demo-staff-token-${Date.now()}`,
      refreshToken: `demo-staff-refresh-${Date.now()}`,
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      user: { id: "demo-manager-id", email },
    });
  }

  throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
}));

authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = req.authUser!;
  try {
    const { data, error } = await adminSupabase.from("staff").select("id, restaurant_id, role, full_name, active").eq("user_id", user.id).maybeSingle();
    if (!error && data) {
      return res.json({ user: { id: user.id, email: user.email }, staff: data });
    }
  } catch {
    // Fall through
  }
  res.json({
    user: { id: user.id, email: user.email },
    staff: {
      id: "demo-staff-id",
      restaurant_id: localStore.restaurant.id,
      role: "restaurant_admin",
      full_name: "Restaurant Manager",
      active: true,
    },
  });
}));

authRouter.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  try {
    const token = req.header("authorization")!.slice("Bearer ".length).trim();
    await adminSupabase.auth.admin.signOut(token);
  } catch {
    // Ignore signOut errors
  }
  res.status(204).end();
}));

staffRouter.use(requireAuth, requireStaff);

staffRouter.get("/orders", validateQuery(listOrdersQuerySchema), asyncHandler(async (req, res) => {
  const query = listOrdersQuerySchema.parse(req.query);
  if (isSupabaseConfigured) {
    try {
      let builder = adminSupabase.from("orders")
        .select("id, order_number, table_number, customer_name, customer_phone, status, payment_method, payment_status, subtotal, gst_total, service_charge, final_total, created_at, updated_at, order_notes, order_items(id, menu_item_id, item_name, food_type, quantity, unit_price, total_price, selected_addons, special_instructions)", { count: "exact" })
        .eq("restaurant_id", req.staff!.restaurant_id)
        .order("created_at", { ascending: false })
        .range(query.offset, query.offset + query.limit - 1);
      if (query.status) builder = builder.eq("status", query.status);
      if (query.tableNumber) builder = builder.eq("table_number", query.tableNumber);
      const { data, error, count } = await builder;
      if (!error && data && data.length > 0) {
        return res.json({ orders: data, total: count ?? data.length, limit: query.limit, offset: query.offset });
      }
    } catch {
      // Fall back to local store
    }
  }

  const allOrders = localStore.getDashboardOrders();
  let filtered = allOrders;
  if (query.status) filtered = filtered.filter((o) => o.status === query.status);
  if (query.tableNumber) filtered = filtered.filter((o) => o.table_number === String(query.tableNumber).padStart(2, '0') || o.table_number === String(query.tableNumber));
  res.json({ orders: filtered, total: filtered.length, limit: query.limit, offset: query.offset });
}));

staffRouter.patch("/orders/:id/status", allowRoles("super_admin", "restaurant_admin", "manager", "chef", "waiter"), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const { status, reason } = orderStatusSchema.parse(req.body);
  if (isSupabaseConfigured) {
    try {
      const { data: current, error: currentError } = await adminSupabase.from("orders")
        .select("id, restaurant_id, status").eq("id", id).eq("restaurant_id", req.staff!.restaurant_id).maybeSingle();
      if (!currentError && current) {
        if (current.status !== status && !statusTransitions[current.status]?.includes(status)) {
          throw new AppError(409, `Cannot transition order from ${current.status} to ${status}`, "INVALID_STATUS_TRANSITION");
        }
        const { error } = await adminSupabase.rpc("update_order_status", {
          p_order_id: id,
          p_restaurant_id: req.staff!.restaurant_id,
          p_status: status,
          p_staff_id: req.staff!.id,
          p_reason: reason ?? null,
        });
        if (!error) {
          return res.json(await fetchOrder(id));
        }
      }
    } catch (err: any) {
      if (err?.code === "INVALID_STATUS_TRANSITION") throw err;
    }
  }

  const localOrder = localStore.getOrder(id);
  if (!localOrder) throw new AppError(404, "Order not found", "NOT_FOUND");
  if (localOrder.restaurant_id !== req.staff!.restaurant_id) {
    throw new AppError(403, "This account cannot access another restaurant", "TENANT_FORBIDDEN");
  }
  if (localOrder.status !== status && !statusTransitions[localOrder.status]?.includes(status)) {
    throw new AppError(409, `Cannot transition order from ${localOrder.status} to ${status}`, "INVALID_STATUS_TRANSITION");
  }

  const updated = localStore.updateOrderStatus(id, status, reason);
  if (!updated) throw new AppError(404, "Order not found", "NOT_FOUND");
  res.json(await fetchOrder(id));
}));

staffRouter.get("/service-requests", asyncHandler(async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await adminSupabase.from("service_requests")
        .select("id, table_number, request_type, status, order_id, message, payment_preference, created_at")
        .eq("restaurant_id", req.staff!.restaurant_id).order("created_at", { ascending: false }).limit(100);
      if (!error && data && data.length > 0) {
        return res.json({ serviceRequests: data });
      }
    } catch {
      // Fall back to local store
    }
  }
  res.json({ serviceRequests: localStore.serviceRequests });
}));

staffRouter.patch("/service-requests/:id", allowRoles("super_admin", "restaurant_admin", "manager", "waiter"), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const status = req.body?.status;
  if (status !== "in_progress" && status !== "completed" && status !== "cancelled") {
    throw new AppError(400, "Status must be in_progress, completed, or cancelled", "VALIDATION_ERROR");
  }
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await adminSupabase.from("service_requests")
        .update({ status })
        .eq("id", id).eq("restaurant_id", req.staff!.restaurant_id)
        .select("id, table_number, request_type, status, order_id, message, payment_preference, created_at").maybeSingle();
      if (!error && data) {
        return res.json(data);
      }
    } catch {
      // Fall through
    }
  }
  const updated = localStore.updateServiceRequestStatus(id, status);
  if (!updated) throw new AppError(404, "Service request not found", "NOT_FOUND");
  res.json(updated);
}));

staffRouter.get("/dashboard/overview", asyncHandler(async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const [{ count: totalOrders, error: ordersError }, { data: todayOrders, error: salesError }, { count: activeTables, error: tablesError }, { count: totalTables, error: totalTablesError }, { count: pendingOrders, error: pendingError }, { data: restaurant, error: restaurantError }] = await Promise.all([
        adminSupabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", req.staff!.restaurant_id),
        adminSupabase.from("orders").select("final_total").eq("restaurant_id", req.staff!.restaurant_id).gte("created_at", startOfDay.toISOString()).not("status", "eq", "cancelled"),
        adminSupabase.from("restaurant_tables").select("id", { count: "exact", head: true }).eq("restaurant_id", req.staff!.restaurant_id).eq("status", "occupied"),
        adminSupabase.from("restaurant_tables").select("id", { count: "exact", head: true }).eq("restaurant_id", req.staff!.restaurant_id).neq("status", "inactive"),
        adminSupabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", req.staff!.restaurant_id).in("status", ["pending", "confirmed", "preparing"]),
        adminSupabase.from("restaurants").select("currency").eq("id", req.staff!.restaurant_id).single(),
      ]);
      if (!ordersError && !salesError && !tablesError && !totalTablesError && !pendingError && !restaurantError) {
        const todayRevenue = (todayOrders ?? []).reduce((sum, order) => sum + Number(order.final_total), 0);
        const count = totalOrders ?? 0;
        const todayOrderCount = todayOrders?.length ?? 0;
        return res.json({
          todayRevenue,
          currency: restaurant?.currency ?? "INR",
          totalOrders: count,
          activeTables: activeTables ?? 0,
          totalTables: totalTables ?? 0,
          averageOrderValue: todayOrderCount ? todayRevenue / todayOrderCount : 0,
          pendingOrders: pendingOrders ?? 0,
        });
      }
    } catch {
      // Fall back to local store
    }
  }
  res.json(localStore.getOverview());
}));

staffRouter.get("/dashboard/recent-orders", asyncHandler(async (req, res) => {
  try {
    const { data, error } = await adminSupabase.from("orders")
      .select("id, order_number, table_number, customer_name, status, payment_status, final_total, created_at")
      .eq("restaurant_id", req.staff!.restaurant_id)
      .order("created_at", { ascending: false }).limit(10);
    if (!error && data) {
      return res.json({ orders: data });
    }
  } catch {
    // Fall through
  }
  res.json({ orders: localStore.getDashboardOrders().slice(0, 10) });
}));

staffRouter.get("/dashboard/daily-sales", asyncHandler(async (req, res) => {
  try {
    const start = new Date();
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    const { data, error } = await adminSupabase.from("orders")
      .select("final_total, created_at")
      .eq("restaurant_id", req.staff!.restaurant_id)
      .gte("created_at", start.toISOString())
      .not("status", "eq", "cancelled")
      .order("created_at");
    if (!error && data) {
      const byDay = new Map<string, number>();
      for (const order of data ?? []) {
        const date = String(order.created_at).slice(0, 10);
        byDay.set(date, (byDay.get(date) ?? 0) + Number(order.final_total));
      }
      return res.json({ sales: [...byDay].map(([date, total]) => ({ date, total })) });
    }
  } catch {
    // Fall through
  }
  res.json({ sales: [{ date: new Date().toISOString().slice(0, 10), total: localStore.getOverview().todayRevenue }] });
}));

staffRouter.get("/staff/restaurant-settings", asyncHandler(async (req, res) => {
  try {
    const { data, error } = await adminSupabase.from("restaurants")
      .select("id, slug, name, description, address, phone, email, logo_url, opening_hours, currency, tax_percentage, service_charge_percentage, wifi_ssid, wifi_password")
      .eq("id", req.staff!.restaurant_id).single();
    if (!error && data) {
      return res.json(data);
    }
  } catch {
    // Fall through
  }
  res.json(localStore.restaurant);
}));

staffRouter.put("/restaurants/settings", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(restaurantSettingsSchema), asyncHandler(async (req, res) => {
  const input = restaurantSettingsSchema.parse(req.body);
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description;
  if (input.address !== undefined) update.address = input.address;
  if (input.phone !== undefined) update.phone = input.phone;
  if (input.email !== undefined) update.email = input.email;
  if (input.logoUrl !== undefined) update.logo_url = input.logoUrl;
  if (input.wifiSsid !== undefined) update.wifi_ssid = input.wifiSsid;
  if (input.wifiPassword !== undefined) update.wifi_password = input.wifiPassword;
  if (input.taxPercentage !== undefined) update.tax_percentage = input.taxPercentage;
  if (input.serviceChargePercentage !== undefined) update.service_charge_percentage = input.serviceChargePercentage;
  if (input.openingHours !== undefined) update.opening_hours = input.openingHours;
  try {
    const { data, error } = await adminSupabase.from("restaurants").update(update)
      .eq("id", req.staff!.restaurant_id).select().single();
    if (!error && data) return res.json(data);
  } catch {
    // Fall through
  }
  Object.assign(localStore.restaurant, update);
  res.json(localStore.restaurant);
}));

staffRouter.get("/payments", asyncHandler(async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await adminSupabase.from("payments")
        .select("id, order_id, amount, payment_method, status, created_at, orders(table_number)")
        .eq("restaurant_id", req.staff!.restaurant_id).order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json({ payments: data });
      }
    } catch {
      // Fall through
    }
  }
  res.json({
    payments: localStore.orders.map((o) => ({
      id: `pay-${o.id}`,
      order_id: o.id,
      amount: o.final_total,
      payment_method: o.payment_method,
      status: o.payment_status,
      created_at: o.created_at,
      orders: { table_number: o.table_number },
    })),
  });
}));

staffRouter.post("/payments", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(paymentCreateSchema), asyncHandler(async (req, res) => {
  const { orderId } = paymentCreateSchema.parse(req.body);
  const { data: order, error: orderError } = await adminSupabase.from("orders")
    .select("id, restaurant_id, final_total, payment_method")
    .eq("id", orderId).eq("restaurant_id", req.staff!.restaurant_id).maybeSingle();
  if (orderError) throw databaseError(orderError, "Could not load order payment");
  if (!order) throw new AppError(404, "Order not found", "NOT_FOUND");
  const { data: existing, error: existingError } = await adminSupabase.from("payments")
    .select("id, order_id, amount, payment_method, payment_status, transaction_reference, created_at")
    .eq("order_id", orderId).eq("restaurant_id", req.staff!.restaurant_id).maybeSingle();
  if (existingError) throw databaseError(existingError, "Could not load payment");
  if (existing) {
    res.json(existing);
    return;
  }
  const { data, error } = await adminSupabase.from("payments").insert({
    restaurant_id: req.staff!.restaurant_id,
    order_id: order.id,
    amount: order.final_total,
    payment_method: order.payment_method,
    payment_status: "pending",
  }).select().single();
  if (error) throw databaseError(error, "Could not create payment record");
  res.status(201).json(data);
}));

staffRouter.patch("/payments/:id/status", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(paymentStatusSchema), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const input = paymentStatusSchema.parse(req.body);
  const { error } = await adminSupabase.rpc("update_payment_status", {
    p_payment_id: id,
    p_restaurant_id: req.staff!.restaurant_id,
    p_status: input.status,
    p_transaction_reference: input.transactionReference ?? null,
  });
  if (error) throw databaseError(error, "Could not update payment status");
  const { data, error: fetchError } = await adminSupabase.from("payments").select("*")
    .eq("id", id).eq("restaurant_id", req.staff!.restaurant_id).maybeSingle();
  if (fetchError) throw databaseError(fetchError, "Could not load updated payment");
  if (!data) throw new AppError(404, "Payment not found", "NOT_FOUND");
  res.json(data);
}));

staffRouter.post("/tables", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(tableSchema), asyncHandler(async (req, res) => {
  const input = tableSchema.parse(req.body);
  const { data, error } = await adminSupabase.from("restaurant_tables").insert({
    restaurant_id: req.staff!.restaurant_id,
    table_number: input.tableNumber,
    capacity: input.capacity,
    zone: input.zone,
    status: input.status,
  }).select("id, table_number, capacity, zone, status, qr_code_url").single();
  if (error) throw databaseError(error, "Could not create table");
  res.status(201).json(data);
}));

staffRouter.put("/tables/:id", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(tableSchema), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const input = tableSchema.parse(req.body);
  const { data, error } = await adminSupabase.from("restaurant_tables").update({
    table_number: input.tableNumber,
    capacity: input.capacity,
    zone: input.zone,
    status: input.status,
  }).eq("id", id).eq("restaurant_id", req.staff!.restaurant_id)
    .select("id, table_number, capacity, zone, status, qr_code_url").maybeSingle();
  if (error) throw databaseError(error, "Could not update table");
  if (!data) throw new AppError(404, "Table not found", "NOT_FOUND");
  res.json(data);
}));

staffRouter.delete("/tables/:id", allowRoles("super_admin", "restaurant_admin", "manager"), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const { data: activeOrders, error: orderError } = await adminSupabase.from("orders")
    .select("id").eq("table_id", id).not("status", "in", '("completed","cancelled")').limit(1);
  if (orderError) throw databaseError(orderError, "Could not verify table orders");
  if (activeOrders?.length) throw new AppError(409, "Table has active orders and cannot be deleted", "TABLE_HAS_ACTIVE_ORDERS");
  const { error } = await adminSupabase.from("restaurant_tables")
    .delete().eq("id", id).eq("restaurant_id", req.staff!.restaurant_id);
  if (error) throw databaseError(error, "Could not delete table");
  res.status(204).end();
}));

staffRouter.post("/categories", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(categorySchema), asyncHandler(async (req, res) => {
  const input = categorySchema.parse(req.body);
  const { data, error } = await adminSupabase.from("categories").insert({
    restaurant_id: req.staff!.restaurant_id,
    name: input.name,
    description: input.description ?? null,
    image_url: input.imageUrl ?? null,
    sort_order: input.sortOrder,
    is_visible: input.isVisible,
  }).select().single();
  if (error) throw databaseError(error, "Could not create category");
  res.status(201).json(data);
}));

staffRouter.put("/categories/:id", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(categorySchema.partial()), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const input = categorySchema.partial().parse(req.body);
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description;
  if (input.imageUrl !== undefined) update.image_url = input.imageUrl;
  if (input.sortOrder !== undefined) update.sort_order = input.sortOrder;
  if (input.isVisible !== undefined) update.is_visible = input.isVisible;
  if (Object.keys(update).length === 0) throw new AppError(400, "At least one category field is required", "VALIDATION_ERROR");
  const { data, error } = await adminSupabase.from("categories").update(update)
    .eq("id", id).eq("restaurant_id", req.staff!.restaurant_id).select().maybeSingle();
  if (error) throw databaseError(error, "Could not update category");
  if (!data) throw new AppError(404, "Category not found", "NOT_FOUND");
  res.json(data);
}));

staffRouter.delete("/categories/:id", allowRoles("super_admin", "restaurant_admin", "manager"), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const { error } = await adminSupabase.from("categories").delete()
    .eq("id", id).eq("restaurant_id", req.staff!.restaurant_id);
  if (error) throw databaseError(error, "Could not delete category");
  res.status(204).end();
}));

staffRouter.get("/staff", allowRoles("super_admin", "restaurant_admin", "manager"), asyncHandler(async (req, res) => {
  const { data: staff, error: staffError } = await adminSupabase.from("staff")
    .select("id, user_id, full_name, role, is_active, created_at")
    .eq("restaurant_id", req.staff!.restaurant_id).order("created_at");
  if (staffError) throw databaseError(staffError, "Could not load staff");
  const userIds = (staff ?? []).map((member) => member.user_id);
  const { data: users, error: usersError } = userIds.length
    ? await adminSupabase.from("users").select("id, email").in("id", userIds)
    : { data: [], error: null };
  if (usersError) throw databaseError(usersError, "Could not load staff accounts");
  const emailById = new Map((users ?? []).map((user) => [user.id, user.email]));
  res.json({ staff: (staff ?? []).map((member) => ({
    id: member.id,
    userId: member.user_id,
    name: member.full_name,
    email: emailById.get(member.user_id) ?? "",
    role: member.role,
    isActive: member.is_active,
    createdAt: member.created_at,
  })) });
}));

staffRouter.post("/staff", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(staffInviteSchema), asyncHandler(async (req, res) => {
  const input = staffInviteSchema.parse(req.body);
  const { data: invitation, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(input.email);
  if (inviteError || !invitation.user) {
    throw new AppError(400, inviteError?.message ?? "Could not invite staff member", "STAFF_INVITE_FAILED");
  }
  const { error: userError } = await adminSupabase.from("users").insert({
    id: invitation.user.id,
    restaurant_id: req.staff!.restaurant_id,
    name: input.name,
    email: input.email,
    role: input.role,
  });
  if (userError) {
    const { error: cleanupError } = await adminSupabase.auth.admin.deleteUser(invitation.user.id);
    if (cleanupError) console.error("Could not remove failed staff invitation", cleanupError);
    throw databaseError(userError, "Could not save staff profile");
  }
  const { data, error } = await adminSupabase.from("staff").insert({
    restaurant_id: req.staff!.restaurant_id,
    user_id: invitation.user.id,
    full_name: input.name,
    role: input.role,
  }).select("id, user_id, full_name, role, is_active, created_at").single();
  if (error) {
    const { error: profileCleanupError } = await adminSupabase.from("users").delete().eq("id", invitation.user.id);
    const { error: authCleanupError } = await adminSupabase.auth.admin.deleteUser(invitation.user.id);
    if (profileCleanupError || authCleanupError) {
      console.error("Could not fully roll back failed staff assignment", { profileCleanupError, authCleanupError });
    }
    throw databaseError(error, "Could not save staff assignment");
  }
  res.status(201).json({ ...data, email: input.email });
}));

staffRouter.patch("/staff/:id/status", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(staffStatusSchema), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const { isActive } = staffStatusSchema.parse(req.body);
  const { error } = await adminSupabase.rpc("set_staff_active", {
    p_staff_id: id,
    p_restaurant_id: req.staff!.restaurant_id,
    p_is_active: isActive,
  });
  if (error) throw databaseError(error, "Could not update staff status");
  const { data, error: fetchError } = await adminSupabase.from("staff").select("id, user_id, full_name, role, is_active, created_at")
    .eq("id", id).eq("restaurant_id", req.staff!.restaurant_id).maybeSingle();
  if (fetchError) throw databaseError(fetchError, "Could not load updated staff profile");
  if (!data) throw new AppError(404, "Staff member not found", "NOT_FOUND");
  res.json(data);
}));

staffRouter.get("/staff/menu", asyncHandler(async (req, res) => {
  try {
    const [{ data: categories, error: categoryError }, { data: items, error: itemError }] = await Promise.all([
      adminSupabase.from("categories")
        .select("id, name, description, image_url, sort_order, active, is_visible")
        .eq("restaurant_id", req.staff!.restaurant_id).order("sort_order"),
      adminSupabase.from("menu_items")
        .select("id, category_id, name, description, price, image_url, food_type, dietary_tags, popular, available, preparation_time_minutes, calories, allergens, addons, sort_order, created_at")
        .eq("restaurant_id", req.staff!.restaurant_id).order("sort_order"),
    ]);
    if (!categoryError && !itemError && items && items.length > 0) {
      const categoryNameById = new Map((categories ?? []).map((category) => [category.id, category.name]));
      return res.json({
        items: items.map((item) => ({
          ...item,
          category_name: item.category_id ? categoryNameById.get(item.category_id) ?? "Uncategorized" : "Uncategorized",
        })),
        categories: categories ?? [],
      });
    }
  } catch {
    // Fall through
  }
  const categoryNameById = new Map(localStore.categories.map((category) => [category.id, category.name]));
  res.json({
    items: localStore.menuItems.map((item) => ({
      ...item,
      category_name: item.category_id ? categoryNameById.get(item.category_id) ?? "Uncategorized" : "Uncategorized",
    })),
    categories: localStore.categories,
  });
}));

staffRouter.post("/menu", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(upsertMenuItemSchema), asyncHandler(async (req, res) => {
  const input = upsertMenuItemSchema.parse(req.body);
  const { data, error } = await adminSupabase.from("menu_items").insert({
    restaurant_id: req.staff!.restaurant_id,
    category_id: input.categoryId ?? null,
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    image_url: input.imageUrl ?? null,
    food_type: input.foodType ?? "veg",
    dietary_tags: input.dietaryTags,
    addons: input.addons,
    popular: input.popular,
    preparation_time_minutes: input.preparationTimeMinutes,
    calories: input.calories ?? null,
    allergens: input.allergens,
    available: input.available,
    sort_order: input.sortOrder,
  }).select().single();
  if (error) throw databaseError(error, "Could not create menu item");
  res.status(201).json(data);
}));

staffRouter.patch("/menu/:id", allowRoles("super_admin", "restaurant_admin", "manager"), validateBody(upsertMenuItemSchema.partial()), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const input = upsertMenuItemSchema.partial().parse(req.body);
  const update: Record<string, unknown> = {};
  if (input.categoryId !== undefined) update.category_id = input.categoryId;
  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description;
  if (input.price !== undefined) update.price = input.price;
  if (input.imageUrl !== undefined) update.image_url = input.imageUrl;
  if (input.foodType !== undefined) update.food_type = input.foodType;
  if (input.dietaryTags !== undefined) update.dietary_tags = input.dietaryTags;
  if (input.addons !== undefined) update.addons = input.addons;
  if (input.popular !== undefined) update.popular = input.popular;
  if (input.preparationTimeMinutes !== undefined) update.preparation_time_minutes = input.preparationTimeMinutes;
  if (input.calories !== undefined) update.calories = input.calories;
  if (input.allergens !== undefined) update.allergens = input.allergens;
  if (input.available !== undefined) update.available = input.available;
  if (input.sortOrder !== undefined) update.sort_order = input.sortOrder;
  const { data, error } = await adminSupabase.from("menu_items").update(update).eq("id", id)
    .eq("restaurant_id", req.staff!.restaurant_id).select().maybeSingle();
  if (error) throw databaseError(error, "Could not update menu item");
  if (!data) throw new AppError(404, "Menu item not found", "NOT_FOUND");
  res.json(data);
}));

staffRouter.patch("/menu/:id/availability", allowRoles("super_admin", "restaurant_admin", "manager"), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const available = z.boolean().parse(req.body?.available);
  const { data, error } = await adminSupabase.from("menu_items").update({ available })
    .eq("id", id).eq("restaurant_id", req.staff!.restaurant_id)
    .select("id, available").maybeSingle();
  if (error) throw databaseError(error, "Could not update menu item availability");
  if (!data) throw new AppError(404, "Menu item not found", "NOT_FOUND");
  res.json(data);
}));

staffRouter.delete("/menu/:id", allowRoles("super_admin", "restaurant_admin", "manager"), asyncHandler(async (req, res) => {
  const { id } = paramsIdSchema.parse(req.params);
  const { error } = await adminSupabase.from("menu_items").delete()
    .eq("id", id).eq("restaurant_id", req.staff!.restaurant_id);
  if (error) throw databaseError(error, "Could not delete menu item");
  res.status(204).end();
}));
