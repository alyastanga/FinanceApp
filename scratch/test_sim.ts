
import { simulatePurchaseImpact } from '../lib/simulation-engine';

// Mock data
const baseCurrency = 'USD';
const convertFn = (val: number) => val;

const incomes = [{ amount: 5000, createdAt: new Date().getTime() }];
const expenses = [{ amount: 4900, category: 'Rent', createdAt: new Date().getTime() }]; // $100 surplus
const goals = [
  {
    name: 'New Car',
    targetAmount: 1000,
    currentAmount: 0,
    targetCompletionDate: new Date(new Date().getFullYear(), new Date().getMonth() + 10, 1).getTime(), // 10 months from now
    currency: 'USD'
  }
];

// In this case, monthlyNeeded = 1000 / 10 = $100/mo.
// BUT actual surplus is $100/mo. So user is just barely on track.
// If user spends $500:
// current logic: newRemaining = 1500. newMonths = 1500 / 100 = 15 months. Delay = 5 months.
// This is correct IF they maintain $100/mo.

// WHAT IF surplus is $10/mo?
const expensesLowSurplus = [{ amount: 4990, category: 'Rent', createdAt: new Date().getTime() }]; // $10 surplus
// monthlyNeeded is STILL $100/mo (based on target date).
// purchase $500.
// current logic: newRemaining = 1500. newMonths = 1500 / 100 = 15 months. Delay = 5 months.
// ACTUAL LOGIC: With $10/mo surplus, it takes 100 months to save $1000.
// Spending $500 means they need to save $1500. At $10/mo, that takes 150 months.
// Real delay is 50 months, but simulator says 5 months!

const result = simulatePurchaseImpact(500, incomes, expensesLowSurplus, goals, [], convertFn, baseCurrency);
console.log('Result for $10 surplus:', JSON.stringify(result, null, 2));
