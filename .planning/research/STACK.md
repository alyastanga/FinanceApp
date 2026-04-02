# Stack Research: FinanceApp (2026)

## Recommended Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Expo (React Native) | Best-in-class multi-platform support. Expo Router provides web-like navigation. |
| **Desktop** | Expo + Electron | Most reliable path for "Desktop" portability while sharing 95% of mobile/web code. |
| **Database** | WatermelonDB / SQLite | Offline-first, high-performance local storage. Essential for finance apps. |
| **AI Runtime** | OpenRouter (LLM) | Access to multiple models (DeepSeek, Llama 3, GPT-4o-mini) at lower costs than direct OpenAI. |
| **Charts** | Victory Native XL | High-performance, declarative charts using Skia (GPU accelerated). |
| **Styling** | NativeWind (Tailwind) | Consistent design tokens across platforms. |

## Why this works
- **Expo Router**: Handles deep linking and routing for web and mobile seamlessly.
- **SQLite**: Local-first approach ensures user data stays on their device (privacy-centric).
- **Skia**: Ensures pie charts and animations are 60fps even on low-end mobile devices.

## What NOT to use
- **Standard LocalStorage**: Too slow for complex financial histories.
- **Plaid (Paid tier)**: As a student, we will build a CSV Importer instead to stay at $0 cost.
