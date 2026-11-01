import { adminSupabase, isSupabaseConfigured } from "../config/supabase.js";
import { AppError } from "./errors.js";
import { localStore } from "./local-store.js";

export async function getRestaurantBySlug(slug: string) {
  if (!isSupabaseConfigured) {
    if (slug === localStore.restaurant.slug || slug === "olive-and-ember") {
      return localStore.restaurant;
    }
    throw new AppError(404, "Restaurant not found", "NOT_FOUND");
  }
  try {
    const { data, error } = await adminSupabase
      .from("restaurants")
      .select("id, slug, name, description, address, phone, email, currency, timezone, opening_hours, logo_url, tax_percentage, wifi_ssid, wifi_password")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) {
      if (slug === localStore.restaurant.slug || slug === "olive-and-ember") {
        return localStore.restaurant;
      }
      throw new AppError(404, "Restaurant not found", "NOT_FOUND");
    }
    return data;
  } catch (err) {
    if (slug === localStore.restaurant.slug || slug === "olive-and-ember") {
      return localStore.restaurant;
    }
    throw err;
  }
}

export async function assertRestaurantScope(restaurantId: string, staffRestaurantId?: string) {
  if (staffRestaurantId && staffRestaurantId !== restaurantId) {
    throw new AppError(403, "This account cannot access another restaurant", "TENANT_FORBIDDEN");
  }
}
