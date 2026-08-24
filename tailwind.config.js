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
        rose:   { DEFAULT: "#F2547B", soft: "#FDE7EC", ink: "#C42A54" },
        amber:  { DEFAULT: "#F5A524", soft: "#FDECC9", ink: "#96610A" },
        teal:   { DEFAULT: "#17B0A7", soft: "#D3F1EE", ink: "#0B6C66" },
        indigo: { DEFAULT: "#6366F1", soft: "#E5E5FD", ink: "#3D3FBF" },
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
