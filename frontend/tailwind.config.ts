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
        // Brand palette — feel free to update
        primary: {
          DEFAULT: "#6C3FC5", // deep violet
          light: "#9B6DFF",
          dark: "#4A2A8A",
        },
        accent: {
          DEFAULT: "#F5A623", // warm amber
        },
        surface: {
          DEFAULT: "#F9F7FF",
          dark: "#1A1025",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
