import axios from "axios";
import {
  clearAdminSession,
  getAdminToken,
  getAdminTokenExpiry,
  isAdminSessionExpired,
} from "../utils/session";

const API_BASE = import.meta.env.VITE_API_BASE?.trim() || "";
const adminBaseUrl = API_BASE
  ? `${API_BASE.replace(/\/+$/, "")}/api/v1/admin`
  : "/api/v1/admin";

const api = axios.create({
  baseURL: adminBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  const tokenExpiresAt = getAdminTokenExpiry();

  if (token && isAdminSessionExpired(tokenExpiresAt)) {
    clearAdminSession();
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
    return Promise.reject(new Error("Admin session expired. Please sign in again."));
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Don't auto-redirect on the login route itself — let the page handle it
    const isLoginRoute = err.config?.url?.includes("/login");
    if (err.response?.status === 401 && !isLoginRoute) {
      clearAdminSession();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;
