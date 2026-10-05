import api from "./api";
import { isSupabaseConfigured } from "../lib/supabase";
import { supabaseService } from "./supabaseService";

export const getMemberWorkouts = async (memberId) => {
  if (isSupabaseConfigured()) {
    try {
      const data = await supabaseService.getMemberWorkouts(memberId);
      if (data && data.length > 0) return data;
    } catch (err) {
      console.warn("Supabase getMemberWorkouts error:", err);
    }
  }

  try {
    const response = await api.get(`/workouts/member/${memberId}`);
    return response.data;
  } catch (error) {
    console.warn("API unavailable, falling back to local data", error);
    return [];
  }
};

export const completeExercise = async (workoutId, exerciseId, extraData = {}) => {
  if (isSupabaseConfigured()) {
    try {
      await supabaseService.completeExercise(exerciseId, extraData);
      return { success: true };
    } catch (err) {
      console.warn("Supabase completeExercise error:", err);
    }
  }

  try {
    const response = await api.post(`/workouts/${workoutId}/complete/${exerciseId}`);
    return response.data;
  } catch (error) {
    console.warn("API unavailable, completing locally", error);
    return { success: true };
  }
};

export const assignWorkout = async (data) => {
  if (isSupabaseConfigured()) {
    try {
      const workout = await supabaseService.assignWorkout(data);
      return { success: true, data: workout };
    } catch (err) {
      console.warn("Supabase assignWorkout error:", err);
    }
  }

  try {
    const response = await api.post("/workouts/assign", data);
    return response.data;
  } catch (error) {
    console.warn("API unavailable, assigned locally", error);
    return { success: true, data };
  }
};

export default {
  getMemberWorkouts,
  completeExercise,
  assignWorkout,
};
