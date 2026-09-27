import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bay: { DEFAULT: "#12263A", 700: "#0C1A29" },
        jeep: "#F2B705",
        teal: "#1F7A6D",
        mist: "#F1F4F6",
        coral: "#C8443A",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        body: ["Figtree", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
