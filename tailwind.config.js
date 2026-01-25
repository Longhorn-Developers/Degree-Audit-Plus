/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./entrypoints/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-dap-primary",
    "rounded-t-md",
    "rounded-md",
    "shadow-lg",
    "shadow-black/20",
    "overflow-hidden",
    "font-staatliches",
    "text-white",
    "hover:opacity-70",
    "hover:scale-105",
    "font-roboto-flex",
    // Add any other classes you're using
    {
      pattern:
        /^(text|bg|border|rounded|shadow|font|leading|tracking|gap|p|px|py|m|mx|my|h|w|top|right|left|bottom|z)-/,
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        staatliches: ["Staatliches", "cursive"],
        "roboto-flex": ["Roboto Flex", "sans-serif"],
      },
      colors: {
        dap: {
          orange: "#BF5700",
          teal: "#00A9B7",
          yellow: "#FFD600",
          indigo: "#6366F1",
          pink: "#EC4899",
          border: "#EAE8E1",
        },
      },
    },
  },
  plugins: [],
};
