import React, { createContext, useState, useContext, useEffect } from "react";

const ThemeContext = createContext(null);

const THEMES = {
  indigo: {
    name: "Indigo",
    primaryColor: "#6366f1",
    primaryLight: "#818cf8",
    primaryDark: "#4f46e5",
    secondaryColor: "#8b5cf6",
    accentColor: "#06b6d4",
    sidebarColor: "#1e1b4b",
    sidebarHover: "#312e81",
  },
  ocean: {
    name: "Ocean Blue",
    primaryColor: "#0ea5e9",
    primaryLight: "#38bdf8",
    primaryDark: "#0284c7",
    secondaryColor: "#6366f1",
    accentColor: "#14b8a6",
    sidebarColor: "#0c4a6e",
    sidebarHover: "#075985",
  },
  forest: {
    name: "Forest Green",
    primaryColor: "#10b981",
    primaryLight: "#34d399",
    primaryDark: "#059669",
    secondaryColor: "#06b6d4",
    accentColor: "#f59e0b",
    sidebarColor: "#064e3b",
    sidebarHover: "#065f46",
  },
  sunset: {
    name: "Sunset Orange",
    primaryColor: "#f97316",
    primaryLight: "#fb923c",
    primaryDark: "#ea580c",
    secondaryColor: "#ef4444",
    accentColor: "#eab308",
    sidebarColor: "#7c2d12",
    sidebarHover: "#9a3412",
  },
  royal: {
    name: "Royal Purple",
    primaryColor: "#8b5cf6",
    primaryLight: "#a78bfa",
    primaryDark: "#7c3aed",
    secondaryColor: "#ec4899",
    accentColor: "#06b6d4",
    sidebarColor: "#2e1065",
    sidebarHover: "#3b0764",
  },
  midnight: {
    name: "Midnight",
    primaryColor: "#6366f1",
    primaryLight: "#818cf8",
    primaryDark: "#4f46e5",
    secondaryColor: "#8b5cf6",
    accentColor: "#06b6d4",
    sidebarColor: "#020617",
    sidebarHover: "#0f172a",
    isDark: true,
  },
  rose: {
    name: "Rose",
    primaryColor: "#f43f5e",
    primaryLight: "#fb7185",
    primaryDark: "#e11d48",
    secondaryColor: "#ec4899",
    accentColor: "#8b5cf6",
    sidebarColor: "#4c0519",
    sidebarHover: "#881337",
  },
  teal: {
    name: "Teal",
    primaryColor: "#14b8a6",
    primaryLight: "#2dd4bf",
    primaryDark: "#0d9488",
    secondaryColor: "#06b6d4",
    accentColor: "#6366f1",
    sidebarColor: "#042f2e",
    sidebarHover: "#134e4a",
  },
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState("indigo");
  const [isDark, setIsDark] = useState(false);
  const [customColors, setCustomColors] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("wabyone_theme");
    const savedDark = localStorage.getItem("wabyone_dark");
    if (saved) setCurrentTheme(saved);
    if (savedDark === "true") setIsDark(true);
  }, []);

  useEffect(() => {
    applyTheme();
  }, [currentTheme, isDark, customColors]);

  const applyTheme = () => {
    const theme = customColors || THEMES[currentTheme] || THEMES.indigo;
    const root = document.documentElement;

    root.style.setProperty("--primary", theme.primaryColor);
    root.style.setProperty("--primary-light", theme.primaryLight);
    root.style.setProperty("--primary-dark", theme.primaryDark);
    root.style.setProperty("--secondary", theme.secondaryColor);
    root.style.setProperty("--accent", theme.accentColor);
    root.style.setProperty("--sidebar-bg", theme.sidebarColor);
    root.style.setProperty("--sidebar-hover", theme.sidebarHover);

    if (isDark || theme.isDark) {
      document.body.setAttribute("data-theme", "dark");
    } else {
      document.body.removeAttribute("data-theme");
    }
  };

  const setTheme = (themeName) => {
    setCurrentTheme(themeName);
    setCustomColors(null);
    localStorage.setItem("wabyone_theme", themeName);
  };

  const toggleDark = () => {
    setIsDark(!isDark);
    localStorage.setItem("wabyone_dark", !isDark);
  };

  const setCustomTheme = (colors) => {
    setCustomColors(colors);
  };

  const loadThemeFromOrg = (themeConfig) => {
    if (!themeConfig) return;

    if (themeConfig.theme && THEMES[themeConfig.theme]) {
      // Named theme preset (e.g. "indigo", "forest")
      setCurrentTheme(themeConfig.theme);
      setCustomColors(null);
    } else if (themeConfig.primaryColor) {
      // Industry-preset custom colors (e.g. from healthcare, retail, etc.)
      const base = THEMES.indigo;
      setCurrentTheme("indigo");
      setCustomColors({
        primaryColor: themeConfig.primaryColor,
        primaryLight: themeConfig.primaryLight || themeConfig.primaryColor,
        primaryDark: themeConfig.primaryDark || themeConfig.primaryColor,
        secondaryColor: themeConfig.secondaryColor || base.secondaryColor,
        accentColor: themeConfig.accentColor || base.accentColor,
        sidebarColor: themeConfig.sidebarColor || base.sidebarColor,
        sidebarHover: themeConfig.sidebarHover || themeConfig.sidebarColor || base.sidebarHover,
      });
    }

    if (themeConfig.isDark !== undefined) {
      setIsDark(themeConfig.isDark);
      localStorage.setItem("wabyone_dark", themeConfig.isDark);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        isDark,
        themes: THEMES,
        setTheme,
        toggleDark,
        setCustomTheme,
        customColors,
        loadThemeFromOrg,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
