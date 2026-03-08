/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        border: "var(--border)",
        lime: "var(--lime)",
        blue: "var(--blue)",
        destructive: "var(--destructive)",
        high: "var(--high)",
        teal: "var(--teal)",
        coral: "var(--coral)",
        // Keep old names as aliases so nothing breaks
        midnight: "var(--background)",
        navy: "var(--card)",
        slate: {
          850: "#162032",
        },
        accent: {
          blue: "var(--blue)",
          cyan: "#22d3ee",
          green: "#10b981",
          amber: "var(--high)",
          red: "var(--destructive)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Special Elite", "Courier New", "monospace"],
        mono: ["monospace"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
};
