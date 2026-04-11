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

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import database from '../database';
import { getFinancialContext } from './budget-engine';

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
      n_threads: 4,      // Optimized for A13 Bionic architecture
      n_gpu_layers: 24,   // Balanced offload for 1.5B model on iPhone 11
      use_mlock: false,   // Disable mlock on 4GB devices to avoid memory pressure crashes
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
  messages: { role: string; content: string }[],
  agentId?: string
): Promise<string> {
  // Ensure model is initialized
  if (!modelState.initialized) {
    await initLocalModel();
  }

  // ── Native path: use llama.rn context ──
  if (modelState.mode === 'native' && modelState.context) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const context = await getFinancialContext();

      const result = await modelState.context.completion({
        messages: [
          {
            role: 'system',
            content: `You are FinanceGPT, an elite financial advisor. You have the user's REAL financial data below. You MUST use these numbers in every answer. Never say you lack data.

                  <DATA>
                  ${context}
                  </DATA>

                  RULES:
                  1. ALWAYS reference specific numbers from <DATA> in your answer. Double-check your math before responding.
                  2. For complex questions, use this reasoning framework:
                    SITUATION: State the financial reality from the data.
                    ANALYSIS: Calculate metrics (burn rate, savings rate, runway).
                    RECOMMENDATION: Give 2-3 specific, actionable steps.
                  3. Keep answers under 250 words. Be direct and authoritative.
                  4. For budget questions: use the explicit limits provided in the [BUDGET PERFORMANCE] section.
                  5. For goal questions: calculate needed savings based on the [ACTIVE GOAL DETAILS].

                  CHART RULES:
                  When the user asks for a chart, graph, or breakdown, you MUST end your response with this exact JSON format:
                  [CHART_DATA: {"data": [{"label": "NAME", "value": NUMBER}]}]
                  - Do NOT include color hex codes.
                  - Ensure labels are descriptive and values match the context data.
                  Place the block AFTER your text.`
          },
          ...messages,
        ],
        n_predict: 1024,
        temperature: 0.5,
        top_p: 0.9,
        stop: ['</s>', '<|end|>', '<|eot_id|>', '<|im_end|>'],
      });

      let finalResponse = result.text || 'I could not generate a response.';
      // DeepSeek R1 reasoning removal
      finalResponse = finalResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
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
      if (!peakMonth) return "[Offline Mode] No expense data found to analyze peak spending.";
      
      const [month, amt] = peakMonth;
      const cats = monthlyCategorical[month];
      const topCat = Object.entries(cats).sort(([, a], [, b]) => b - a)[0];
      
      return `[Offline Mode] Your highest spending month was ${month} with a total of ${baseCurrency} ${amt.toLocaleString()}.\n\n` +
             `The top category that month was ${topCat[0]} (${baseCurrency} ${topCat[1].toLocaleString()}).`;
    }

    if (query.includes('history') || query.includes('past') || query.includes('previous')) {
      if (sortedMonths.length === 0) return "[Offline Mode] No historical data found.";
      
      return `[Offline Mode] Your spending history for the last 6 months:\n\n` +
             sortedMonths.slice(0, 6).map(([m, a]) => `  - ${m}: ${baseCurrency} ${a.toLocaleString()}`).join('\n') +
             `\n\nTotal Lifetime Spending: ${baseCurrency} ${totalExpenses.toLocaleString()}`;
    }

    if (query.includes('safe') || query.includes('spend') || query.includes('budget')) {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysLeft = daysInMonth - now.getDate() || 1;
      // Net flow of THIS month
      const currentMonthSpent = monthlyExpenses[currentMonthKey] || 0;
      const currentMonthIncome = incomes
        .filter(i => {
           const d = new Date((i as any).createdAt);
           return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        })
        .reduce((sum, i) => sum + ((i as any).amount || 0), 0);
      
      const currentNet = currentMonthIncome - currentMonthSpent;
      const safeToSpend = Math.max(0, currentNet / daysLeft).toFixed(2);

      return `[Offline Mode] Current Monthly Snapshot (${currentMonthKey}):\n\n` +
        `Safe-to-spend: ${baseCurrency} ${safeToSpend}/day for ${daysLeft} days.\n\n` +
        `Income: ${baseCurrency} ${currentMonthIncome.toLocaleString()}\n` +
        `Expenses: ${baseCurrency} ${currentMonthSpent.toLocaleString()}\n` +
        `Net: ${currentNet >= 0 ? '+' : ''}${baseCurrency} ${currentNet.toLocaleString()}`;
    }

    if (query.includes('goal') || query.includes('saving')) {
      if (goalSummaries.length === 0) return `[Offline Mode] No savings goals defined.`;
      return `[Offline Mode] Your Savings Progress:\n\n` + goalSummaries.map(g => `  - ${g}`).join('\n');
    }

    if (query.includes('categor') || query.includes('where')) {
      if (topCategories.length === 0) return `[Offline Mode] No categorical data for this month.`;
      return `[Offline Mode] Top spending this month (${currentMonthKey}):\n\n` +
        topCategories.map(([cat, amt], i) => `  ${i + 1}. ${cat}: ${baseCurrency} ${amt.toLocaleString()}`).join('\n');
    }

    // Default summary
    return `[Offline Mode] Financial Overview:\n\n` +
      `Lifetime Income: ${baseCurrency} ${totalIncome.toLocaleString()}\n` +
      `Lifetime Expenses: ${baseCurrency} ${totalExpenses.toLocaleString()}\n` +
      `Portfolio Value: ${baseCurrency} ${totalPortfolioValue.toLocaleString()}\n\n` +
      `Tip: For complex queries like "create a graph", switch to Cloud Mode (Gemini).`;
  } catch (error: any) {
    console.error('[Local LLM] Fallback engine error:', error.message);
    return `[Offline Mode] Error accessing historical data.`;
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
