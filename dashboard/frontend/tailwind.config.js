/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#09090B",
        foreground: "#FAFAFA",
        muted: "#27272A",
        "muted-foreground": "#A1A1AA",
        accent: "#DFE104",
        "accent-foreground": "#000000",
        border: "#3F3F46",
        green: "#0ECB81",
        red: "#F6465D",
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      borderRadius: {
        none: "0px",
      },
    },
  },
  plugins: [],
};
