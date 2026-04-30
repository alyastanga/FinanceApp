import AsyncStorage from '@react-native-async-storage/async-storage';
import database from '../database';

export interface BudgetInsights {
  dailySafeToSpend: number;
  monthlyIncome: number;
  actualIncome: number;
  monthlyFixedExpenses: number;
  monthlyGoalTarget: number;
  remainingDays: number;
  variableSpent: number; // Exposing variableSpent for calculations later if needed
}

/**
 * Core engine for calculating proactive budgeting insights.
 * Takes raw records and returns derived 'Safe to Spend' metrics.
 */
export interface RunwayInsights {
  runwayDays: number;
  totalLiquidCash: number;
  dailyBurnRate: number;
}

/**
 * Calculates Financial Runway (Days of Freedom)
 * Liquid Cash / Avg Daily Burn
 */
export const calculateRunway = (
  portfolio: any[],
  expenses: any[],
  convertFn: (val: number, fromCurrency: string) => number = (v) => v,
  baseCurrency: string = 'PHP'
): RunwayInsights => {
  const now = new Date();

  // 1. Calculate Total Liquid Cash (Cash Assets + Stablecoins)
  // We include asset_type === 'cash' and crypto that are likely stables (USDT, USDC, etc)
  const totalLiquid = (portfolio || []).reduce((sum, p) => {
    const type = (p.assetType || p.asset_type || '').toLowerCase();
    const symbol = (p.symbol || '').toUpperCase();

    const isCash = type === 'cash';
    const isStable = type === 'crypto' && (symbol.includes('USDT') || symbol.includes('USDC') || symbol.includes('DAI'));

    if (isCash || isStable) {
      return sum + convertFn(p.value || 0, p.currency || p._currency || baseCurrency);
    }
    return sum;
  }, 0);

  // 2. Calculate Avg Daily Burn (90 Day Average)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const relevantExpenses = (expenses || []).filter(e => {
    const t = e.createdAt instanceof Date ? e.createdAt.getTime() : Number(e.createdAt);
    return t >= ninetyDaysAgo.getTime();
  });

  const totalSpent90 = relevantExpenses.reduce((sum, e) =>
    sum + convertFn(Math.abs(e.amount || 0), e.currency || e._currency || baseCurrency), 0
  );

  const dailyBurn = totalSpent90 / 90;

  return {
    runwayDays: dailyBurn > 0 ? Math.floor(totalLiquid / dailyBurn) : (totalLiquid > 0 ? -1 : 0), // -1 represents 'Stable' (no burn)
    totalLiquidCash: totalLiquid,
    dailyBurnRate: dailyBurn
  };
};

export const calculateBudgetInsights = (
  incomes: any[],
  expenses: any[],
  goals: any[],
  convertFn: (val: number, fromCurrency: string) => number = (v) => v,
  baseCurrency: string = 'PHP'
): BudgetInsights => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);

  // 1. Calculate Monthly Income 
  const currentMonthIncomes = incomes.filter(i => {
    const t = i.createdAt instanceof Date ? i.createdAt.getTime() : Number(i.createdAt);
    return t >= new Date(currentYear, currentMonth, 1).getTime();
  });
  const actualCurrentMonthIncome = currentMonthIncomes.reduce((sum, i) => sum + convertFn(i.amount || 0, i.currency || i._currency || baseCurrency), 0);

  // LOGIC: Calculate a true 90-day historical average for better projection
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const historicalIncomes = incomes.filter(i => {
    const t = i.createdAt instanceof Date ? i.createdAt.getTime() : Number(i.createdAt);
    return t >= ninetyDaysAgo.getTime();
  });

  // Calculate sum and divide by exactly 3 months
  const sum90Days = historicalIncomes.reduce((sum, i) => sum + convertFn(i.amount || 0, i.currency || i._currency || baseCurrency), 0);
  const avgMonthlyIncome = sum90Days / 3;

  // Decide on Projected Income:
  // Use Actual if it's already higher than average, or if average is 0.
  // Otherwise use average to help with Safe to Spend at the start of the month.
  const projectedIncome = Math.max(actualCurrentMonthIncome, avgMonthlyIncome);

  // 2. Calculate Fixed Monthly Expenses 
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.createdAt || e.created_at || (e._raw && e._raw.created_at) || e);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const fixedCategories = ['Rent', 'Housing', 'Mortgage', 'Subscription', 'Utilities'];
  const monthlyFixed = monthExpenses
    .filter(e => fixedCategories.includes(e.category || e._category))
    .reduce((sum, e) => sum + convertFn(e.amount || 0, e.currency || e._currency || baseCurrency), 0);

  // 3. Calculate Monthly Goal Contributions
  let totalGoalContributionRequired = 0;
  goals.forEach(g => {
    const targetAmt = convertFn(g.targetAmount || g._targetAmount || 0, g.currency || g._currency || baseCurrency);
    const currentAmt = convertFn(g.currentAmount || g._currentAmount || 0, g.currency || g._currency || baseCurrency);
    const remaining = targetAmt - currentAmt;
    if (remaining <= 0) return;

    const targetDate = new Date(g.targetCompletionDate || g.target_completion_date);
    const monthsDiff = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());

    const monthlyNeeded = remaining / Math.max(1, monthsDiff);
    totalGoalContributionRequired += monthlyNeeded;
  });

  // 4. Calculate Safe to Spend
  // Formula: (Projected Income - Fixed - Goals) / Remaining Days
  const variableSpent = monthExpenses
    .filter(e => !fixedCategories.includes(e.category || e._category))
    .reduce((sum, e) => sum + convertFn(e.amount || 0, e.currency || e._currency || baseCurrency), 0);

  const netAvailable = projectedIncome - monthlyFixed - totalGoalContributionRequired - variableSpent;
  const dailySafeToSpend = netAvailable / remainingDays;

  return {
    dailySafeToSpend: Math.max(0, dailySafeToSpend),
    monthlyIncome: projectedIncome,
    actualIncome: actualCurrentMonthIncome,
    monthlyFixedExpenses: monthlyFixed,
    monthlyGoalTarget: totalGoalContributionRequired,
    remainingDays,
    variableSpent
  };
};

export async function getFinancialContext(query: string = '') {
  const baseCurrency = (await AsyncStorage.getItem('user_currency')) || 'PHP';

  const incomes = await database.get('incomes').query().fetch();
  const expenses = await database.get('expenses').query().fetch();
  const goals = await database.get('goals').query().fetch();
  const portfolio = await database.get('portfolio').query().fetch();
  const rawBudgets = await database.get('budgets').query().fetch();

  const insights = calculateBudgetInsights(incomes, expenses, goals, (v) => v, baseCurrency);

  // ── 1. Full Monthly History with Categorical Breakdown ──
  const monthlyAggregates: Record<string, {
    income: number;
    expense: number;
    categories: Record<string, number>
  }> = {};

  incomes.forEach(i => {
    const d = new Date((i as any).createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyAggregates[key]) monthlyAggregates[key] = { income: 0, expense: 0, categories: {} };
    monthlyAggregates[key].income += (i as any).amount || 0;
  });

  expenses.forEach(e => {
    const d = new Date((e as any).createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const category = (e as any).category || 'Uncategorized';
    if (!monthlyAggregates[key]) monthlyAggregates[key] = { income: 0, expense: 0, categories: {} };
    monthlyAggregates[key].expense += (e as any).amount || 0;
    monthlyAggregates[key].categories[category] = (monthlyAggregates[key].categories[category] || 0) + (e as any).amount;
  });

  const historyLines = Object.entries(monthlyAggregates)
    .sort((a, b) => b[0].localeCompare(a[0])) // Most recent first
    .slice(0, 6) // Limit to last 6 months to prevent context overflow
    .map(([month, data]) => {
      const breakdown = Object.entries(data.categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5) // Limit categories per month
        .map(([cat, amt]) => `"${cat}": ${amt.toFixed(0)}`)
        .join(', ');

      return `[${month}] Summary: Income: ${data.income.toFixed(0)}, Total_Expenses: ${data.expense.toFixed(0)}\n      Historical_Breakdown: { ${breakdown} }`;
    })
    .join('\n    ');

  // ── 2. Detailed Budget vs Actual ──
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthData = monthlyAggregates[currentMonthKey] || { categories: {} };

  const budgetStatus = rawBudgets.map((b: any) => {
    const spent = currentMonthData.categories[(b as any).category] || 0;
    const limit = (b as any).amountLimit || (b as any).amount_limit || 0;
    const remains = limit - spent;
    const pct = limit > 0 ? ((spent / limit) * 100).toFixed(0) : '0';
    return `- ${(b as any).category}: ${spent.toFixed(0)} / ${limit.toFixed(0)} (${pct}%) ${remains < 0 ? '!! OVER !!' : ''}`;
  }).join('\n    ');

  // ── 3. Detailed Portfolio & Goals ──
  const portfolioDetails = portfolio.map((p: any) => {
    return `- ${p.name} (${p.assetType || p.asset_type}): ${p.value?.toLocaleString()} ${p.currency || p._currency} [Qty: ${p.quantity || 1}, Cost: ${p.investedAmount || p.invested_amount}]`;
  }).join('\n    ');

  const goalDetails = goals.map((g: any) => {
    const target = g.targetAmount || g.target_amount || 0;
    const current = g.currentAmount || g.current_amount || 0;
    const date = g.targetCompletionDate ? new Date(g.targetCompletionDate).toLocaleDateString() : 'N/A';
    return `- ${g.name}: ${current.toLocaleString()} / ${target.toLocaleString()} (Due: ${date})`;
  }).join('\n    ');

  const lifetimeIncome = incomes.reduce((sum, i) => sum + ((i as any).amount || 0), 0);
  const lifetimeExpense = expenses.reduce((sum, e) => sum + ((e as any).amount || 0), 0);

  const contextString = `
    User Base Currency: ${baseCurrency}
    
    CURRENT MONTH BUDGET PERFORMANCE:
    ${budgetStatus || 'No budgets defined.'}
    
    CURRENT MONTHLY SUMMARY:
    - Safe to Spend Daily: ${insights.dailySafeToSpend.toFixed(2)}
    - Actual Income: ${insights.actualIncome}
    - Total (Fixed) Expenses: ${insights.monthlyFixedExpenses}
    - Goal Commitment: ${insights.monthlyGoalTarget}
    - Days Left: ${insights.remainingDays}
    
    LIFETIME TOTALS:
    - Earned: ${lifetimeIncome.toFixed(0)}, Spent: ${lifetimeExpense.toFixed(0)}, Saved: ${(lifetimeIncome - lifetimeExpense).toFixed(0)}

    FULL HISTORICAL MONTHLY BREAKDOWN (Format: Month: Inc, Exp (Top Categories)):
    ${historyLines}

    ACTIVE GOAL DETAILS:
    ${goalDetails || 'No active goals.'}

    PORTFOLIO ASSET DETAILS:
    ${portfolioDetails || 'Empty portfolio.'}
    
    RECENT OR RELEVANT TRANSACTIONS:
    ${(() => {
      let all = [
        ...incomes.map(i => ({
          amount: (i as any).amount,
          category: (i as any).category,
          description: (i as any).description,
          createdAt: (i as any).createdAt,
          type: 'Income',
          currency: (i as any)._currency
        })),
        ...expenses.map(e => ({
          amount: (e as any).amount,
          category: (e as any).category,
          description: (e as any).description,
          createdAt: (e as any).createdAt,
          type: 'Expense',
          currency: (e as any)._currency
        }))
      ];

      // Sort newest to oldest
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Simple RAG: Filter if query contains specific keywords
      if (query && query.trim().length > 0) {
        // Strip out common words that might cause false positives
        const stopWords = ['what', 'is', 'my', 'the', 'of', 'in', 'and', 'to', 'a', 'for', 'how', 'much'];
        const keywords = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').filter(k => k.length > 2 && !stopWords.includes(k));

        if (keywords && keywords.length > 0) {
          const filtered = all.filter(t => {
            const searchString = `${t.category} ${t.description || ''} ${t.type}`.toLowerCase();
            return keywords.some(kw => searchString.includes(kw.toLowerCase()));
          });

          if (filtered.length > 0) {
            // Return up to 20 matched records
            return filtered.slice(0, 20)
              .map(t => `- [${t.type}] [${t.category}] ${t.description ? `"${t.description}" ` : ''}${t.type === 'Income' ? 'received' : 'costing'} ${t.amount} ${t.currency || baseCurrency}`)
              .join('\n    ');
          }
        }
      }

      // Default: return the 10 most recent
      // Because we sorted newest to oldest above, index 0-9 are the most recent.
      return all
        .slice(0, 10)
        .map(t => `- [${t.type}] [${t.category}] ${t.description ? `"${t.description}" ` : ''}${t.type === 'Income' ? 'received' : 'costing'} ${t.amount} ${t.currency || baseCurrency}`)
        .join('\n    ');
    })()}
`;

  return contextString;
}
