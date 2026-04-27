import database from '../database';
import { supabase } from '../lib/supabase';
import { setSyncLock } from '../lib/sync';

const CATEGORIES = ['Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Misc'];

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
      // Typical Filipino professional salary + occasional freelance
      for (let m = 0; m < 24; m++) {
        const d = new Date();
        d.setMonth(d.getMonth() - m);

        // Main Salary (PHP) - Professional Salary in the Philippines (~65k PHP net)
        await database.get('incomes').create((income: any) => {
          income.amount = 65000 + (Math.random() * 2000 - 1000);
          income.category = 'Salary';
          income.description = 'Monthly Salary (Professional)';
          income._currency = 'PHP';
          income.userId = userId;
          const salDate = new Date(d);
          salDate.setDate(15);
          income.createdAt = salDate;
          income.updatedAt = salDate;
        });

        // 13th Month Pay (Typical in PH - usually in December)
        if (d.getMonth() === 11) {
          await database.get('incomes').create((income: any) => {
            income.amount = 65000;
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

        // Freelance / Raket (e.g., Virtual Assistant or Graphic Design) - ~$500 USD
        if (Math.random() > 0.3) {
          await database.get('incomes').create((income: any) => {
            income.amount = 500 + (Math.random() * 200 - 100);
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
      }

      // 3. Seed Budgets (Localized PH categories)
      const budgetLines = [
        { category: 'Housing', limit: 18000, currency: 'PHP' }, // Rent for a studio in Makati/Mandaluyong
        { category: 'Food', limit: 12000, currency: 'PHP' },    // Groceries + GrabFood
        { category: 'Utilities', limit: 6000, currency: 'PHP' }, // Meralco + Fiber Internet
        { category: 'Transport', limit: 5000, currency: 'PHP' }, // Petrol + RFID/Joyride
        { category: 'Entertainment', limit: 4000, currency: 'PHP' } // Netflix + Coffee + Night out
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

        // Recurring Fixed PH Expenses
        const monthlyFixed = [
          { cat: 'Housing', desc: 'Monthly Rent', amt: 15500, day: 1 },
          { cat: 'Utilities', desc: 'Meralco Bill', amt: 3800 + (Math.random() * 500), day: 10 },
          { cat: 'Utilities', desc: 'Converge Fiber', amt: 1500, day: 5 },
          { cat: 'Transport', desc: 'Easytrip/Autosweep Load', amt: 1500, day: 2 },
          { cat: 'Misc', desc: 'Netflix Sub', amt: 549, day: 14 }
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
        { cat: 'Food', choices: ['GrabFood Order', 'SM Supermarket', 'Puregold', 'Dinner with Friends', 'Starbucks Coffee'] },
        { cat: 'Transport', choices: ['Joyride/Angkas', 'GrabCar', 'Gas Station Full Tank', 'MRT/LRT Beep Load'] },
        { cat: 'Shopping', choices: ['Lazada Sale', 'Shopee Budol', 'Uniqlo Essentials'] },
        { cat: 'Entertainment', choices: ['Cinema', 'Mobile Legends Diamonds', 'Gym Membership'] }
      ];

      for (let i = 0; i < 600; i++) {
        await database.get('expenses').create((expense: any) => {
          const context = phContexts[Math.floor(Math.random() * phContexts.length)];
          expense.category = context.cat;
          const desc = context.choices[Math.floor(Math.random() * context.choices.length)];
          expense.description = desc;

          if (context.cat === 'Food') {
            expense.amount = Math.random() * 800 + 150; // PHP 150 to 950
          } else if (context.cat === 'Transport') {
            expense.amount = Math.random() * 500 + 50;  // PHP 50 to 550
          } else {
            expense.amount = Math.random() * 3000 + 200; // PHP 200 to 3200
          }

          expense._currency = 'PHP';
          expense.userId = userId;
          const rDate = getRandomDateInLast2Years();
          expense.createdAt = rDate;
          expense.updatedAt = rDate;
        });
      }

      // 5. Seed Goals (PH Goals)
      const mockGoals = [
        { name: 'Emergency Fund', target: 200000, current: 85000, months: 6, currency: 'PHP' },
        { name: 'Siargao Trip', target: 35000, current: 15000, months: 3, currency: 'PHP' },
        { name: 'New iPhone 16 Pro', target: 85000, current: 20000, months: 8, currency: 'PHP' },
        { name: 'House Downpayment', target: 1000000, current: 120000, months: 48, currency: 'PHP' }
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

      // 6. Portfolio Assets (Localized PH Portfolio)
      const mockPortfolio = [
        { name: 'Pag-IBIG MP2', symbol: 'MP2', type: 'cash', value: 1, invested: 150000, quantity: 150000, change: 0, currency: 'PHP' },
        { name: 'Maya Savings', symbol: 'MAYA', type: 'cash', value: 1, invested: 45000, quantity: 45000, change: 0, currency: 'PHP' },
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

    console.log('[Dev] Database successfully seeded with Filipino-context financial data for user:', userId);
    return true;
  } catch (error) {
    console.error('[Dev] Seeding failed:', error);
    return false;
  } finally {
    setSyncLock(false);
  }
}

