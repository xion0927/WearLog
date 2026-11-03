import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#26352f",
        muted: "#77827c",
        sage: "#eaf1ec",
        forest: "#315b48",
      },
    },
  },
  plugins: [],
};

export default config;
