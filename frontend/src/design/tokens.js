const tokens = {
  colors: {
    void: "#050810",
    surface: "#0D1425",
    border: "#1A2744",
    amber: "#F5A623",
    cyan: "#00D4FF",
    optimist: "#39FF6A",
    realist: "#C8D6E5",
    pessimist: "#FF3B3B",
    agent: "#B44FFF",
    textPrimary: "#F0F4FF",
    textMuted: "#6B7A99",
  },
  fonts: {
    display: ["Orbitron", "sans-serif"],
    mono: ["IBM Plex Mono", "monospace"],
    ui: ["DM Sans", "sans-serif"],
  },
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
  },
  animations: {
    pageTransition: "300ms ease-in-out",
    agentPulse: "1.5s ease-in-out infinite",
    connectionFlow: "1.2s linear infinite",
    timelineReveal: "400ms ease-out",
    probabilityMeter: "800ms ease-out",
    buttonHover: "150ms ease-out",
    errorFlash: "400ms ease-out",
  },
};

export default tokens;
