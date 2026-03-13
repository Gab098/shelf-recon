import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx,js,jsx}"],
  darkMode: ["class"],
  corePlugins: {
    // Avoid fighting Polaris resets.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        neon: {
          green: "#00FF88",
          purple: "#8B5CF6",
          orange: "#FF6B35",
        },
        cyber: {
          bg0: "#0F0F1A",
          bg1: "#1A1A2E",
        },
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(0,255,136,0.35), 0 0 24px rgba(0,255,136,0.20)",
        neonStrong: "0 0 0 1px rgba(0,255,136,0.55), 0 0 42px rgba(0,255,136,0.30)",
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "ui-sans-serif", "system-ui"],
        mono: ["\"JetBrains Mono\"", "ui-monospace", "SFMono-Regular"],
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { opacity: "0.70", filter: "drop-shadow(0 0 10px rgba(0,255,136,.55))" },
          "50%": { opacity: "1", filter: "drop-shadow(0 0 20px rgba(0,255,136,.85))" },
        },
      },
      animation: {
        glowPulse: "glowPulse 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

