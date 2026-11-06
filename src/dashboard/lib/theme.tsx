import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);
const systemTheme = (): Theme => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
function savedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem("annu.theme");
    return saved === "light" || saved === "dark" ? saved : null;
  } catch { return null; }
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => savedTheme() ?? systemTheme());
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content", getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
    );
  }, [theme]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => { if (!savedTheme()) setTheme(systemTheme()); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "annu.theme" || event.key === null) setTheme(savedTheme() ?? systemTheme());
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("annu.theme", next); } catch { /* Still works for this session. */ }
    setTheme(next);
  }
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("Theme controls require ThemeProvider");
  return value;
}
