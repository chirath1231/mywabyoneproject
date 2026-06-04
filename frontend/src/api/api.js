import axios from "axios";

// ✅ Always use relative path in development — CRA proxy forwards to :5000
// In production, REACT_APP_API_URL should be your deployed backend URL
// e.g. https://your-api.railway.app/api
const API_BASE = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Add auth token + active workspace header to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wabyone_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const url = config.url || "";
  // Only add workspace header for non-auth and non-onboarding endpoints
  if (!url.includes("/auth/") && !url.includes("/onboarding/")) {
    const wsId = localStorage.getItem("wabyone_workspace_id");
    if (wsId) {
      config.headers["X-Workspace-Id"] = wsId;
    }
  }

  return config;
});

// Handle 401 — clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("wabyone_token");
      localStorage.removeItem("wabyone_user");
      localStorage.removeItem("wabyone_org");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;