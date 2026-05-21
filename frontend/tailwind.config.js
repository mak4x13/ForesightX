import tokens from "./src/design/tokens.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: tokens.fonts,
      spacing: tokens.spacing,
      animation: {
        "agent-pulse": "agentPulse 1.5s ease-in-out infinite",
        "connection-flow": "connectionFlow 1.2s linear infinite",
        "timeline-reveal": "timelineReveal 400ms ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
        shake: "shake 400ms ease-out",
      },
      keyframes: {
        agentPulse: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.05)", opacity: "1" },
        },
        connectionFlow: {
          from: { strokeDashoffset: "24" },
          to: { strokeDashoffset: "0" },
        },
        timelineReveal: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
      },
      transitionDuration: {
        page: "300ms",
        hover: "150ms",
        reveal: "400ms",
      },
    },
  },
  plugins: [],
};
