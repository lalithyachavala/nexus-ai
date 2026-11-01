import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Canvas + ink
        canvas: "#F6F7FB",
        surface: "#FFFFFF",
        "surface-2": "#FBFBFE",
        ink: "#0C1020",
        "ink-soft": "#3A4256",
        muted: "#6B7385",
        line: "#E6E8F0",
        "line-soft": "#EEF0F6",
        // Dark rail (sidebar)
        rail: "#0C1020",
        "rail-2": "#141A2E",
        "rail-line": "#232B44",
        "rail-text": "#98A2BC",
        // Brand — "Nexus violet"
        brand: {
          DEFAULT: "#6D5EF6",
          hover: "#5B4EE6",
          soft: "#EFEDFE",
          ink: "#2A1F7A",
        },
        // Semantics
        success: "#10A37F",
        "success-soft": "#E6F6F1",
        warn: "#D9930B",
        "warn-soft": "#FBF2DE",
        danger: "#E5484D",
        "danger-soft": "#FCE9EA",
        info: "#3B6FF6",
        "info-soft": "#E8EEFE",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Space Grotesk",
          "Inter",
          "Segoe UI",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(12,16,32,0.04), 0 1px 3px rgba(12,16,32,0.06)",
        "card-hover": "0 4px 12px rgba(12,16,32,0.08), 0 2px 4px rgba(12,16,32,0.05)",
        pop: "0 12px 40px rgba(12,16,32,0.16)",
        rail: "inset -1px 0 0 #232B44",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        shimmer: "shimmer 1.6s infinite",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
