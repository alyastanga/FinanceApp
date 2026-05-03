import { calculateBudgetInsights } from './budget-engine';

export interface SimulationResult {
  goalName: string;
  originalDate: Date;
  newDate: Date;
  daysDelayed: number;
  impactScore: 'low' | 'medium' | 'high';
}

/**
 * Predicts the impact of a potential purchase on active savings goals.
 */
export const simulatePurchaseImpact = (
  purchaseAmount: number, // Intended to be passed in base currency
  incomes: any[],
  expenses: any[],
  goals: any[],
  budgets: any[] = [],
  convertFn: (val: number, fromCurrency: string) => number,
  baseCurrency: string
): SimulationResult[] => {
  const insights = calculateBudgetInsights(incomes, expenses, goals, budgets, convertFn, baseCurrency);
  const results: SimulationResult[] = [];

  // Actual monthly surplus available for all goals
  const actualMonthlySurplus = insights.monthlyIncome - insights.monthlyFixedExpenses - insights.variableSpent;

  goals.forEach(goal => {
    const targetAmt = convertFn(goal.targetAmount || goal._targetAmount || 0, goal.currency || goal._currency || baseCurrency);
    const currentAmt = convertFn(goal.currentAmount || goal._currentAmount || 0, goal.currency || goal._currency || baseCurrency);
    const remaining = targetAmt - currentAmt;
    if (remaining <= 0) return;

    // 1. Calculate theoretical velocity needed to hit the target date
    const targetDate = new Date(goal.targetCompletionDate || goal.target_completion_date);
    const now = new Date();
    const monthsDiff = Math.max(0.1, (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth()));
    const monthlyNeeded = remaining / monthsDiff;

    // 2. Determine actual velocity for this goal based on user's real surplus
    // We assume the surplus is distributed proportionally based on what's 'needed' for each goal
    const totalNeeded = Math.max(1, insights.monthlyGoalTarget);
    const goalRatio = monthlyNeeded / totalNeeded;
    
    // Use the user's ACTUAL surplus as the velocity, capped by what they 'plan' to save if they are over-saving,
    // or use the actual if they are under-saving. Actually, for a 'realistic' view, actual surplus is best.
    // If surplus is 0 or negative, any purchase has an 'infinite' delay, so we cap at a very high number.
    const actualVelocity = actualMonthlySurplus > 0 ? actualMonthlySurplus * goalRatio : 0.01;

    // 3. Calculate impact
    const currentMonthsToGoal = remaining / actualVelocity;
    const newMonthsToGoal = (remaining + purchaseAmount) / actualVelocity;
    const monthsDelayed = newMonthsToGoal - currentMonthsToGoal;

    const newDate = new Date();
    newDate.setMonth(now.getMonth() + Math.ceil(newMonthsToGoal));

    // If they were already going to be late, we show the delay relative to the original targetDate
    const daysDelayed = Math.floor((newDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

    // Impact scoring
    let impactScore: 'low' | 'medium' | 'high' = 'low';
    if (daysDelayed > 90 || actualMonthlySurplus <= purchaseAmount / 2) impactScore = 'high';
    else if (daysDelayed > 30 || actualMonthlySurplus <= purchaseAmount) impactScore = 'medium';

    results.push({
      goalName: goal.name,
      originalDate: targetDate,
      newDate,
      daysDelayed: Math.max(0, Math.floor(daysDelayed)),
      impactScore
    });
  });

  return results;
};
