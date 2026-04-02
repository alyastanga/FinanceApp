/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#050505', // Deep Midnight
        foreground: '#F5F5F5',
        primary: {
          DEFAULT: '#10b981', // Emerald 500
          foreground: '#050505',
        },
        card: {
          DEFAULT: '#111111', // Surfaced charcoal
          foreground: '#F5F5F5',
        },
        muted: {
          DEFAULT: '#1a1a1a',
          foreground: '#94a3b8',
        },
        accent: {
          DEFAULT: '#3b82f6',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#f43f5e', // Rose 500
          foreground: '#ffffff',
        },
        border: '#2a2a2a',
        input: '#1a1a1a',
        ring: '#10b981',
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      }
    },
  },
  plugins: [],
};
