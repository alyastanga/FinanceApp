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
 */

import database from '../database';

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
 */
export async function initLocalModel(modelPath?: string): Promise<boolean> {
  // Already initialized
  if (modelState.initialized) return true;

  try {
    // Dynamically import llama.rn — this will throw in Expo Go
    const { initLlama } = await import('llama.rn');

    if (!modelPath) {
      console.warn('[Local LLM] No model path provided, using fallback mode.');
      modelState = { initialized: true, mode: 'fallback', context: null };
      return true;
    }

    console.log('[Local LLM] Initializing native context...');
    const context = await initLlama({
      model: modelPath,
      n_ctx: 2048,
      n_gpu_layers: 99, // Use Metal on iOS, OpenCL on Android
      use_mlock: true,
    });

    modelState = { initialized: true, mode: 'native', context };
    console.log('[Local LLM] Native model loaded successfully.');
    return true;
  } catch (error: any) {
    // Expected in Expo Go — llama.rn requires custom native code
    console.log('[Local LLM] Native module unavailable, using offline fallback engine.');
    modelState = { initialized: true, mode: 'fallback', context: null };
    return true;
  }
}

// ─── Local Response Generation ──────────────────────────────────────────────

/**
 * Generates a response using the local model (native or fallback).
 * The fallback engine uses the user's real financial data to produce
 * meaningful offline analysis.
 */
export async function generateLocalResponse(
  messages: { role: string; content: string }[]
): Promise<string> {
  // Ensure model is initialized
  if (!modelState.initialized) {
    await initLocalModel();
  }

  // ── Native path: use llama.rn context ──
  if (modelState.mode === 'native' && modelState.context) {
    try {
      const result = await modelState.context.completion({
        messages: [
          {
            role: 'system',
            content:
              'You are a concise, professional financial advisor. Answer briefly based on the data given. Use plain text only.',
          },
          ...messages,
        ],
        n_predict: 256,
        temperature: 0.7,
        stop: ['</s>', '<|end|>', '<|eot_id|>', '<|im_end|>'],
      });
      return result.text || 'I could not generate a response.';
    } catch (error: any) {
      console.error('[Local LLM] Native inference failed:', error.message);
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

  try {
    // Fetch real data from the local database
    const incomes = await database.get('incomes').query().fetch();
    const expenses = await database.get('expenses').query().fetch();
    const goals = await database.get('goals').query().fetch();

    const totalIncome = incomes.reduce((sum, i) => sum + ((i as any).amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + ((e as any).amount || 0), 0);
    const netFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netFlow / totalIncome) * 100).toFixed(1) : '0';

    // Category breakdown
    const categories: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const cat = e.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + e.amount;
    });
    const topCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Goal progress
    const goalSummaries = goals.map((g: any) => {
      const pct = g.targetAmount > 0
        ? ((g.currentAmount / g.targetAmount) * 100).toFixed(0)
        : '0';
      return `${g.name}: $${g.currentAmount?.toLocaleString() || 0} / $${g.targetAmount?.toLocaleString() || 0} (${pct}%)`;
    });

    // Days left in month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();
    const safeToSpend = daysLeft > 0 ? (netFlow / daysLeft).toFixed(2) : '0.00';

    // ── Intent Detection & Response ──

    if (query.includes('safe') || query.includes('spend') || query.includes('budget')) {
      return `[Offline Mode] Based on your current data:\n\n` +
        `Your safe-to-spend amount is $${safeToSpend}/day for the remaining ${daysLeft} days this month.\n\n` +
        `Monthly Income: $${totalIncome.toLocaleString()}\n` +
        `Monthly Expenses: $${totalExpenses.toLocaleString()}\n` +
        `Net Flow: ${netFlow >= 0 ? '+' : ''}$${netFlow.toLocaleString()}\n` +
        `Savings Rate: ${savingsRate}%`;
    }

    if (query.includes('goal') || query.includes('saving')) {
      if (goalSummaries.length === 0) {
        return `[Offline Mode] You haven't set any savings goals yet. Head to the Goals tab to create one!`;
      }
      return `[Offline Mode] Your savings goals:\n\n` +
        goalSummaries.map(g => `  - ${g}`).join('\n') +
        `\n\nSavings Rate: ${savingsRate}% of income`;
    }

    if (query.includes('categor') || query.includes('where') || query.includes('most')) {
      if (topCategories.length === 0) {
        return `[Offline Mode] No expense data found. Log some transactions to see your spending breakdown.`;
      }
      return `[Offline Mode] Your top spending categories:\n\n` +
        topCategories.map(([cat, amt], i) => `  ${i + 1}. ${cat}: $${amt.toLocaleString()}`).join('\n') +
        `\n\nTotal Expenses: $${totalExpenses.toLocaleString()}`;
    }

    // Default summary
    return `[Offline Mode] Here's your financial snapshot:\n\n` +
      `Monthly Income: $${totalIncome.toLocaleString()}\n` +
      `Monthly Expenses: $${totalExpenses.toLocaleString()}\n` +
      `Net Flow: ${netFlow >= 0 ? '+' : ''}$${netFlow.toLocaleString()}\n` +
      `Savings Rate: ${savingsRate}%\n` +
      `Safe to Spend: $${safeToSpend}/day (${daysLeft} days left)\n` +
      `Active Goals: ${goals.length}\n\n` +
      `Tip: For deeper AI analysis, switch to Cloud mode when you have internet access.`;
  } catch (error: any) {
    console.error('[Local LLM] Fallback engine error:', error.message);
    return `[Offline Mode] I'm running in offline mode but couldn't access your data right now. Please try again.`;
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
