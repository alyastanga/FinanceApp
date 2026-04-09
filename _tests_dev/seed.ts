import database from '../database';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Misc'];

function getRandomDateInLast2Years() {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 730)); // 2 years
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

      // 2. Seed Incomes (Distribute over 24 months)
      // We will have a PHP salary and a USD freelance income
      for (let m = 0; m < 24; m++) {
        const d = new Date();
        d.setMonth(d.getMonth() - m);

        // Core Salary (PHP)
        await database.get('incomes').create((income: any) => {
          const variance = (Math.random() * 1000) - 500; // Small variance in salary
          income.amount = 85000 + variance; // 85k PHP
          income.source = 'Full-Time Salary';
          income._currency = 'PHP';
          income.userId = userId;
          
          const salDate = new Date(d);
          salDate.setDate(15);
          income.createdAt = salDate;
        });

        // Remote Freelance (USD) - occasionally lower or higher
        await database.get('incomes').create((income: any) => {
          const variance = (Math.random() * 800) - 400; 
          income.amount = 1500 + variance; // $1,500 USD
          income.source = 'Upwork Freelance';
          income._currency = 'USD';
          income.userId = userId;
          
          const freeDate = new Date(d);
          freeDate.setDate(Math.floor(Math.random() * 25) + 1);
          income.createdAt = freeDate;
        });
      }

      // 3. Seed Budgets (Mixed currency limits)
      const budgetLines = [
        { category: 'Housing', limit: 25000, currency: 'PHP' },
        { category: 'Food', limit: 15000, currency: 'PHP' },
        { category: 'Shopping', limit: 500, currency: 'USD' }, // Prefers to budget shopping in USD
        { category: 'Entertainment', limit: 5000, currency: 'PHP' }
      ];

      for (const b of budgetLines) {
        await database.get('budgets').create((budget: any) => {
          budget.category = b.category;
          budget.amountLimit = b.limit;
          budget._currency = b.currency;
          budget.userId = userId;
        });
      }

      // 4. Seed Expenses
      // Fixed Monthly Expenses (Rent/Utilities in PHP, Subscriptions in USD)
      for (let m = 0; m < 24; m++) {
        const d = new Date();
        d.setMonth(d.getMonth() - m);

        // Rent
        await database.get('expenses').create((exp: any) => {
          exp.category = 'Housing';
          exp.amount = 22000; // 22k PHP
          exp._currency = 'PHP';
          exp.userId = userId;
          const ed = new Date(d); ed.setDate(1);
          exp.createdAt = ed;
        });

        // Utilities
        await database.get('expenses').create((exp: any) => {
          exp.category = 'Utilities';
          exp.amount = 3500 + (Math.random() * 1000 - 500); // 3.5k +/- 500 PHP
          exp._currency = 'PHP';
          exp.userId = userId;
          const ed = new Date(d); ed.setDate(5);
          exp.createdAt = ed;
        });

        // Cloud Subs
        await database.get('expenses').create((exp: any) => {
          exp.category = 'Misc';
          exp.amount = 45.99; // $45.99 USD
          exp._currency = 'USD';
          exp.userId = userId;
          const ed = new Date(d); ed.setDate(11);
          exp.createdAt = ed;
        });
      }

      // Random Variable Expenses (700 records over 2 years)
      for (let i = 0; i < 700; i++) {
        await database.get('expenses').create((expense: any) => {
          expense.category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
          const isFood = expense.category === 'Food';
          
          // 80% chance of PHP, 15% USD, 5% EUR
          const dice = Math.random();
          if (dice < 0.8) {
            expense.amount = isFood ? (Math.random() * 800 + 150) : (Math.random() * 5000 + 500);
            expense._currency = 'PHP';
          } else if (dice < 0.95) {
            expense.amount = isFood ? (Math.random() * 40 + 10) : (Math.random() * 200 + 40);
            expense._currency = 'USD';
          } else {
            expense.amount = Math.random() * 150 + 20;
            expense._currency = 'EUR';
          }
          
          expense.userId = userId;
          expense.createdAt = getRandomDateInLast2Years();
        });
      }

      // 5. Seed Goals (Mixed Currencies)
      const mockGoals = [
        { name: 'Emergency Fund', target: 500000, current: 350000, months: 6, currency: 'PHP', sync: false },
        { name: 'US Tech Setup', target: 3500, current: 1200, months: 4, currency: 'USD', sync: true },
        { name: 'Europe Trip', target: 4000, current: 800, months: 10, currency: 'EUR', sync: true }
      ];

      for (const g of mockGoals) {
        await database.get('goals').create((goal: any) => {
          goal.name = g.name;
          goal.targetAmount = g.target;
          goal.currentAmount = g.current;
          goal._currency = g.currency;
          goal.userId = userId;
          
          const completionDate = new Date();
          completionDate.setMonth(completionDate.getMonth() + g.months);
          goal.targetCompletionDate = completionDate.getTime();
          goal.syncToCalendar = g.sync;
        });
      }

      // 6. Portfolio Assets (Mixed Currencies)
      const mockPortfolio = [
        { name: 'S&P 500 ETF', symbol: 'VOO', type: 'stock', value: 502, invested: 410, quantity: 28, change: 1.2, currency: 'USD' },
        { name: 'Apple Inc', symbol: 'AAPL', type: 'stock', value: 175, invested: 140, quantity: 45, change: -0.8, currency: 'USD' },
        { name: 'Bitcoin', symbol: 'BINANCE:BTCUSDT', type: 'crypto', value: 68000, invested: 45000, quantity: 0.25, change: 4.5, currency: 'USD' },
        { name: 'Pag-IBIG MP2', symbol: 'CASH', type: 'cash', value: 125000, invested: 125000, quantity: 1, change: 0, currency: 'PHP' },
        { name: 'BDO Savings', symbol: 'CASH', type: 'cash', value: 450000, invested: 450000, quantity: 1, change: 0, currency: 'PHP' },
        { name: 'Revolut EUR', symbol: 'CASH', type: 'cash', value: 1200, invested: 1200, quantity: 1, change: 0, currency: 'EUR' }
      ];

      for (const p of mockPortfolio) {
        await database.get('portfolio').create((asset: any) => {
          asset.name = p.name;
          asset.symbol = p.symbol;
          asset.assetType = p.type;
          asset.quantity = p.quantity;
          asset.investedAmount = p.invested;
          // Note: portfolio fetching will overwrite these values eventually, but we set robust defaults
          asset.value = p.value * p.quantity; 
          asset.change24h = p.change;
          asset._currency = p.currency;
          asset.userId = userId;
        });
      }
    });

    console.log('[Dev] Database successfully seeded with 24-month multi-currency historical mock data for user:', userId);
    return true;
  } catch (error) {
    console.error('[Dev] Seeding failed:', error);
    return false;
  }
}
