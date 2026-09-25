import api from "./api";
import { isSupabaseConfigured } from "../lib/supabase";
import { supabaseService } from "./supabaseService";

export const signupUser = async (userData) => {
  if (isSupabaseConfigured()) {
    try {
      const res = await supabaseService.signUp(userData);
      return {
        success: true,
        user: res.user,
        token: res.session?.access_token || "supabase_session",
      };
    } catch (err) {
      console.warn("Supabase signup failed, trying API fallback:", err.message);
      throw err;
    }
  }

  const response = await api.post("/auth/signup", userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  if (isSupabaseConfigured()) {
    try {
      const res = await supabaseService.signIn(credentials);
      return {
        success: true,
        user: res.user,
        token: res.session?.access_token || "supabase_session",
      };
    } catch (err) {
      console.warn("Supabase login failed, trying API fallback:", err.message);
      throw err;
    }
  }

  const response = await api.post("/auth/login", credentials);
  return response.data;
};

export const getCurrentUser = async () => {
  if (isSupabaseConfigured()) {
    try {
      const userStr = localStorage.getItem("fittrack_user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed.id) {
          const profile = await supabaseService.getCurrentProfile(parsed.id);
          if (profile) return { success: true, user: profile };
        }
      }
    } catch (err) {
      console.warn("Supabase profile fetch error:", err);
    }
  }

  const response = await api.get("/auth/me");
  return response.data;
};

export const logoutUser = async () => {
  if (isSupabaseConfigured()) {
    await supabaseService.signOut();
  }
  localStorage.removeItem("fittrack_user");
  localStorage.removeItem("fittrack_token");
};