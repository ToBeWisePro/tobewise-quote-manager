import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF", // Main background color
        foreground: "#111827", // Main foreground color
        primary: "#2563EB", // Primary blue
        secondary: "#1E40AF", // Darker blue
        accent: "#10B981", // Green for accents
        neutral: {
          light: "#F3F4F6", // Light gray for backgrounds
          dark: "#374151", // Dark gray for text
        },
        error: "#EF4444", // Red for errors
      },
    },
  },
  plugins: [],
} satisfies Config;
