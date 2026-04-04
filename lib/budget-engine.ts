export interface BudgetInsights {
  dailySafeToSpend: number;
  monthlyIncome: number;
  monthlyFixedExpenses: number;
  monthlyGoalTarget: number;
  remainingDays: number;
}

/**
 * Core engine for calculating proactive budgeting insights.
 * Takes raw records and returns derived 'Safe to Spend' metrics.
 */
export const calculateBudgetInsights = (
  incomes: any[],
  expenses: any[],
  goals: any[]
): BudgetInsights => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);

  // 1. Calculate Monthly Income (Average FALLBACK for the 1st of the month)
  const monthlyIncomes = incomes.filter(i => {
    const d = new Date(i.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const currentMonthIncome = monthlyIncomes.reduce((sum, i) => sum + i.amount, 0);

  // LOGIC: If current month income is very low (e.g. beginning of month), look at the average
  let projectedMonthlyIncome = currentMonthIncome;
  if (currentMonthIncome === 0 || incomes.length > 5) {
     const last3Months = incomes.sort((a,b) => b.createdAt - a.createdAt).slice(0, 15); // Assuming ~3-5 sources/mo
     const avgIncome = last3Months.reduce((sum, i) => sum + i.amount, 0) / Math.max(1, last3Months.length / 3);
     // Use average if it's significantly higher than what we currently have
     if (avgIncome > currentMonthIncome) {
        projectedMonthlyIncome = avgIncome;
     }
  }

  // 2. Calculate Fixed Monthly Expenses 
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const fixedCategories = ['Rent', 'Housing', 'Mortgage', 'Subscription', 'Utilities'];
  const monthlyFixed = monthExpenses
    .filter(e => fixedCategories.includes(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  // 3. Calculate Monthly Goal Contributions
  let totalGoalContributionRequired = 0;
  goals.forEach(g => {
    const remaining = g.targetAmount - g.currentAmount;
    if (remaining <= 0) return;

    const targetDate = new Date(g.targetCompletionDate);
    const monthsDiff = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
    
    const monthlyNeeded = remaining / Math.max(1, monthsDiff);
    totalGoalContributionRequired += monthlyNeeded;
  });

  // 4. Calculate Safe to Spend
  // Formula: (Projected Income - Fixed - Goals) / Remaining Days
  const variableSpent = monthExpenses
    .filter(e => !fixedCategories.includes(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  const netAvailable = projectedMonthlyIncome - monthlyFixed - totalGoalContributionRequired - variableSpent;
  const dailySafeToSpend = netAvailable / remainingDays;

  return {
    dailySafeToSpend: Math.max(0, dailySafeToSpend),
    monthlyIncome: projectedMonthlyIncome,
    monthlyFixedExpenses: monthlyFixed,
    monthlyGoalTarget: totalGoalContributionRequired,
    remainingDays
  };
};
