/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF7FB",
        paper: "#FFFFFF",
        ink: "#221E2E",
        muted: "#7C7689",
        line: "#ECE7F1",
        // Hoofd-, secundaire en tertiaire kleur zijn afgeleid van het app-logo:
        // het robijnrood, het blauw van de steen en het goud van de ringband.
        rose:   { DEFAULT: "#E6375C", soft: "#FAE6EA", ink: "#9A132F" }, // hoofdkleur: robijnrood
        indigo: { DEFAULT: "#1F85FF", soft: "#E3EFFD", ink: "#004FAD" }, // secundair: blauw van de steen
        amber:  { DEFAULT: "#FF9E1F", soft: "#FDF1E3", ink: "#AD6200" }, // tertiair: goud van de ring
        teal:   { DEFAULT: "#17B0A7", soft: "#D3F1EE", ink: "#0B6C66" },
        lilac:  { DEFAULT: "#A855F7", soft: "#F1E4FE", ink: "#7A28C4" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: {
        soft: "0 1px 2px rgba(34,30,46,.04), 0 8px 24px rgba(34,30,46,.06)",
        lift: "0 2px 6px rgba(34,30,46,.06), 0 16px 40px rgba(34,30,46,.10)",
      },
    },
  },
  plugins: [],
};
