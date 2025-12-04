// tailwind.config.cjs או tailwind.config.js
module.exports = {
  darkMode: "class",              // 👈 חשוב!
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
