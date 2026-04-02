# FinanceApp 🚀

A premium, AI-driven personal finance application with high-performance visualizations, built for the modern mission-control experience.

## ✨ Features

- **Mission Control Dashboard**: Real-time spending breakdown and categorical mix using **React Native Skia**.
- **Goal Management**: Reactive local-first tracking for your savings targets, from emergency funds to Japan trips.
- **AI-Powered Insights**: Integrated AI service for financial analysis and categorization.
- **Gold-Standard Initialization**: Robust "Absolute Isolation" bootstrap for Skia-Web, ensuring zero-crash graphics on all platforms.
- **Local-First Speed**: Powered by **WatermelonDB** for instant updates and offline capability.
- **Premium Aesthetics**: Glassmorphic UI with vibrant Emerald and Charcoal themes.

---

## 🛠 Tech Stack

- **Core**: Expo (React Native), Expo Router
- **Graphics**: @shopify/react-native-skia
- **Database**: WatermelonDB (SQLite/IndexedDB)
- **Styling**: NativeWind (Tailwind CSS)
- **Runtime**: CanvasKit WASM (v0.40.0)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file with your credentials:
```bash
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
OPENAI_API_KEY=your_key
```

### 3. Start Development
```bash
npx expo start
```
- Press `w` for Web
- Press `i` for iOS
- Press `a` for Android

---

## 🏗 Key Components

### Skia Graphics
The application uses a custom-tuned Skia engine. For web users, we implement a **Direct CDN Bootstrap** in `index.web.js` to bypass initialization race conditions and ensure 100% WebGL context reliability.

### Goal Tracking
Managed in the **Goals Tab**, providing real-time synchronization between your manual entries and the global monitoring dashboard using WatermelonDB Observables.

---

## 🎨 Design Language
- **Typography**: Inter / Outfit
- **Color Palette**: Dark Mode Midnight (`#050505`) with Emerald accents (`#10b981`).
- **Aesthetic**: Minimalist "Mission Control" using `BlurView` and glassmorphic surface depth.

---

## 📜 License
MIT
