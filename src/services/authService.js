import api from "./api";
import { isSupabaseConfigured } from "../lib/supabase";
import { supabaseService } from "./supabaseService";
import { localAuthenticateUser, localRegisterUser } from "./mockData";

export const signupUser = async (userData) => {
  const normEmail = (userData?.email || "").trim().toLowerCase();
  const payload = { ...userData, email: normEmail };

  // 1. Try Supabase Cloud Database if configured
  if (isSupabaseConfigured()) {
    try {
      const res = await supabaseService.signUp(payload);
      if (res?.user) {
        return {
          success: true,
          user: res.user,
          token: res.session?.access_token || `supabase_token_${Date.now()}`,
        };
      }
    } catch (err) {
      console.warn("Supabase signup failed, attempting fallback:", err.message || err);
    }
  }

  // 2. Try Express REST API if available
  try {
    const response = await api.post("/auth/signup", payload);
    if (response?.data?.success) {
      return response.data;
    }
  } catch (apiErr) {
    console.warn("Express backend signup unavailable, saving locally:", apiErr.message || apiErr);
  }

  // 3. Resilient Local Storage Registration
  return localRegisterUser(payload);
};

export const loginUser = async (credentials) => {
  const normEmail = (credentials?.email || "").trim().toLowerCase();
  const password = credentials?.password || "";
  const creds = { email: normEmail, password };

  // 1. Master Admin instant local bypass for offline admin access
  if (normEmail === "admin@fittrack.com" || normEmail === "admin") {
    return localAuthenticateUser(creds);
  }

  // 2. Try Supabase Cloud Database if configured
  if (isSupabaseConfigured()) {
    try {
      const res = await supabaseService.signIn(creds);
      if (res?.user) {
        return {
          success: true,
          user: res.user,
          token: res.session?.access_token || `supabase_token_${Date.now()}`,
        };
      }
    } catch (err) {
      console.warn("Supabase login failed, attempting fallback:", err.message || err);
    }
  }

  // 3. Try Express REST API if available
  try {
    const response = await api.post("/auth/login", creds);
    if (response?.data?.success) {
      return response.data;
    }
  } catch (apiErr) {
    console.warn("Express backend login unavailable, authenticating locally:", apiErr.message || apiErr);
  }

  // 4. Resilient Local Storage Authentication (Always logs demo/local accounts in)
  return localAuthenticateUser(creds);
};

export const getCurrentUser = async () => {
  if (isSupabaseConfigured()) {
    try {
      const userStr = localStorage.getItem("fittrack_user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed.id && !parsed.id.startsWith("user_") && !parsed.id.startsWith("admin_")) {
          const profile = await supabaseService.getCurrentProfile(parsed.id);
          if (profile) return { success: true, user: profile };
        }
      }
    } catch (err) {
      console.warn("Supabase profile fetch error:", err);
    }
  }

  try {
    const response = await api.get("/auth/me");
    if (response?.data?.success) return response.data;
  } catch (err) {
    // ignore
  }

  const userStr = localStorage.getItem("fittrack_user");
  if (userStr) {
    return { success: true, user: JSON.parse(userStr) };
  }
  return { success: false, message: "No active session" };
};

export const logoutUser = async () => {
  if (isSupabaseConfigured()) {
    await supabaseService.signOut();
  }
  localStorage.removeItem("fittrack_user");
  localStorage.removeItem("fittrack_token");
};