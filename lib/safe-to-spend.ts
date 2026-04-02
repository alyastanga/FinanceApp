import { Collection } from '@nozbe/watermelondb';
import database from '../database';

/**
 * Calculates the 'Safe to Spend' daily budget.
 * 
 * Logic:
 * (Total Income - Total Expenses - Total Goal Targets) / Days Left in Month
 * 
 * This provides a realistic daily allowance that ensures goals are met.
 */
export async function calculateSafeToSpend(): Promise<{
  safeDaily: number;
  totalIncome: number;
  totalExpenses: number;
  totalGoalTarget: number;
  daysLeft: number;
}> {
  const incomesCollection = database.get('incomes');
  const expensesCollection = database.get('expenses');
  const goalsCollection = database.get('goals');

  // Fetch all data (In a production app, we would query by current month)
  const incomes = await incomesCollection.query().fetch();
  const expenses = await expensesCollection.query().fetch();
  const goals = await goalsCollection.query().fetch();

  const totalIncome = incomes.reduce((sum, income: any) => sum + income.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense: any) => sum + expense.amount, 0);
  
  // For goals, we factor in what needs to be saved (targetAmount - savedAmount)
  // Assuming active goals need to be funded from current balance
  const totalGoalTarget = goals.reduce((sum, goal: any) => {
    const remaining = goal.targetAmount - goal.savedAmount;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  // Calculate days left in the current month
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = lastDay.getDate() - now.getDate() + 1; // +1 to include today

  const availableBalance = totalIncome - totalExpenses - totalGoalTarget;
  const safeDaily = availableBalance > 0 ? availableBalance / daysLeft : 0;

  return {
    safeDaily,
    totalIncome,
    totalExpenses,
    totalGoalTarget,
    daysLeft
  };
}
