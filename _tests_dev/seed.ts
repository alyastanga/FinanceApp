import database from '../database';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Misc'];

function getRandomDateInLast6Months() {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 180));
  return date;
}

export async function seedDatabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[Dev] No active session found. Cannot seed without user_id.');
      return false;
    }
    const userId = session.user.id;

    await database.write(async () => {
      // 1. Wipe existing data
      const incomes = await database.get('incomes').query().fetch();
      const expenses = await database.get('expenses').query().fetch();
      const goals = await database.get('goals').query().fetch();
      const budgets = await database.get('budgets').query().fetch();
      const portfolioRecords = await database.get('portfolio').query().fetch();

      const allRecords = [...incomes, ...expenses, ...goals, ...budgets, ...portfolioRecords];
      for (const record of allRecords) {
        await record.markAsDeleted();
        await record.destroyPermanently();
      }

      // 2. Seed Incomes (Distribute over 6 months)
      const incomeSources = [
        { name: 'Monthly Salary', amount: 5500 },
        { name: 'Freelance Design', amount: 1200 },
        { name: 'Dividends', amount: 150 }
      ];

      for (let m = 0; m < 6; m++) {
        for (const source of incomeSources) {
          await database.get('incomes').create((income: any) => {
            // Add slight variance to amount for a more organic look
            const variance = (Math.random() * 500) - 250;
            income.amount = source.amount + variance;
            income.source = source.name;
            income.userId = userId;
            const d = new Date();
            d.setMonth(d.getMonth() - m);
            d.setDate(Math.floor(Math.random() * 25) + 1); // Varied day of month
            income.createdAt = d;
          });
        }
      }

      // 3. Seed Budgets
      const budgetLines = [
        { category: 'Housing', limit: 2000 },
        { category: 'Food', limit: 800 },
        { category: 'Transport', limit: 300 },
        { category: 'Entertainment', limit: 400 }
      ];

      for (const b of budgetLines) {
        await database.get('budgets').create((budget: any) => {
          budget.category = b.category;
          budget.amountLimit = b.limit;
          budget.userId = userId;
        });
      }

      // 4. Seed Expenses (Distribute approx 200 expenses over 6 months)
      for (let i = 0; i < 200; i++) {
        await database.get('expenses').create((expense: any) => {
          expense.category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
          // Food/Shopping is smaller, Misc is random
          const isFood = expense.category === 'Food';
          expense.amount = isFood ? (Math.floor(Math.random() * 40) + 15) : (Math.floor(Math.random() * 150) + 20);
          expense.userId = userId;
          expense.createdAt = getRandomDateInLast6Months();
        });
      }

      // Monthly fixed expenses
      for (let m = 0; m < 6; m++) {
        await database.get('expenses').create((expense: any) => {
          expense.category = 'Housing';
          expense.amount = 1800;
          expense.userId = userId;
          const d = new Date();
          d.setMonth(d.getMonth() - m);
          d.setDate(1);
          expense.createdAt = d;
        });
      }

      // 5. Seed Goals (v6 Schema)
      const mockGoals = [
        { name: 'Emergency Fund', target: 15000, current: 4500, months: 6, sync: false },
        { name: 'New Living Room', target: 5000, current: 1200, months: 12, sync: true },
        { name: 'Dream Vacation', target: 8000, current: 500, months: 18, sync: true }
      ];

      for (const g of mockGoals) {
        await database.get('goals').create((goal: any) => {
          goal.name = g.name;
          goal.targetAmount = g.target;
          goal.currentAmount = g.current;
          goal.userId = userId;
          
          const completionDate = new Date();
          completionDate.setMonth(completionDate.getMonth() + g.months);
          goal.targetCompletionDate = completionDate.getTime();
          goal.syncToCalendar = g.sync;
        });
      }

      // 6. Portfolio Assets
      const mockPortfolio = [
        { name: 'S&P 500 Index', type: 'Stock', value: 12450, change: 1.2 },
        { name: 'Bitcoin / ETH', type: 'Crypto', value: 3200, change: -2.4 },
        { name: 'HYS Savings', type: 'Cash', value: 15600, change: 0.1 }
      ];

      for (const p of mockPortfolio) {
        await database.get('portfolio').create((asset: any) => {
          asset.name = p.name;
          asset.assetType = p.type;
          asset.value = p.value;
          asset.change24h = p.change;
          asset.userId = userId;
        });
      }
    });

    console.log('[Dev] Database successfully seeded with 6-month historical mock data for user:', userId);
    return true;
  } catch (error) {
    console.error('[Dev] Seeding failed:', error);
    return false;
  }
}
