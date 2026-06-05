import axios from "axios";
import { authStore } from "../stores/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = authStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshingPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;

    if (status === 401 && !original?._retry) {
      original._retry = true;

      try {
        if (!refreshingPromise) {
          refreshingPromise = api.post("/auth/refresh").then((r) => r.data.accessToken);
        }
        const newToken = await refreshingPromise;
        authStore.getState().setAccessToken(newToken);
        refreshingPromise = null;

        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        refreshingPromise = null;
        authStore.getState().clear();
      }
    }

    return Promise.reject(error);
  }
);

