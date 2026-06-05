import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

export const authStore = create()(
  persist(
    (set, get) => ({
      accessToken: "",
      user: null,
      bootstrapped: false,

      setAccessToken: (token) => set({ accessToken: token || "" }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: "", user: null }),

      bootstrap: async () => {
        try {
          // Try refresh first (cookie-based), then fetch /auth/me
          const r = await api.post("/auth/refresh");
          const token = r.data.accessToken;
          set({ accessToken: token });
          const me = await api.get("/auth/me");
          set({ user: me.data.user, bootstrapped: true });
        } catch (_e) {
          set({ accessToken: "", user: null, bootstrapped: true });
        }
      },

      login: async ({ email, password }) => {
        const r = await api.post("/auth/login", { email, password });
        set({ accessToken: r.data.accessToken, user: r.data.user });
      },

      register: async ({ name, email, password }) => {
        const r = await api.post("/auth/register", { name, email, password });
        set({ accessToken: r.data.accessToken, user: r.data.user });
      },

      logout: async () => {
        const token = get().accessToken;
        try {
          if (token) await api.post("/auth/logout");
        } finally {
          set({ accessToken: "", user: null });
        }
      },
    }),
    {
      name: "tms_auth",
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
    }
  )
);

