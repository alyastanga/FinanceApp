export interface BudgetInsights {
  dailySafeToSpend: number;
  monthlyIncome: number;
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

  // 1. Calculate Monthly Income (Average FALLBACK for the 1st of the month)
  const monthlyIncomes = incomes.filter(i => {
    const d = new Date(i.createdAt || i.created_at || (i._raw && i._raw.created_at) || i);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const currentMonthIncome = monthlyIncomes.reduce((sum, i) => sum + convertFn(i.amount || 0, i.currency || i._currency || baseCurrency), 0);

  // LOGIC: If current month income is very low (e.g. beginning of month), look at the average
  let projectedMonthlyIncome = currentMonthIncome;
  if (currentMonthIncome === 0 || incomes.length > 5) {
     const last3Months = [...incomes].sort((a,b) => b.createdAt - a.createdAt).slice(0, 15); // Assuming ~3-5 sources/mo
     const avgIncome = last3Months.reduce((sum, i) => sum + convertFn(i.amount || 0, i.currency || i._currency || baseCurrency), 0) / Math.max(1, last3Months.length / 3);
     // Use average if it's significantly higher than what we currently have
     if (avgIncome > currentMonthIncome) {
        projectedMonthlyIncome = avgIncome;
     }
  }

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

  const netAvailable = projectedMonthlyIncome - monthlyFixed - totalGoalContributionRequired - variableSpent;
  const dailySafeToSpend = netAvailable / remainingDays;

  return {
    dailySafeToSpend: Math.max(0, dailySafeToSpend),
    monthlyIncome: projectedMonthlyIncome,
    monthlyFixedExpenses: monthlyFixed,
    monthlyGoalTarget: totalGoalContributionRequired,
    remainingDays,
    variableSpent
  };
};
