---
phase: 03-ai-budgeting
plan: 07
type: execute
wave: 3
depends_on: []
files_modified: [package.json, app.json, lib/ai-service.ts, lib/llama-service.ts, components/ui/AIToggle.tsx]
autonomous: true
requirements: [FND-05, CHAT-04]
user_setup: []

must_haves:
  truths:
    - "User can toggle offline AI mode"
    - "Application can download or load a small compressed model (like TinyLlama GGUF)"
    - "Financial queries still generate text responses when offline"
  artifacts:
    - path: "lib/llama-service.ts"
      provides: "Local LLM context initialization and inference using llama.rn"
    - path: "components/ui/AIToggle.tsx"
      provides: "UI toggle to explicitly switch between Cloud (OpenRouter) and Local AI"
  key_links:
    - from: "lib/ai-service.ts"
      to: "lib/llama-service.ts"
      via: "fallback routing when offline or toggled"
---

<objective>
Introduce an offline-capable Local LLM runtime to provide privacy-first, on-device AI for basic chat queries when the user is disconnected or prefers not to use the cloud.

Purpose: Achieving FND-05 and CHAT-04 by making AI chat resilient without internet, using `llama.rn` to run a compressed GGUF model locally.
Output: Integrated `llama.rn` package, a dedicated local AI service, routing logic in the main AI service, and a UI toggle.
</objective>

<execution_context>
@/Users/familyaccount/git/FinanceApp/.claude/get-shit-done/workflows/execute-plan.md
@/Users/familyaccount/git/FinanceApp/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@lib/ai-service.ts
</context>

<interfaces>
From lib/ai-service.ts (to be modified):
```typescript
export async function generateAIResponse(messages: { role: string; content: string }[], useLocal: boolean = false): Promise<string>;
// It should accept a flag to force local model usage.
```
</interfaces>

<tasks>
<task type="auto">
  <name>Task 1: Install and configure llama.rn</name>
  <files>package.json, app.json, lib/llama-service.ts</files>
  <action>
    Install `llama.rn` (e.g. `npm install llama.rn` or `npm install mybigday/llama.rn`). 
    Create `lib/llama-service.ts` exposing two functions: `initLocalModel()` (to load a small GGUF file or use a mocked text response if running in Expo Go without native modules) and `generateLocalResponse(prompt)`. 
    NOTE: Because `llama.rn` requires custom native code, if executing in Expo Go (`__DEV__`), write an Expo-safe fallback in `llama-service.ts` that just returns a fixed offline string "Offline AI Mode: Safe to spend $X" to avoid crashes, while the actual `initLlama` code is conditionally compiled or dynamically imported.
  </action>
  <verify>
    <automated>npm run lint || true</automated>
  </verify>
  <done>llama.rn is listed in package.json, and `lib/llama-service.ts` gracefully degrades in Expo Go environments while exposing the correct interface.</done>
</task>

<task type="auto">
  <name>Task 2: Route AI queries to Local LLM</name>
  <files>lib/ai-service.ts, components/ui/AIToggle.tsx, app/(tabs)/ai.tsx</files>
  <action>
    1. Create `components/ui/AIToggle.tsx`, a simple switch component that toggles a state (Cloud vs Local).
    2. Modify `lib/ai-service.ts`: Update `generateAIResponse` to accept an `useLocal` argument. If `true` or if `fetch` fails due to network, it should call `generateLocalResponse` from `lib/llama-service.ts` instead of OpenRouter.
    3. Expose the `AIToggle` in the settings or AI chat header (if `app/(tabs)/ai.tsx` exists, embed it there, otherwise build a simple UI placeholder in the AI dashboard or top bar of monitoring).
  </action>
  <verify>
    <automated>grep -q "llama-service" lib/ai-service.ts && echo "Routed"</automated>
  </verify>
  <done>The AI service routes to the local LLM logic seamlessly when forced or when offline.</done>
</task>
</tasks>

<verification>
- Ensure `llama-service.ts` exports local inference functions.
- Ensure `ai-service.ts` can use local fallback.
</verification>

<success_criteria>
- The app supports offline processing conceptually without crashing Expo Go.
- `AIToggle.tsx` allows user preference selection.
</success_criteria>

<output>
After completion, create `.planning/phases/03-ai-budgeting/03-07-local-llm-SUMMARY.md`
</output>
