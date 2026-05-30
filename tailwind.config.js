/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy:  "#0d1b2a",
        navy2: "#1a2e44",
        navy3: "#243b55",
        gold:  "#c9a84c",
        gold2: "#e8c96a",
        "gold-muted": "#a8863e",
        "gold-bg": "#fdf6e3",
        "gold-border": "#e8d5a3",
        cream: "#faf8f4",
        ink:   "#0d1b2a",
        ink2:  "#3d5166",
        ink3:  "#7a9ab8",
        border:  "#e2e8ef",
        border2: "#c8d4df",
        success: "#2d6a4f",
        "success-bg":     "#e8f4ee",
        "success-border": "#b7ddc8",
        forest:  "#2d6a4f",
        forest2: "#2d6a4f",
        forest3: "#e8f4ee",
        forest4: "#b7ddc8",
        bg:      "#faf8f4",
        border3: "#e2e8ef",
      },
      fontFamily: {
        "dm-serif": ["'DM Serif Display'", "Georgia", "serif"],
        "dm-sans":  ["'DM Sans'", "system-ui", "sans-serif"],
        playfair:   ["'DM Serif Display'", "Georgia", "serif"],
        outfit:     ["'DM Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 16px rgba(13,27,42,.10), 0 2px 6px rgba(13,27,42,.06)",
        xl2:  "0 20px 60px rgba(13,27,42,.18)",
      },
      animation: {
        blink:     "blink 1.4s ease-in-out infinite",
        fadeUp:    "fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) both",
        shimmer:   "shimmer 2.4s linear infinite",
        pulseDot:  "pulse-dot 1.6s ease-in-out infinite",
        float:     "float 3s ease-in-out infinite",
        scaleIn:   "scaleIn 0.4s cubic-bezier(.22,.68,0,1.2) both",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.25" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "pulse-dot": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%":       { transform: "scale(1.6)", opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-6px)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.92)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
