"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "light", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // On mount, read saved preference; default to light regardless of OS setting
  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const resolved: Theme = saved ?? "light";
    setTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  }, []);

  function toggle() {
    setTheme((current) => {
      const next: Theme = current === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
