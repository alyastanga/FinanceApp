import database from '../database';

/**
 * Higher-level actions for managing budget allocations.
 * Ensures data-reactive updates to the 'budgets' table.
 */

export async function upsertBudget(category: string, amountLimit: number, userId: string = 'default-user') {
  const budgetCollection = database.get('budgets');
  
  await database.write(async () => {
    // Check for existing budget in this category
    const existing = await budgetCollection.query().fetch();
    const target = existing.find(b => (b as any).category === category);

    if (target) {
      // Update
      await target.update((record: any) => {
        record.amountLimit = amountLimit;
        record.updatedAt = Date.now();
      });
    } else {
      // Create
      await budgetCollection.create((record: any) => {
        record.category = category;
        record.amountLimit = amountLimit;
        record.userId = userId;
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
      });
    }
  });
}

export async function applyAIAllocation(suggestions: { category: string, amount_limit: number }[]) {
  // Simple strategy: we upsert each recommendation
  for (const item of suggestions) {
    await upsertBudget(item.category, item.amount_limit);
  }
}
