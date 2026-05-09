import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: "#163422",
        clay: "#7d562d",
        parchment: "#fdf8f4",
        sand: "#e8ddd4",
        blush: "#f0e6dc",
        sage: "#c8d8c0",
        terracotta: "#c47c5a",
        dusk: "#8b7355",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
