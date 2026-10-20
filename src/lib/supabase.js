import { createClient } from "@supabase/supabase-js";

// Production Supabase Cloud Credentials for FiTrack
const DEFAULT_SUPABASE_URL = "https://dydznokssaipevedyyjx.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZHpub2tzc2FpcGV2ZWR5eWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTIyMTcsImV4cCI6MjEwNTkyODIxN30.-tonzFNAJLVFxuMI4IdHeZBuB6l_sdz4h2aeE5K24Yc";

const rawUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

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
