import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm Atelier Palette
        primary: {
          DEFAULT: "#a94e38", // rust
          light: "#c46751",
          dark: "#833b2b", // rust2
        },
        accent: {
          DEFAULT: "#69785d", // sage
        },
        surface: {
          DEFAULT: "#fbf5e9", // lightest background
          cream: "#eee4d1",
          paper: "#f2e8d6",
          dark: "#29231d", // ink
        },
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        serif: ["Cormorant Garamond", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
