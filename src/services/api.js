import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("fittrack_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (
      typeof response.data === "string" &&
      (response.data.includes("<!DOCTYPE") || response.data.includes("<html") || response.data.includes("<head"))
    ) {
      return Promise.reject(new Error("Backend API offline: returned HTML fallback"));
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default api;