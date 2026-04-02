# Stack Research: FinanceApp (2026)

## Recommended Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Expo (React Native) | Best-in-class multi-platform support. Expo Router provides web-like navigation. |
| **Desktop** | Expo + Electron | Most reliable path for "Desktop" portability while sharing 95% of mobile/web code. |
| **Database** | WatermelonDB / SQLite | Offline-first, high-performance local storage. Essential for finance apps. |
| **AI Runtime (Cloud)** | Gemini / Groq (via OpenRouter) | High performance, excellent free tiers. |
| **AI Runtime (Local)** | llama.rn / ExecuTorch | Offline-first, private inference for basic tasks. |
| **Charts** | Victory Native XL | High-performance, declarative charts using Skia. |
| **Styling** | NativeWind (Tailwind) | Consistent design tokens across platforms. |

## AI & Offline Support
- **Cloud Fallback**: Use Gemini (Free tier) for complex multi-month budgeting or investment analysis.
- **Local Inference**: Use `llama.rn` for quick, private, offline chat about current status (e.g., "What did I spend today?").
- **Why it works**: Small 1B-3B models (like Google's Gemma 2 or Phi-3) can run on modern phones with 4-6GB RAM, handling basic Q&A without internet.

## What NOT to use
- **Standard LocalStorage**: Too slow for complex financial histories.
- **Plaid (Paid tier)**: As a student, we will build a CSV Importer instead to stay at $0 cost.
