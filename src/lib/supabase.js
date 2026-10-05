import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL || "";
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return (
    Boolean(cleanUrl) &&
    Boolean(supabaseAnonKey) &&
    cleanUrl !== "https://your-project.supabase.co" &&
    supabaseAnonKey !== "your-anon-key"
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(cleanUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export default supabase;
