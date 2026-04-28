/**
 * Local LLM Service — Provides on-device AI inference via llama.rn.
 *
 * Architecture:
 * - In a full native build (EAS/dev client), llama.rn's `initLlama` loads a
 *   GGUF model file into memory and runs inference entirely on-device.
 * - In Expo Go (which lacks custom native modules), we provide a rule-based
 *   financial analysis engine that generates useful offline responses from
 *   the user's real data — no network required.
 *
 * Requirements addressed: FND-05 (local LLM runtime), CHAT-04 (offline AI).
 *
 * OPTIMIZATIONS (v2):
 * - Raised repeat_penalty 1.1 → 1.4 to prevent repetition loops
 * - Added repeat_last_n: 128 to widen the penalty window
 * - Added top_k: 40 to constrain token sampling pool
 * - Lowered temperature 0.5 → 0.3 for more deterministic output
 * - Split n_predict by query type (financial: 200, greeting: 60)
 * - Added stripRepetitionLoops() post-processor
 * - Added hard character cap per response type
 * - Tightened non-financial system prompt with few-shot examples
 * - Added '\n\n\n' as stop sequence to catch runaway formatting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import database from '../database';
import { getFinancialContext } from './budget-engine';

const MODEL_NAME = 'DeepSeek-R1-Distill-Qwen-0.5B-CoMa.Q4_K_M.gguf';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AIMode = 'cloud' | 'local';

interface LocalModelState {
  initialized: boolean;
  mode: 'native' | 'fallback';
  context: any | null;
}

// ─── State ──────────────────────────────────────────────────────────────────

let modelState: LocalModelState = {
  initialized: false,
  mode: 'fallback',
  context: null,
};

// ─── Native Model Initialization ────────────────────────────────────────────

/**
 * Attempts to load a GGUF model via llama.rn's native bridge.
 * Falls back gracefully in Expo Go where native modules aren't available.
 *
 * @param modelPath - File URI to the GGUF model (e.g. from app assets or downloads)
 * @param force - If true, re-initializes even if already in fallback mode (useful after download)
 */
export async function initLocalModel(modelPath?: string, force: boolean = false): Promise<boolean> {
  // Already initialized in native mode
  if (!force && modelState.initialized && modelState.mode === 'native') return true;

  try {
    console.log('[Local LLM] Attempting native initialization...');
    // Dynamically import llama.rn — this will throw in Expo Go or if no native module
    const { initLlama } = await import('llama.rn');

    // Determine path — default to documentDirectory/model if none provided
    const resolvedPath = modelPath || `${FileSystem.documentDirectory}${MODEL_NAME}`;

    const info = await FileSystem.getInfoAsync(resolvedPath);
    if (!info.exists) {
      console.warn('[Local LLM] Model file NOT found at:', resolvedPath);
      modelState = { initialized: true, mode: 'fallback', context: null };
      return true;
    }

    console.log('[Local LLM] Model file found. Size:', info.size);

    // Clean path for native llama.rn (handles file:// prefix issues on some RN versions)
    const nativePath = resolvedPath.startsWith('file://')
      ? resolvedPath.replace('file://', '')
      : resolvedPath;

    console.log('[Local LLM] Calling initLlama with path:', nativePath);

    // Release existing context if we're forcing a reload
    if (modelState.context) {
      try {
        await modelState.context.release();
      } catch (e) {
        console.warn('[Local LLM] Failed to release old context:', e);
      }
    }

    const context = await initLlama({
      model: nativePath,
      n_ctx: 4096,
      n_threads: 4,
      n_gpu_layers: 0,
      use_mlock: false,
    });

    modelState = { initialized: true, mode: 'native', context };
    console.log('[Local LLM] Native engine initialized successfully.');
    return true;
  } catch (error: any) {
    console.error('[Local LLM] Native init failed:', error.message || error);
    modelState = { initialized: true, mode: 'fallback', context: null };
    return true;
  }
}

// ─── Post-Processing Utilities ───────────────────────────────────────────────

/**
 * Detects and removes repetition loops in model output.
 * Small quantized models (0.5B) frequently get stuck repeating the same
 * sentence. This strips duplicates and halts at the first repeated phrase.
 */
function stripRepetitionLoops(text: string): string {
  // Split on sentence-ending punctuation
  const sentences = text.split(/(?<=[.!?])\s+/);
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const normalized = sentences[i].trim().toLowerCase();
    if (!normalized) continue;

    if (seen.has(normalized)) {
      // We've hit a repeated sentence — the model is looping. Stop here.
      console.warn('[Local LLM] Repetition loop detected at sentence:', i);
      break;
    }

    seen.add(normalized);
    deduped.push(sentences[i].trim());
  }

  return deduped.join(' ').trim();
}

/**
 * Detects repeated n-gram phrases (e.g. repeated clause fragments)
 * as a secondary pass after sentence dedup.
 */
function stripRepeatedPhrases(text: string, ngram: number = 6): string {
  const words = text.split(/\s+/);
  if (words.length < ngram * 2) return text;

  const seen = new Set<string>();
  const result: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const chunk = words.slice(i, i + ngram).join(' ').toLowerCase();
    if (seen.has(chunk)) {
      // Cut output here — repeated phrase window found
      console.warn('[Local LLM] Repeated phrase window at word index:', i);
      break;
    }
    seen.add(chunk);
    result.push(words[i]);
  }

  return result.join(' ').trim();
}

/**
 * Applies a hard character cap and all post-processing passes.
 */
function sanitizeResponse(text: string, isFinancial: boolean): string {
  const MAX_CHARS = isFinancial ? 800 : 120;

  let cleaned = text
    // Strip DeepSeek-R1 reasoning tags
    .replace(/<(thought|think)>[\s\S]*?<\/\1>/gi, '')
    // Strip unclosed reasoning tags (streaming artifact)
    .replace(/<(thought|think)>[\s\S]*/gi, '')
    .trim();

  // Pass 1: sentence-level dedup
  cleaned = stripRepetitionLoops(cleaned);

  // Pass 2: n-gram phrase dedup
  cleaned = stripRepeatedPhrases(cleaned);

  // Pass 3: hard character cap — 0.5B can't self-regulate length
  if (cleaned.length > MAX_CHARS) {
    // Truncate at a sentence boundary if possible
    const truncated = cleaned.substring(0, MAX_CHARS);
    const lastPeriod = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    cleaned = lastPeriod > MAX_CHARS * 0.6
      ? truncated.substring(0, lastPeriod + 1)
      : truncated.trimEnd() + '…';
  }

  return cleaned;
}

// ─── Local Response Generation ──────────────────────────────────────────────

/**
 * Generates a response using the local model (native or fallback).
 * The fallback engine uses the user's real financial data to produce
 * meaningful offline analysis.
 */
export async function generateLocalResponse(
  messages: { role: string; content: string }[],
  agentId?: string,
  onToken?: (token: string) => void
): Promise<string> {
  // Ensure model is initialized
  if (!modelState.initialized) {
    console.log('[Local LLM] Model not initialized, triggering init...');
    await initLocalModel();
  }

  console.log('[Local LLM] Mode:', modelState.mode, 'Has Context:', !!modelState.context);

  // ── Native path: use llama.rn context ──
  if (modelState.mode === 'native' && modelState.context) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userQuery = messages[messages.length - 1]?.content.toLowerCase() || '';
      const financialKeywords = [
        'spend', 'budget', 'money', 'goal', 'income', 'expense', 'chart', 'graph',
        'analysis', 'save', 'portfolio', 'asset', 'how much', 'what is', 'summary',
        'report', 'transaction', 'balance', 'wealth', 'debt', 'loan',
      ];

      const isFinancial = financialKeywords.some(kw => userQuery.includes(kw));

      let systemContent = '';

      if (isFinancial) {
        // ── Financial system prompt ──────────────────────────────────────
        // Deliberately short and directive — 0.5B models obey constraints
        // better when the prompt is concise and example-driven.
        const context = await getFinancialContext();
        systemContent = `You are a brief financial assistant. Use ONLY the data below.

<DATA>
${context}
</DATA>

STRICT RULES:
1. Answer in 1-2 sentences. Use exact numbers from <DATA>.
2. If the answer is not in <DATA>, say: "I don't have that data yet."
3. No jargon. No reasoning. No preamble. Just the answer.
4. For chart/graph requests, append ONLY this after your answer:
   [CHART_DATA: {"data": [{"label": "NAME", "value": NUMBER}]}]`;
      } else {
        // ── Non-financial system prompt ──────────────────────────────────
        // Extremely prescriptive to prevent the model from hallucinating
        // financial data or entering a repetition loop on simple greetings.
        systemContent = `You are a one-sentence assistant. Follow these examples exactly.

User: hey → You: Hello! What would you like to know about your finances?
User: hello → You: Hi there! Ask me about your spending, goals, or budget.
User: how are you → You: Ready to help! Ask me about your finances.
User: [anything else] → You: Ask me something like "How much did I spend this month?"

OUTPUT: Exactly one sentence. No lists. No follow-up questions. Stop after the period.`;
      }

      const fullPrompt = [
        { role: 'system', content: systemContent },
        ...messages,
      ];

      // Guard against context overflow
      const approxTokens = JSON.stringify(fullPrompt).length / 4;
      console.log(
        `[Local LLM] Starting inference. ~${approxTokens.toFixed(0)} tokens (Financial: ${isFinancial})`
      );

      if (approxTokens > 3500) {
        console.warn('[Local LLM] Prompt near context limit — truncating financial data...');
        // Trim the system content data block, not the rules
        fullPrompt[0].content = fullPrompt[0].content.substring(0, 8000);
      }

      const result = await modelState.context.completion(
        {
          messages: fullPrompt,

          // ── OPTIMIZED SAMPLING PARAMETERS ────────────────────────────
          // n_predict: fewer tokens for greetings — stops loop before it starts
          n_predict: isFinancial ? 200 : 60,

          // temperature: lower = more deterministic, less likely to drift into loops
          temperature: 0.3,

          // top_p: nucleus sampling threshold
          top_p: 0.85,

          // top_k: constrain token selection pool — critical for small models
          top_k: 40,

          // repeat_penalty: was 1.1 (too weak). 1.4 aggressively discourages repeats
          repeat_penalty: 1.4,

          // repeat_last_n: number of past tokens considered for penalty
          // Higher = wider penalty window = fewer loops
          repeat_last_n: 128,

          stop: [
            '</s>',
            '<|end|>',
            '<|eot_id|>',
            '<|im_end|>',
            '<|endoftext|>',
            '<|im_start|>',
            '\n\n\n',     // Stop on triple newlines — signals runaway formatting
            '[INST]',     // Mistral/LLaMA chat boundary
            '###',        // Alpaca-style boundary
          ],
        },
        (event: any) => {
          if (onToken && event.token) {
            onToken(event.token);
          }
        }
      );

      const rawResponse = result.text || 'I could not generate a response.';

      // Apply all sanitization passes
      const finalResponse = sanitizeResponse(rawResponse, isFinancial);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return finalResponse;

    } catch (error: any) {
      const errorDetail = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('[Local LLM] Native inference failed. Detail:', errorDetail);

      if (errorDetail.includes('context')) {
        console.warn('[Local LLM] Possible context overflow. Simplify the query.');
      }

      console.warn('[Local LLM] Falling back to rule-based engine.');
      // Fall through to fallback
    }
  }

  // ── Fallback path: rule-based analysis from real data ──
  return generateFallbackResponse(messages);
}

// ─── Fallback Financial Engine ──────────────────────────────────────────────

/**
 * A deterministic, rule-based response engine that uses the user's actual
 * WatermelonDB data to answer common financial queries offline.
 * No network, no model file, works everywhere including Expo Go.
 */
async function generateFallbackResponse(
  messages: { role: string; content: string }[]
): Promise<string> {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const query = (lastUserMessage?.content || '').toLowerCase();

  // Handle pure conversational inputs without touching the database
  const greetings = ['hey', 'hello', 'hi', 'sup', 'yo', 'what\'s up', 'howdy'];
  if (greetings.some(g => query.trim() === g || query.trim().startsWith(g + ' '))) {
    return 'Hello! Ask me about your spending, goals, or budget.';
  }

  try {
    const baseCurrency = (await AsyncStorage.getItem('user_currency')) || 'PHP';

    // Fetch real data from the local database
    const incomes = await database.get('incomes').query().fetch();
    const expenses = await database.get('expenses').query().fetch();
    const goals = await database.get('goals').query().fetch();
    const portfolio = await database.get('portfolio').query().fetch();

    const totalIncome = incomes.reduce((sum, i) => sum + ((i as any).amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + ((e as any).amount || 0), 0);
    const totalPortfolioValue = portfolio.reduce((sum, p) => sum + ((p as any).value || 0), 0);
    const netFlow = totalIncome - totalExpenses;

    // Monthly aggregation for historical queries
    const monthlyExpenses: Record<string, number> = {};
    const monthlyCategorical: Record<string, Record<string, number>> = {};

    expenses.forEach((e: any) => {
      const d = new Date((e as any).createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyExpenses[key] = (monthlyExpenses[key] || 0) + (e as any).amount;

      const cat = (e as any).category || 'Uncategorized';
      if (!monthlyCategorical[key]) monthlyCategorical[key] = {};
      monthlyCategorical[key][cat] = (monthlyCategorical[key][cat] || 0) + (e as any).amount;
    });

    const sortedMonths = Object.entries(monthlyExpenses).sort((a, b) => b[0].localeCompare(a[0]));
    const peakMonth = [...Object.entries(monthlyExpenses)].sort(([, a], [, b]) => b - a)[0];

    // Current category breakdown
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentCategories = monthlyCategorical[currentMonthKey] || {};
    const topCategories = Object.entries(currentCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Goal progress
    const goalSummaries = goals.map((g: any) => {
      const target = (g as any).targetAmount || (g as any).target_amount || 0;
      const current = (g as any).currentAmount || (g as any).current_amount || 0;
      const pct = target > 0 ? ((current / target) * 100).toFixed(0) : '0';
      return `${(g as any).name}: ${baseCurrency} ${current.toLocaleString()} / ${target.toLocaleString()} (${pct}%)`;
    });

    // ── Intent Detection & Response ──

    if (query.includes('most') || query.includes('highest') || query.includes('peak')) {
      if (!peakMonth) return '[Offline Mode] No expense data found to analyze peak spending.';
      const [month, amt] = peakMonth;
      const cats = monthlyCategorical[month];
      const topCat = Object.entries(cats).sort(([, a], [, b]) => b - a)[0];
      return `[Offline Mode] Your highest spending month was ${month} with ${baseCurrency} ${amt.toLocaleString()}.\n` +
        `Top category: ${topCat[0]} (${baseCurrency} ${topCat[1].toLocaleString()}).`;
    }

    if (query.includes('history') || query.includes('past') || query.includes('previous')) {
      if (sortedMonths.length === 0) return '[Offline Mode] No historical data found.';
      return `[Offline Mode] Spending history (last 6 months):\n\n` +
        sortedMonths.slice(0, 6).map(([m, a]) => `  - ${m}: ${baseCurrency} ${a.toLocaleString()}`).join('\n') +
        `\n\nLifetime total: ${baseCurrency} ${totalExpenses.toLocaleString()}`;
    }

    if (query.includes('safe') || query.includes('spend') || query.includes('budget')) {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysLeft = Math.max(1, daysInMonth - now.getDate());
      const currentMonthSpent = monthlyExpenses[currentMonthKey] || 0;
      const currentMonthIncome = incomes
        .filter(i => {
          const d = new Date((i as any).createdAt);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        })
        .reduce((sum, i) => sum + ((i as any).amount || 0), 0);

      const currentNet = currentMonthIncome - currentMonthSpent;
      const safeToSpend = Math.max(0, currentNet / daysLeft).toFixed(2);

      return `[Offline Mode] ${currentMonthKey} snapshot:\n\n` +
        `Safe to spend: ${baseCurrency} ${safeToSpend}/day (${daysLeft} days left)\n` +
        `Income: ${baseCurrency} ${currentMonthIncome.toLocaleString()}\n` +
        `Expenses: ${baseCurrency} ${currentMonthSpent.toLocaleString()}\n` +
        `Net: ${currentNet >= 0 ? '+' : ''}${baseCurrency} ${currentNet.toLocaleString()}`;
    }

    if (query.includes('goal') || query.includes('saving')) {
      if (goalSummaries.length === 0) return `[Offline Mode] No savings goals defined.`;
      return `[Offline Mode] Savings progress:\n\n` + goalSummaries.map(g => `  - ${g}`).join('\n');
    }

    if (query.includes('categor') || query.includes('where')) {
      if (topCategories.length === 0) return `[Offline Mode] No categorical data for this month.`;
      return `[Offline Mode] Top spending this month (${currentMonthKey}):\n\n` +
        topCategories.map(([cat, amt], i) => `  ${i + 1}. ${cat}: ${baseCurrency} ${amt.toLocaleString()}`).join('\n');
    }

    // Default overview
    return `[Offline Mode] Financial overview:\n\n` +
      `Lifetime Income:   ${baseCurrency} ${totalIncome.toLocaleString()}\n` +
      `Lifetime Expenses: ${baseCurrency} ${totalExpenses.toLocaleString()}\n` +
      `Portfolio Value:   ${baseCurrency} ${totalPortfolioValue.toLocaleString()}\n\n` +
      `Tip: For charts or complex analysis, switch to Cloud Mode (Gemini).`;

  } catch (error: any) {
    console.error('[Local LLM] Fallback engine error:', error.message);
    return `[Offline Mode] Error accessing local data. Please try again.`;
  }
}

// ─── Utility ────────────────────────────────────────────────────────────────

/** Returns the current AI mode state */
export function getLocalModelState(): LocalModelState {
  return { ...modelState };
}

/** Resets the model state (useful for testing or switching models) */
export async function releaseLocalModel(): Promise<void> {
  if (modelState.context) {
    try {
      await modelState.context.release();
    } catch {
      // Ignore release errors
    }
  }
  modelState = { initialized: false, mode: 'fallback', context: null };
}