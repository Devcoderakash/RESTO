import type { User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      authUser?: User;
      staff?: {
        id: string;
        restaurant_id: string;
        role: "super_admin" | "restaurant_admin" | "manager" | "chef" | "waiter";
        full_name: string;
      };
    }
  }
}

export {};
