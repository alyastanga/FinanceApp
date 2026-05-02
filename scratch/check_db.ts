
import database from './database';

async function checkData() {
  const incomes = await database.get('incomes').query().fetch();
  const expenses = await database.get('expenses').query().fetch();
  const budgets = await database.get('budgets').query().fetch();
  const portfolio = await database.get('portfolio').query().fetch();
  const goals = await database.get('goals').query().fetch();

  console.log('--- Database Stats ---');
  console.log('Incomes:', incomes.length);
  console.log('Expenses:', expenses.length);
  console.log('Budgets:', budgets.length);
  console.log('Portfolio:', portfolio.length);
  console.log('Goals:', goals.length);

  if (incomes.length > 0) {
    console.log('First Income:', JSON.stringify({
      amount: incomes[0].amount,
      createdAt: incomes[0].createdAt,
      currency: incomes[0].currency
    }));
  }
  if (expenses.length > 0) {
    console.log('First Expense:', JSON.stringify({
      amount: expenses[0].amount,
      createdAt: expenses[0].createdAt,
      currency: expenses[0].currency
    }));
  }
}

checkData().catch(console.error);
