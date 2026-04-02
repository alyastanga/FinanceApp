import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
  version: 2, // Bumped version for goals table
  tables: [
    tableSchema({
      name: 'incomes',
      columns: [
        { name: 'amount', type: 'number' },
        { name: 'source', type: 'string' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'expenses',
      columns: [
        { name: 'amount', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'goals',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'target_amount', type: 'number' },
        { name: 'saved_amount', type: 'number' },
        { name: 'target_date', type: 'number' },
        { name: 'created_at', type: 'number' },
      ]
    }),
  ]
})
