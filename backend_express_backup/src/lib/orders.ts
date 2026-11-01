import { adminSupabase, isSupabaseConfigured } from "../config/supabase.js";
import { AppError, databaseError } from "./errors.js";
import { localStore } from "./local-store.js";

export const statusTransitions: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["completed"],
  completed: [],
  cancelled: [],
};

const customerStatus: Record<string, string> = {
  pending: "received",
  confirmed: "accepted",
  preparing: "preparing",
  ready: "ready",
  served: "served",
  completed: "completed",
  cancelled: "cancelled",
};

export function customerOrderStatus(status: string): string {
  return customerStatus[status] ?? status;
}

export async function fetchOrder(orderId: string) {
  if (isSupabaseConfigured) {
  try {
    const { data, error } = await adminSupabase
      .from("orders")
      .select("id, order_number, restaurant_id, table_number, customer_name, customer_phone, status, payment_method, payment_status, subtotal, cgst, sgst, gst_total, service_charge, final_total, created_at, estimated_time_minutes, order_notes, cancellation_reason, status_timeline, order_items(id, menu_item_id, item_name, food_type, quantity, unit_price, selected_addons, special_instructions)")
      .eq("id", orderId)
      .maybeSingle();

    if (!error && data) {
      const items = (data.order_items || []).map((item: any) => {
        const addons = Array.isArray(item.selected_addons) ? item.selected_addons : [];
        const addonTotal = addons.reduce((sum: number, addon: { price?: number }) => sum + Number(addon.price ?? 0), 0);
        const unitPriceWithCustomizations = Number(item.unit_price) + addonTotal;
        const isVegetarian = item.food_type === "veg";
        return {
          cartItemId: item.id,
          menuItemId: item.menu_item_id,
          foodItem: {
            id: item.menu_item_id,
            name: item.item_name,
            description: "",
            price: Number(item.unit_price),
            category: "",
            image: "",
            isVegetarian,
            dietaryType: isVegetarian ? "veg" : "non-veg",
            isAvailable: true,
            preparationTime: "",
          },
          quantity: item.quantity,
          selectedCustomizations: addons.map((addon: { id?: string; name?: string; price?: number }) => ({
            groupId: "addons",
            groupName: "Add-ons",
            optionId: addon.id ?? "",
            optionName: addon.name ?? "",
            price: Number(addon.price ?? 0),
          })),
          specialInstructions: item.special_instructions,
          unitPriceWithCustomizations,
          lineTotal: unitPriceWithCustomizations * item.quantity,
        };
      });

      return {
        id: data.id,
        orderNumber: data.order_number,
        tableNumber: data.table_number,
        ...(data.customer_name ? { customerName: data.customer_name } : {}),
        ...(data.customer_phone ? { customerPhone: data.customer_phone } : {}),
        items,
        breakdown: {
          subtotal: Number(data.subtotal),
          cgst: Number(data.cgst),
          sgst: Number(data.sgst),
          gstTotal: Number(data.gst_total),
          serviceCharge: Number(data.service_charge),
          finalTotal: Number(data.final_total),
        },
        paymentMethod: data.payment_method === "upi" || data.payment_method === "online" || data.payment_method === "card" ? "upi" : "counter",
        paymentStatus: data.payment_status,
        status: customerOrderStatus(data.status),
        createdAt: data.created_at,
        estimatedTimeMinutes: data.estimated_time_minutes,
        ...(data.order_notes ? { orderNotes: data.order_notes } : {}),
        ...(data.cancellation_reason ? { cancelledReason: data.cancellation_reason } : {}),
        statusTimeline: data.status_timeline,
      };
    }
  } catch {
    // Fall back to local store
  }
}

  // Fallback to localStore
  const localOrder = localStore.getOrder(orderId);
  if (!localOrder) {
    throw new AppError(404, "Order not found", "NOT_FOUND");
  }

  const items = localOrder.items.map((item) => {
    const addons = Array.isArray(item.selected_addons) ? item.selected_addons : [];
    const addonTotal = addons.reduce((sum: number, addon: { price?: number }) => sum + Number(addon.price ?? 0), 0);
    const unitPriceWithCustomizations = Number(item.unit_price) + addonTotal;
    const isVegetarian = item.food_type === "veg";
    return {
      cartItemId: item.id,
      menuItemId: item.menu_item_id,
      foodItem: {
        id: item.menu_item_id,
        name: item.item_name,
        description: "",
        price: Number(item.unit_price),
        category: "",
        image: "",
        isVegetarian,
        dietaryType: isVegetarian ? "veg" : "non-veg",
        isAvailable: true,
        preparationTime: "",
      },
      quantity: item.quantity,
      selectedCustomizations: addons.map((addon) => ({
        groupId: "addons",
        groupName: "Add-ons",
        optionId: addon.id ?? "",
        optionName: addon.name ?? "",
        price: Number(addon.price ?? 0),
      })),
      specialInstructions: item.special_instructions,
      unitPriceWithCustomizations,
      lineTotal: unitPriceWithCustomizations * item.quantity,
    };
  });

  return {
    id: localOrder.id,
    orderNumber: localOrder.order_number,
    tableNumber: localOrder.table_number,
    ...(localOrder.customer_name ? { customerName: localOrder.customer_name } : {}),
    ...(localOrder.customer_phone ? { customerPhone: localOrder.customer_phone } : {}),
    items,
    breakdown: {
      subtotal: Number(localOrder.subtotal),
      cgst: Number(localOrder.cgst),
      sgst: Number(localOrder.sgst),
      gstTotal: Number(localOrder.gst_total),
      serviceCharge: Number(localOrder.service_charge),
      finalTotal: Number(localOrder.final_total),
    },
    paymentMethod: localOrder.payment_method === "upi" || localOrder.payment_method === "online" || localOrder.payment_method === "card" ? "upi" : "counter",
    paymentStatus: localOrder.payment_status,
    status: customerOrderStatus(localOrder.status),
    createdAt: localOrder.created_at,
    estimatedTimeMinutes: localOrder.estimated_time_minutes,
    ...(localOrder.order_notes ? { orderNotes: localOrder.order_notes } : {}),
    statusTimeline: localOrder.status_timeline,
  };
}
