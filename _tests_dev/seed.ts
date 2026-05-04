import database from '../database';
import { supabase } from '../lib/supabase';
import { setSyncLock } from '../lib/sync';

const CATEGORIES = ['Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Insurance', 'Subscriptions', 'Misc'];

function getRandomDateInLast2Years() {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 730)); // 2 years
  return date;
}

export async function seedDatabase() {
  setSyncLock(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[Dev] No active session found. Cannot seed without user_id.');
      return false;
    }
    const userId = session.user.id;

    // 1. Wipe Cloud Data first to prevent sync pollution
    const { clearCloudData } = require('../lib/data-management');
    await clearCloudData();

    await database.write(async () => {
      // 1. Wipe existing data
      const incomes = await database.get('incomes').query().fetch();
      const expenses = await database.get('expenses').query().fetch();
      const goals = await database.get('goals').query().fetch();
      const budgets = await database.get('budgets').query().fetch();
      const portfolioRecords = await database.get('portfolio').query().fetch();

      const allRecords = [...incomes, ...expenses, ...goals, ...budgets, ...portfolioRecords];
      
      if (allRecords.length > 0) {
        await database.batch(
          ...allRecords.map(record => record.prepareDestroyPermanently())
        );
      }

      // 2. Seed Incomes (24-month horizon)
      // Goal: ~66,100 PHP total monthly income
      for (let m = 0; m < 24; m++) {
        const d = new Date();
        d.setMonth(d.getMonth() - m);

        // Main Salary (PHP 60,000 Net)
        await database.get('incomes').create((income: any) => {
          income.amount = 60000;
          income.category = 'Salary';
          income.description = 'Monthly Salary (Professional)';
          income._currency = 'PHP';
          income.userId = userId;
          const salDate = new Date(d);
          salDate.setDate(15);
          income.createdAt = salDate;
          income.updatedAt = salDate;
        });

        // 13th Month Pay (Typical in PH - December)
        if (d.getMonth() === 11) {
          await database.get('incomes').create((income: any) => {
            income.amount = 60000;
            income.category = 'Salary';
            income.description = '13th Month Pay Bonus';
            income._currency = 'PHP';
            income.userId = userId;
            const bonDate = new Date(d);
            bonDate.setDate(20);
            income.createdAt = bonDate;
            income.updatedAt = bonDate;
          });
        }

        // Freelance / Side Hustle (~$110 USD / ~6,100 PHP)
        await database.get('incomes').create((income: any) => {
          income.amount = 110;
          income.category = 'Business';
          income.description = 'Freelance Project (VA/Design)';
          income._currency = 'USD';
          income.userId = userId;
          const freeDate = new Date(d);
          freeDate.setDate(25);
          income.createdAt = freeDate;
          income.updatedAt = freeDate;
        });
      }

      // 3. Seed Budgets (Matched to ~45k total allocation)
      const budgetLines = [
        { category: 'Housing', limit: 15500, currency: 'PHP' }, 
        { category: 'Food', limit: 10000, currency: 'PHP' },    
        { category: 'Utilities', limit: 4500, currency: 'PHP' }, 
        { category: 'Insurance', limit: 5000, currency: 'PHP' }, 
        { category: 'Subscriptions', limit: 2000, currency: 'PHP' },
        { category: 'Transport', limit: 4000, currency: 'PHP' }, 
        { category: 'Entertainment', limit: 4000, currency: 'PHP' } 
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
      for (let m = 0; m < 24; m++) {
        const d = new Date();
        d.setMonth(d.getMonth() - m);

        // Monthly Recurring Fixed (Reserved)
        const monthlyFixed = [
          { cat: 'Housing', desc: 'Condo Rent', amt: 15500, day: 1 },
          { cat: 'Utilities', desc: 'Meralco', amt: 3000 + (Math.random() * 500), day: 10 },
          { cat: 'Utilities', desc: 'PLDT Home Fiber', amt: 1699, day: 5 },
          { cat: 'Insurance', desc: 'SunLife VUL Policy', amt: 4500, day: 8 },
          { cat: 'Subscriptions', desc: 'ChatGPT Plus', amt: 1150, day: 12 },
          { cat: 'Subscriptions', desc: 'Netflix / Spotify', amt: 850, day: 14 }
        ];

        for (const f of monthlyFixed) {
          await database.get('expenses').create((exp: any) => {
            exp.category = f.cat;
            exp.amount = f.amt;
            exp.description = f.desc;
            exp._currency = 'PHP';
            exp.userId = userId;
            const ed = new Date(d); ed.setDate(f.day);
            exp.createdAt = ed;
            exp.updatedAt = ed;
          });
        }
      }

      // Random Localized Variable Expenses (Local Food, Transpo, Shopping)
      const phContexts = [
        { cat: 'Food', choices: ['GrabFood Order', 'SM Supermarket', 'Puregold', 'Dinner with Friends', 'Starbucks Coffee', 'Jollibee'] },
        { cat: 'Transport', choices: ['Angkas', 'GrabCar', 'Gas Station', 'Beep Load'] },
        { cat: 'Shopping', choices: ['Lazada Sale', 'Shopee Budol', 'Uniqlo Essentials'] },
        { cat: 'Entertainment', choices: ['Cinema', 'ML Diamonds', 'Anytime Fitness'] }
      ];

      for (let i = 0; i < 500; i++) {
        await database.get('expenses').create((expense: any) => {
          const context = phContexts[Math.floor(Math.random() * phContexts.length)];
          expense.category = context.cat;
          const desc = context.choices[Math.floor(Math.random() * context.choices.length)];
          expense.description = desc;

          if (context.cat === 'Food') {
            expense.amount = Math.random() * 600 + 100; // PHP 100 to 700
          } else if (context.cat === 'Transport') {
            expense.amount = Math.random() * 400 + 50;  // PHP 50 to 450
          } else {
            expense.amount = Math.random() * 2000 + 200; // PHP 200 to 2200
          }

          expense._currency = 'PHP';
          expense.userId = userId;
          const rDate = getRandomDateInLast2Years();
          expense.createdAt = rDate;
          expense.updatedAt = rDate;
        });
      }

      // 5. Seed Attainable Goals (relative to 66k income)
      const mockGoals = [
        { name: 'Emergency Fund', target: 150000, current: 85000, months: 12, currency: 'PHP' },
        { name: 'Siargao Trip', target: 25000, current: 5000, months: 5, currency: 'PHP' },
        { name: 'iPhone 16 Pro', target: 85000, current: 15000, months: 12, currency: 'PHP' },
        { name: 'House Downpayment', target: 1500000, current: 120000, months: 60, currency: 'PHP' }
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
          goal.syncToCalendar = false;
        });
      }

      // 6. Portfolio Assets
      const mockPortfolio = [
        { name: 'Pag-IBIG MP2', symbol: 'MP2', type: 'cash', value: 1, invested: 150000, quantity: 150000, change: 0, currency: 'PHP' },
        { name: 'Maya Savings (6%)', symbol: 'MAYA', type: 'cash', value: 1, invested: 45000, quantity: 45000, change: 0, currency: 'PHP' },
        { name: 'GCash (GSave)', symbol: 'GCSH', type: 'cash', value: 1, invested: 25000, quantity: 25000, change: 0, currency: 'PHP' },
        { name: 'Ethereum', symbol: 'BINANCE:ETHUSDT', type: 'crypto', value: 3500, invested: 2800, quantity: 0.45, change: 1.5, currency: 'USD' },
        { name: 'Stock: Jollibee (JFC)', symbol: 'PSE:JFC', type: 'stock', value: 245, invested: 220, quantity: 100, change: 2.1, currency: 'PHP' }
      ];

      for (const p of mockPortfolio) {
        await database.get('portfolio').create((asset: any) => {
          asset.name = p.name;
          asset.symbol = p.symbol;
          asset.assetType = p.type;
          asset.quantity = p.quantity;
          asset.investedAmount = p.invested;
          asset.value = p.value * p.quantity;
          asset.change24h = p.change;
          asset._currency = p.currency;
          asset.userId = userId;
        });
      }
    });

    console.log('[Dev] Database successfully seeded with realistic Filipino financial data for user:', userId);
    return true;
  } catch (error) {
    console.error('[Dev] Seeding failed:', error);
    return false;
  } finally {
    setSyncLock(false);
  }
}

