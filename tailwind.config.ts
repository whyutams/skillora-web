import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pine: {
          50: "#f0f7f4",
          100: "#dbeef5",
          200: "#b9dfd3",
          300: "#86c8b3",
          400: "#50a98f",
          500: "#328c73",
          600: "#24705c",
          700: "#1d5849",
          800: "#17463a",
          900: "#133a31",
          950: "#0F3E2E", // Deep Pine
        },
        sage: {
          50: "#f4fbf7",
          100: "#e5f7ed",
          200: "#ceefdd",
          300: "#a6e2c3",
          400: "#73cda2",
          500: "#49b383",
          600: "#34D399", // Mint Halus
          700: "#277a5b",
          800: "#22614a",
          900: "#1e503f",
          accent: "#86EFAC", // Muted Sage
        },
        surface: {
          light: "#FAF9F6", // Neutral warm off-white
          dark: "#0C0A09",  // Stone-950 dark
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
