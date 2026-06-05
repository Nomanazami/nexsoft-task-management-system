import { create } from "zustand";
import { persist } from "zustand/middleware";

function detectDefaultTheme() {
  if (typeof window === "undefined") return "light";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

export const uiStore = create()(
  persist(
    (set, get) => ({
      theme: detectDefaultTheme(),
      sidebarOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    { name: "tms_ui" }
  )
);

