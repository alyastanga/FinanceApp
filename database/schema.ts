import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
  version: 11,
  tables: [
    tableSchema({
      name: 'incomes',
      columns: [
        { name: 'amount', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'currency', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'expenses',
      columns: [
        { name: 'amount', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'currency', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'goals',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'target_amount', type: 'number' },
        { name: 'current_amount', type: 'number' },
        { name: 'target_completion_date', type: 'number' },
        { name: 'sync_to_calendar', type: 'boolean' },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'currency', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'budgets',
      columns: [
        { name: 'category', type: 'string' },
        { name: 'amount_limit', type: 'number' },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'currency', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'portfolio',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'asset_type', type: 'string' },
        { name: 'symbol', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'invested_amount', type: 'number' },
        { name: 'value', type: 'number' },
        { name: 'change_24h', type: 'number' },
        { name: 'currency', type: 'string' },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ]
})

