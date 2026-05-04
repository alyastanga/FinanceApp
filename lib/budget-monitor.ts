import { Q } from '@nozbe/watermelondb';
import database from '../database';
import { calculateBudgetInsights } from './budget-engine';
import { NotificationService } from './notification-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BudgetMonitor = {
  /**
   * Check if the current spending in a category has reached 80% or 100% of the budget.
   */
  checkBudgetThresholds: async (category: string) => {
    try {
      const budgets = await database.get('budgets').query(Q.where('category', category)).fetch();
      if (budgets.length === 0) return;

      const budget = budgets[0] as any;
      const limit = budget.amountLimit || budget.amount_limit || 0;
      if (limit <= 0) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      
      const expenses = await database.get('expenses').query(
        Q.where('category', category),
        Q.where('created_at', Q.gte(startOfMonth))
      ).fetch();

      const totalSpent = expenses.reduce((sum, e: any) => sum + (e.amount || 0), 0);
      const percentage = (totalSpent / limit) * 100;

      // Threshold keys for storage to prevent duplicate alerts in the same month
      const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
      const threshold80Key = `budget_alert_80_${category}_${monthKey}`;
      const threshold100Key = `budget_alert_100_${category}_${monthKey}`;

      if (percentage >= 100) {
        const alreadyNotified = await AsyncStorage.getItem(threshold100Key);
        if (!alreadyNotified) {
          await NotificationService.sendLocalNotificationAsync(
            "⚠️ Budget Exceeded",
            `You've spent ${totalSpent.toFixed(0)} in "${category}", exceeding your limit of ${limit.toFixed(0)}.`
          );
          await AsyncStorage.setItem(threshold100Key, 'true');
        }
      } else if (percentage >= 80) {
        const alreadyNotified = await AsyncStorage.getItem(threshold80Key);
        if (!alreadyNotified) {
          await NotificationService.sendLocalNotificationAsync(
            "🔔 Budget Warning (80%)",
            `You've used 80% of your "${category}" budget (${totalSpent.toFixed(0)} / ${limit.toFixed(0)}).`
          );
          await AsyncStorage.setItem(threshold80Key, 'true');
        }
      }
    } catch (error) {
      console.error('[BudgetMonitor] Error checking thresholds:', error);
    }
  },

  /**
   * Generates a summary for the morning notification.
   */
  generateMorningSummary: async () => {
    try {
      const incomes = await database.get('incomes').query().fetch();
      const expenses = await database.get('expenses').query().fetch();
      const goals = await database.get('goals').query().fetch();
      const budgets = await database.get('budgets').query().fetch();
      
      const insights = calculateBudgetInsights(incomes, expenses, goals, budgets);
      
      const dailySafe = insights.dailySafeToSpend;
      const daysLeft = insights.remainingDays;
      
      return `Good morning! You have ${daysLeft} days left this month. Your safe-to-spend today is ${dailySafe.toFixed(0)}. Keep it up!`;
    } catch (error) {
      console.error('[BudgetMonitor] Error generating summary:', error);
      return "Good morning! Time to check your daily budget.";
    }
  }
};
