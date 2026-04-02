import { synchronize } from '@nozbe/watermelondb/sync'
import database from '../database'
import { supabase } from './supabase'

export async function syncDatabase() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      // 1. Fetch data from Supabase since lastPulledAt
      const timestamp = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString()
      
      console.log(`Pulling changes since ${timestamp}...`)

      // We only care about records that belong to the current authenticated user.
      // RLS (Row Level Security) handles this securely on the server, but we can also explicitly query.
      
      // Pull Incomes
      const { data: incomes, error: incomesError } = await supabase
        .from('incomes')
        .select('*')
        .gt('updated_at', timestamp)

      if (incomesError) throw new Error(incomesError.message)

      // Pull Expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gt('updated_at', timestamp)

      if (expensesError) throw new Error(expensesError.message)

      // 2. Format the data for WatermelonDB
      const changes = {
        incomes: {
          created: [],
          updated: incomes.map(row => ({
            id: row.id,
            amount: parseFloat(row.amount),
            source: row.source,
            created_at: new Date(row.created_at).getTime()
          })),
          deleted: [], // Handling hard deletes requires a separate soft-delete or log table
        },
        expenses: {
          created: [],
          updated: expenses.map(row => ({
            id: row.id,
            amount: parseFloat(row.amount),
            category: row.category,
            created_at: new Date(row.created_at).getTime()
          })),
          deleted: [],
        }
      }

      return { changes, timestamp: Date.now() }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      console.log('Pushing local changes to Supabase...', changes)
      
      const session = await (await supabase.auth.getSession()).data.session
      if (!session?.user) {
        throw new Error('Cannot push changes: User is not authenticated')
      }
      
      const userId = session.user.id

      // Helper to process table changes
      const pushTable = async (tableName: string, tableChanges: any) => {
        const { created, updated, deleted } = tableChanges

        // Insert new records
        if (created.length > 0) {
          const formattedCreated = created.map((row: any) => ({
            id: row.id,
            user_id: userId,
            amount: row.amount,
            [tableName === 'incomes' ? 'source' : 'category']: tableName === 'incomes' ? row.source : row.category,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: new Date().toISOString()
          }))
          const { error } = await supabase.from(tableName).insert(formattedCreated)
          if (error) throw new Error(`Push Insert Error (${tableName}): ${error.message}`)
        }

        // Update existing records
        if (updated.length > 0) {
          const formattedUpdated = updated.map((row: any) => ({
            id: row.id,
            user_id: userId,
            amount: row.amount,
            [tableName === 'incomes' ? 'source' : 'category']: tableName === 'incomes' ? row.source : row.category,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: new Date().toISOString()
          }))
          const { error } = await supabase.from(tableName).upsert(formattedUpdated)
          if (error) throw new Error(`Push Update Error (${tableName}): ${error.message}`)
        }

        // Delete records
        if (deleted.length > 0) {
          const { error } = await supabase.from(tableName).delete().in('id', deleted)
          if (error) throw new Error(`Push Delete Error (${tableName}): ${error.message}`)
        }
      }

      // Process Incomes and Expenses
      const c = changes as any;
      if (c.incomes) await pushTable('incomes', c.incomes)
      if (c.expenses) await pushTable('expenses', c.expenses)
    },
    migrationsEnabledAtVersion: 1,
  })
}
