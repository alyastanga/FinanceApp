# FinanceApp 🚀

A high-fidelity, AI-driven personal finance "Mission Control" dashboard. Built with a privacy-first philosophy, featuring professional-grade visualizations and on-device LLM intelligence.

## ✨ Core Intelligence

- **Mission Control 2.0**: Real-time spending habits and budget allocation visualizations using **React Native Skia**.
- **Privacy-First AI**: Toggle between **Cloud AI** (OpenRouter) and **Native AI** (On-device TinyLlama) for 100% offline financial analysis.
- **Multi-Currency Engine**: Automated IP-based currency detection and live exchange rates via the Frankfurter & Finnhub APIs.
- **Wealth Hub**: Track assets, savings goals, and categorical spending with instant, local-first synchronization via **WatermelonDB**.
- **Portfolio Management**: Manage cash, crypto, stocks, and real estate with smart "one-look" performance metrics.

---

## 🛠 Tech Stack

- **Framework**: Expo (React Native) + Expo Router
- **Graphics Engine**: @shopify/react-native-skia (High-fps visualizations)
- **Data Engine**: WatermelonDB (SQLite/IndexedDB Local Persistence)
- **AI Runtime**: llama.rn (On-device GGUF inference)
- **Styling**: NativeWind (Tailwind CSS) + Glassmorphism UI
- **Market Data**: Frankfurter (Currency) & Finnhub (Stocks/Crypto)

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/alyastanga/FinanceApp.git
cd FinanceApp
npm install
```

### 2. Configure Environment
Create a `.env` file in the root with your credentials:
```bash
EXPO_PUBLIC_OPENROUTER_API_KEY=your_key
EXPO_PUBLIC_FINNHUB_API_KEY=your_key
```

### 3. Launch
```bash
# Start Metro Bundler
npx expo start

# Note: For Native AI (llama.rn) support, you must build a development client:
npx expo run:ios
# or
npx expo run:android
```

---

## 🎨 Design Language

- **Theme**: Charcoal Midnight (`#050505`) with Emerald accents (`#10b981`).
- **Aesthetic**: Minimalist "Mission Control" using `BlurView` and deep glassmorphic textures.
- **Typography**: Inter / Outfit for high-legibility financial data and premium feel.

---
MIT License | 2026 FinanceApp Team
