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

  goals.forEach(goal => {
    const targetAmt = convertFn(goal.targetAmount || goal._targetAmount || 0, goal.currency || goal._currency || baseCurrency);
    const currentAmt = convertFn(goal.currentAmount || goal._currentAmount || 0, goal.currency || goal._currency || baseCurrency);
    const remaining = targetAmt - currentAmt;
    if (remaining <= 0) return;

    // Current Monthly velocity toward this goal
    const targetDate = new Date(goal.targetCompletionDate || goal.target_completion_date);
    const now = new Date();
    const monthsDiff = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
    const monthlyNeeded = remaining / Math.max(1, monthsDiff);

    // New remaining amount if we subtract the purchase from the 'current savings' 
    // or assume it delays the goal by that amount (amount is assumed to be baseCurrency already)
    const newRemaining = remaining + purchaseAmount;
    const newMonthsRequired = newRemaining / Math.max(1, monthlyNeeded);
    
    const newDate = new Date();
    newDate.setMonth(now.getMonth() + Math.ceil(newMonthsRequired));

    const daysDelayed = Math.floor((newDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

    // Impact scoring
    let impactScore: 'low' | 'medium' | 'high' = 'low';
    if (daysDelayed > 90) impactScore = 'high';
    else if (daysDelayed > 30) impactScore = 'medium';

    results.push({
      goalName: goal.name,
      originalDate: targetDate,
      newDate,
      daysDelayed: Math.max(0, daysDelayed),
      impactScore
    });
  });

  return results;
};
