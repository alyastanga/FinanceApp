const normalizeDate = (e) => {
  if (!e || (!e.createdAt && !e._createdAt)) return 0;
  return new Date(e.createdAt || e._createdAt).getTime();
};

const calculateBudgetInsights = (
  incomes,
  expenses,
  goals,
  budgets = [],
  convertFn = (v) => v,
  baseCurrency = 'PHP'
) => {
  const now = new Date('2026-05-15'); // Assume mid-month for testing
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);

  // 1. Calculate Monthly Income 
  const currentMonthIncomes = incomes.filter(i => {
    const t = normalizeDate(i);
    return t >= new Date(currentYear, currentMonth, 1).getTime();
  });
  const actualCurrentMonthIncome = currentMonthIncomes.reduce((sum, i) => sum + convertFn(i.amount || 0), 0);

  // 90-day average
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);
  const historicalIncomes = incomes.filter(i => normalizeDate(i) >= ninetyDaysAgo.getTime());
  const sum90Days = historicalIncomes.reduce((sum, i) => sum + convertFn(i.amount || 0), 0);
  const avgMonthlyIncome = sum90Days / 3;
  const projectedIncome = Math.max(actualCurrentMonthIncome, avgMonthlyIncome);

  // 2. Fixed Monthly Expenses 
  const monthExpenses = expenses.filter(e => {
    const t = normalizeDate(e);
    const d = new Date(t);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const fixedCategories = ['Rent', 'Utilities', 'Insurance'].map(c => c.toLowerCase());

  const fixedBudgetTotal = budgets
    .filter(b => fixedCategories.includes((b.category || '').toLowerCase()))
    .reduce((sum, b) => sum + convertFn(b.amountLimit || 0), 0);

  const actualFixedSpent = monthExpenses
    .filter(e => fixedCategories.includes((e.category || '').toLowerCase()))
    .reduce((sum, e) => sum + convertFn(e.amount || 0), 0);

  const monthlyFixed = Math.max(fixedBudgetTotal, actualFixedSpent);

  // 3. Goals
  let totalGoalContributionRequired = 0;
  goals.forEach(g => {
    const targetAmt = g.targetAmount || 0;
    const currentAmt = g.currentAmount || 0;
    const remaining = targetAmt - currentAmt;
    if (remaining <= 0) return;

    const targetDate = new Date(g.targetCompletionDate);
    const monthsDiff = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
    const monthlyNeeded = remaining / Math.max(1, monthsDiff);
    totalGoalContributionRequired += monthlyNeeded;
  });

  // 4. Safe to Spend
  const variableSpent = monthExpenses
    .filter(e => !fixedCategories.includes((e.category || '').toLowerCase()))
    .reduce((sum, e) => sum + convertFn(e.amount || 0), 0);

  const netAvailable = projectedIncome - monthlyFixed - totalGoalContributionRequired - variableSpent;
  const dailySafeToSpend = netAvailable / remainingDays;

  return {
    dailySafeToSpend: Math.max(0, dailySafeToSpend),
    projectedIncome,
    actualCurrentMonthIncome,
    monthlyFixed,
    totalGoalContributionRequired,
    variableSpent,
    remainingDays,
    netAvailable
  };
};

// TEST CASE 1: Normal spending
const test1 = calculateBudgetInsights(
  [{ amount: 100000, createdAt: '2026-05-01' }], // Income
  [
    { amount: 5000, category: 'Rent', createdAt: '2026-05-01' }, // Fixed paid
    { amount: 2000, category: 'Food', createdAt: '2026-05-10' }  // Variable spent
  ],
  [], // No goals
  [{ category: 'Rent', amountLimit: 5000 }, { category: 'Utilities', amountLimit: 2000 }] // Budgets
);
console.log('Test 1:', test1);
/*
Expected:
projectedIncome: 100000
monthlyFixed: max(7000 budget, 5000 actual) = 7000
variableSpent: 2000
remainingDays: 16 (May 15 to 31 is 17 days: 31 - 15 + 1)
netAvailable: 100000 - 7000 - 0 - 2000 = 91000
daily: 91000 / 17 = 5352.94
*/

// TEST CASE 2: Overspent fixed
const test2 = calculateBudgetInsights(
  [{ amount: 100000, createdAt: '2026-05-01' }],
  [
    { amount: 8000, category: 'Rent', createdAt: '2026-05-01' } // Budget was 5000
  ],
  [],
  [{ category: 'Rent', amountLimit: 5000 }]
);
console.log('Test 2:', test2);
/*
Expected:
monthlyFixed: max(5000 budget, 8000 actual) = 8000
netAvailable: 100000 - 8000 = 92000
*/

// TEST CASE 3: Goal subtraction
const test3 = calculateBudgetInsights(
  [{ amount: 100000, createdAt: '2026-05-01' }],
  [],
  [{ name: 'Car', targetAmount: 100000, currentAmount: 0, targetCompletionDate: '2026-12-31' }], // ~7 months away
  []
);
console.log('Test 3:', test3);
/*
monthsDiff: (2026-2026)*12 + (11-4) = 7
monthlyNeeded: 100000 / 7 = 14285
netAvailable: 100000 - 14285 = 85715
*/
