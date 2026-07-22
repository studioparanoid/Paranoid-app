"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DARK_THEME_COLOR, LIGHT_THEME_COLOR, THEME_STORAGE_KEY } from "@/components/theme/constants";

export type PreferredTheme = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

type ThemeContextValue = {
  preferredTheme: PreferredTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: PreferredTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreferredTheme(value: string | null): value is PreferredTheme {
  return value === "system" || value === "dark" || value === "light";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getStoredTheme(): PreferredTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreferredTheme(value) ? value : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(preferredTheme: PreferredTheme, resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;
  const changed = root.dataset.theme !== resolvedTheme;
  if (changed) root.classList.add("theme-transitioning");
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preferredTheme;
  root.style.colorScheme = resolvedTheme;
  const themeColor = resolvedTheme === "light" ? LIGHT_THEME_COLOR : DARK_THEME_COLOR;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  if (changed) window.setTimeout(() => root.classList.remove("theme-transitioning"), 320);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferredTheme, setPreferredTheme] = useState<PreferredTheme>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const [announcement, setAnnouncement] = useState("");
  const resolvedTheme = preferredTheme === "system" ? systemTheme : preferredTheme;

  useEffect(() => {
    applyTheme(preferredTheme, resolvedTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preferredTheme);
    } catch {
      // Preference persistence is best-effort when storage is unavailable.
    }
  }, [preferredTheme, resolvedTheme]);

  useEffect(() => {
    if (preferredTheme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    function handleChange() {
      setSystemTheme(media.matches ? "light" : "dark");
    }
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preferredTheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    preferredTheme,
    resolvedTheme,
    setTheme: (theme) => {
      setPreferredTheme(theme);
      const label = theme === "system" ? "automático" : theme === "dark" ? "escuro" : "claro";
      setAnnouncement(`Tema ${label} ativado.`);
    },
  }), [preferredTheme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
