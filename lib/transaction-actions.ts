import database from '../database';
import { BudgetMonitor } from './budget-monitor';

export interface TransactionData {
  amount: number;
  category: string;
  description?: string;
  currency?: string;
  externalId?: string;
  createdAt?: number;
  userId?: string;
}

export async function addIncome(data: TransactionData) {
  const incomes = database.get('incomes');
  await database.write(async () => {
    await incomes.create((record: any) => {
      record.amount = data.amount;
      record.category = data.category;
      record.description = data.description;
      record.userId = data.userId || 'default-user';
      record._currency = data.currency || 'PHP';
      record.externalId = data.externalId;
      record.createdAt = data.createdAt || Date.now();
      record.updatedAt = Date.now();
    });
  });
}

export async function addExpense(data: TransactionData) {
  const expenses = database.get('expenses');
  await database.write(async () => {
    await expenses.create((record: any) => {
      record.amount = data.amount;
      record.category = data.category;
      record.description = data.description;
      record.userId = data.userId || 'default-user';
      record._currency = data.currency || 'PHP';
      record.externalId = data.externalId;
      record.createdAt = data.createdAt || Date.now();
      record.updatedAt = Date.now();
    });
  });

  // Check budget thresholds after adding expense
  await BudgetMonitor.checkBudgetThresholds(data.category);
}
