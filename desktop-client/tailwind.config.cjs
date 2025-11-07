/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1D4ED8",
          dark: "#1E3A8A",
          light: "#60A5FA"
        }
      }
    }
  },
  plugins: []
};
