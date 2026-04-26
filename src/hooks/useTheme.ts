import { useEffect, useState } from "react";

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  tabBar: string;
  tabActive: string;
  tabInactive: string;
  sidebarBg: string;
  statusBar: string;
  editorBg: string;
  editorLine: string;
  editorSelectionMatch: string;
  previewBg: string;
  syntaxPurple: string;
  syntaxBlue: string;
  syntaxGreen: string;
  syntaxYellow: string;
  syntaxOrange: string;
  syntaxCyan: string;
  syntaxRed: string;
  syntaxComment: string;
}

export const defaultTheme: ThemeColors = {
  background: "234 19% 13%",
  foreground: "204 42% 86%",
  card: "240 16% 10%",
  cardForeground: "229 35% 75%",
  primary: "220 89% 72%",
  primaryForeground: "234 19% 13%",
  secondary: "234 17% 15%",
  secondaryForeground: "229 35% 75%",
  muted: "234 16% 17%",
  mutedForeground: "229 23% 44%",
  accent: "228 23% 21%",
  accentForeground: "229 35% 75%",
  destructive: "0 67% 58%",
  destructiveForeground: "234 19% 13%",
  border: "240 11% 7%",
  input: "234 17% 15%",
  ring: "220 89% 72%",
  tabBar: "240 16% 10%",
  tabActive: "234 19% 13%",
  tabInactive: "240 16% 10%",
  sidebarBg: "240 16% 10%",
  statusBar: "240 16% 10%",
  editorBg: "234 19% 13%",
  editorLine: "228 23% 21%",
  editorSelectionMatch: "220 89% 72%",
  previewBg: "234 19% 13%",
  syntaxPurple: "261 86% 79%",
  syntaxBlue: "220 89% 72%",
  syntaxGreen: "89 51% 61%",
  syntaxYellow: "35 66% 64%",
  syntaxOrange: "23 100% 70%",
  syntaxCyan: "171 58% 65%",
  syntaxRed: "351 88% 71%",
  syntaxComment: "229 23% 44%",
};

const STORAGE_KEY = "notecoder-theme";

// Color conversion utilities
const hslToHex = (hsl: string) => {
  if (!hsl) return "#000000";
  const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!match) return "#000000";
  
  const [, h, s, l] = match.map(Number);
  const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l / 100 - c / 2;
  
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToHsl = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemeColors>(defaultTheme);

  const applyTheme = (colors: ThemeColors) => {
    const root = document.documentElement;
    
    // Apply all CSS custom properties
    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--foreground", colors.foreground);
    root.style.setProperty("--card", colors.card);
    root.style.setProperty("--card-foreground", colors.cardForeground);
    root.style.setProperty("--popover", colors.card);
    root.style.setProperty("--popover-foreground", colors.cardForeground);
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-foreground", colors.primaryForeground);
    root.style.setProperty("--secondary", colors.secondary);
    root.style.setProperty("--secondary-foreground", colors.secondaryForeground);
    root.style.setProperty("--muted", colors.muted);
    root.style.setProperty("--muted-foreground", colors.mutedForeground);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--accent-foreground", colors.accentForeground);
    root.style.setProperty("--destructive", colors.destructive);
    root.style.setProperty("--destructive-foreground", colors.destructiveForeground);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--input", colors.input);
    root.style.setProperty("--ring", colors.ring);
    root.style.setProperty("--tab-bar", colors.tabBar);
    root.style.setProperty("--tab-active", colors.tabActive);
    root.style.setProperty("--tab-inactive", colors.tabInactive);
    root.style.setProperty("--sidebar-background", colors.sidebarBg);
    root.style.setProperty("--sidebar-foreground", colors.cardForeground);
    root.style.setProperty("--sidebar-primary", colors.primary);
    root.style.setProperty("--sidebar-primary-foreground", colors.primaryForeground);
    root.style.setProperty("--sidebar-accent", colors.accent);
    root.style.setProperty("--sidebar-accent-foreground", colors.accentForeground);
    root.style.setProperty("--sidebar-border", colors.border);
    root.style.setProperty("--sidebar-ring", colors.ring);
    root.style.setProperty("--status-bar", colors.statusBar);
    root.style.setProperty("--editor-bg", colors.editorBg);
    root.style.setProperty("--editor-line", colors.editorLine);
    root.style.setProperty("--editor-selection-match", colors.editorSelectionMatch);
    root.style.setProperty("--preview-bg", colors.previewBg);
    root.style.setProperty("--syntax-purple", colors.syntaxPurple);
    root.style.setProperty("--syntax-blue", colors.syntaxBlue);
    root.style.setProperty("--syntax-green", colors.syntaxGreen);
    root.style.setProperty("--syntax-yellow", colors.syntaxYellow);
    root.style.setProperty("--syntax-orange", colors.syntaxOrange);
    root.style.setProperty("--syntax-cyan", colors.syntaxCyan);
    root.style.setProperty("--syntax-red", colors.syntaxRed);
    root.style.setProperty("--syntax-comment", colors.syntaxComment);
  };

  const setTheme = (colors: ThemeColors) => {
    setThemeState(colors);
    applyTheme(colors);
    
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    } catch (error) {
      console.warn("Falha ao salvar tema no localStorage", error);
    }
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY);
      if (savedTheme) {
        const parsedTheme = { ...defaultTheme, ...JSON.parse(savedTheme) };
        setThemeState(parsedTheme);
        applyTheme(parsedTheme);
      } else {
        // Apply default theme if no saved theme
        applyTheme(defaultTheme);
      }
    } catch (error) {
      console.warn("Falha ao carregar tema do localStorage:", error);
      applyTheme(defaultTheme);
    }
  }, []);

  return {
    theme,
    setTheme,
    resetTheme,
    hslToHex,
    hexToHsl,
  };
};
