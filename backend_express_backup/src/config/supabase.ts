import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const isSupabaseConfigured =
  !env.SUPABASE_URL.includes("placeholder") &&
  !env.SUPABASE_URL.includes("example-project") &&
  !env.SUPABASE_ANON_KEY.startsWith("demo-") &&
  env.SUPABASE_ANON_KEY.length > 50;

export const adminSupabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const authSupabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
