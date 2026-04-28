import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: 'portfolio',
          columns: [
            { name: 'currency', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 10,
      steps: [
        addColumns({
          table: 'incomes',
          columns: [{ name: 'currency', type: 'string', isOptional: true }],
        }),
        addColumns({
          table: 'expenses',
          columns: [{ name: 'currency', type: 'string', isOptional: true }],
        }),
        addColumns({
          table: 'goals',
          columns: [{ name: 'currency', type: 'string', isOptional: true }],
        }),
        addColumns({
          table: 'budgets',
          columns: [{ name: 'currency', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 11,
      steps: [
        addColumns({
          table: 'incomes',
          columns: [
            { name: 'category', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
          ],
        }),
        addColumns({
          table: 'expenses',
          columns: [
            { name: 'description', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 12,
      steps: [
        addColumns({
          table: 'incomes',
          columns: [{ name: 'external_id', type: 'string', isOptional: true, isIndexed: true }],
        }),
        addColumns({
          table: 'expenses',
          columns: [{ name: 'external_id', type: 'string', isOptional: true, isIndexed: true }],
        }),
      ],
    },
  ],
});
