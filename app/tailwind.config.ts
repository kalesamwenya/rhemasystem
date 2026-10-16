import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Navy Foundation
          navy: {
            light: '#2563EB',
            DEFAULT: '#1E3A8A', // Deep primary anchor
            dark: '#0F172A',    // Structural dark text/sidebars
          },
          // Red Accent (Sophisticated Crimson-Red)
          red: {
            light: '#FEE2E2',   // Light tints for alerts/badges
            DEFAULT: '#DC2626', // Main interaction/destructive action color
            dark: '#991B1B',
          },
          // Yellow Highlight (Rich Amber/Warm Yellow)
          yellow: {
            light: '#FEF9C3',   // Subtle card tinting
            DEFAULT: '#ea9308', // High-contrast alerts, badges, visual anchors
            dark: '#854D0E',
          },
          // Clean supporting background tones
          canvas: '#F8FAFC',
          surface: '#FFFFFF',
          border: '#E2E8F0',
        }
      }
    },
  },
  plugins: [],
};
export default config;