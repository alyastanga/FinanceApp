import database from '../database';

const CATEGORIES = ['Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Misc'];

function randomDateInLastMonth() {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));
  return date;
}

export async function seedDatabase() {
  try {
    await database.write(async () => {
      // Note: WatermelonDB doesn't have a simple 'truncate' or 'delete all' that works easily across iOS/Android/Web
      // without custom raw queries. The safest way for development is to destroy the DB or just append data.
      // Since this is a dev script, we will just fetch all and destroy them to simulate a wipe.
      const incomes = await database.get('incomes').query().fetch();
      const expenses = await database.get('expenses').query().fetch();
      const goals = await database.get('goals').query().fetch();

      const allRecords = [...incomes, ...expenses, ...goals];
      for (const record of allRecords) {
        await record.markAsDeleted();
        await record.destroyPermanently();
      }

      // 1. Seed Incomes
      await database.get('incomes').create((income: any) => {
        income.amount = 5000;
        income.source = 'Main Salary';
        income.createdAt = randomDateInLastMonth();
      });
      await database.get('incomes').create((income: any) => {
        income.amount = 500;
        income.source = 'Side Hustle';
        income.createdAt = randomDateInLastMonth();
      });

      // 2. Seed Goals
      await database.get('goals').create((goal: any) => {
        goal.title = 'Japan Trip';
        goal.targetAmount = 2000;
        goal.savedAmount = 400;
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + 6);
        goal.targetDate = targetDate;
        goal.createdAt = new Date();
      });
      await database.get('goals').create((goal: any) => {
        goal.title = 'Emergency Fund';
        goal.targetAmount = 10000;
        goal.savedAmount = 2500;
        const targetDate = new Date();
        targetDate.setFullYear(targetDate.getFullYear() + 1);
        goal.targetDate = targetDate;
        goal.createdAt = new Date();
      });

      // 3. Seed Expenses (approx 20 expenses)
      for (let i = 0; i < 20; i++) {
        await database.get('expenses').create((expense: any) => {
          expense.amount = Math.floor(Math.random() * 80) + 10; // $10 - $90
          expense.category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
          expense.createdAt = randomDateInLastMonth();
        });
      }
      
      // Rent
      await database.get('expenses').create((expense: any) => {
        expense.amount = 1200;
        expense.category = 'Housing';
        expense.createdAt = randomDateInLastMonth();
      });
    });

    console.log('[Dev] Database successfully seeded with mock data.');
    return true;
  } catch (error) {
    console.error('[Dev] Seeding failed:', error);
    return false;
  }
}
