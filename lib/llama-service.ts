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

import * as FileSystem from 'expo-file-system/legacy';
import database from '../database';

const MODEL_NAME = 'DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf';

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
  // Already initialized in native mode
  if (modelState.initialized && modelState.mode === 'native') return true;

  try {
    // Dynamically import llama.rn — this will throw in Expo Go or if no native module
    const { initLlama } = await import('llama.rn');

    // Determine path — default to documentDirectory/tinyllama if none provided
    const resolvedPath = modelPath || `${FileSystem.documentDirectory}${MODEL_NAME}`;

    const info = await FileSystem.getInfoAsync(resolvedPath);
    if (!info.exists) {
      console.log('[Local LLM] No native model found at path, using offline fallback engine.');
      modelState = { initialized: true, mode: 'fallback', context: null };
      return true;
    }

    console.log('[Local LLM] Initializing native context with model:', resolvedPath);
    const context = await initLlama({
      model: resolvedPath,
      n_ctx: 2048,
      n_gpu_layers: 99, // Use GPU acceleration if possible
      use_mlock: true,
    });

    modelState = { initialized: true, mode: 'native', context };
    console.log('[Local LLM] Native model loaded successfully.');
    return true;
  } catch (error: any) {
    console.log('[Local LLM] Native module unavailable or error, using fallback engine.');
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
            content: `[SYSTEM ROLE: SENIOR FINANCIAL CONSULTANT]
              You are a Senior Partner at a top-tier financial consultancy with 20 years of experience. You provide high-level, authoritative, and extremely concise executive insights. Your output is read by an automated system, so strict adherence to formatting rules is mandatory. Failure to comply causes a FATAL SYSTEM ERROR.

              <directives>
              1. Provide a single-paragraph executive summary based on the data. Speak with the authority, analytical depth, and brevity of a 20-year industry veteran.
              2. NO PLEASANTRIES. Do not use conversational filler (e.g., "Here is your chart", "I hope this helps", "Let's look at").
              3. VISUAL TRIGGER: If the user requests a chart, graph, or visual, you MUST append a raw JSON block at the absolute end of your response.
              4. The JSON block MUST NOT be inside <think> tags. 
              5. DO NOT wrap the JSON in Markdown code blocks (e.g., no \`\`\`json).
              </directives>

              <strict_format_example>
              User: Graph my recent expenses.
              Assistant: <think>User requested a graph. I will generate an authoritative executive summary and append the raw chart data after my reasoning closes.</think>
              Your capital allocation reflects a high concentration in discretionary travel, requiring immediate budget realignment to preserve margin.
              [CHART_DATA: {"data": [{"label": "Travel", "value": 450, "color": "#3b82f6"}]}]
              </strict_format_example>`
          },
          ...messages,
        ],
        n_predict: 256,
        temperature: 0.7,
        stop: ['</s>', '<|end|>', '<|eot_id|>', '<|im_end|>'],
      });

      let finalResponse = result.text || 'I could not generate a response.';
      // DeepSeek R1 reasoning removal
      finalResponse = finalResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      return finalResponse;
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
    const portfolio = await database.get('portfolio').query().fetch();

    const totalIncome = incomes.reduce((sum, i) => sum + ((i as any).amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + ((e as any).amount || 0), 0);
    const totalPortfolioValue = portfolio.reduce((sum, p) => sum + ((p as any).value || 0), 0);
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

    if (query.includes('worth') || query.includes('portfolio') || query.includes('asset')) {
      if (portfolio.length === 0) {
        return `[Offline Mode] Your Portfolio is currently empty. You can add assets in the Portfolio hub to track your Net Worth.`;
      }
      return `[Offline Mode] Your Net Worth Overview:\n\n` +
        `Total Assets: $${totalPortfolioValue.toLocaleString()}\n` +
        `Liquid Flow: $${netFlow.toLocaleString()}/mo\n\n` +
        `Asset Breakdown:\n` +
        portfolio.map(p => `  - ${(p as any).name}: $${(p as any).value.toLocaleString()}`).join('\n');
    }

    // Default summary
    return `[Offline Mode] Here's your financial snapshot:\n\n` +
      `Monthly Income: $${totalIncome.toLocaleString()}\n` +
      `Monthly Expenses: $${totalExpenses.toLocaleString()}\n` +
      `Net Worth (Assets): $${totalPortfolioValue.toLocaleString()}\n` +
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
