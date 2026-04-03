import database from '../database';
import { supabase } from './supabase';

/**
 * Unified data management utility for destructive operations.
 */
export async function clearAllUserData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // 1. Wipe Local WatermelonDB
    await database.write(async () => {
      const tables = ['incomes', 'expenses', 'goals', 'budgets', 'portfolio'];
      
      for (const tableName of tables) {
        const records = await database.get(tableName).query().fetch();
        for (const record of records) {
          await record.markAsDeleted();
          await record.destroyPermanently();
        }
      }
    });

    // 2. Wipe Cloud Supabase (if session exists)
    if (userId) {
      const tables = ['incomes', 'expenses', 'goals', 'budgets', 'portfolio'];
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', userId);
        
        if (error) {
          console.error(`[Data Management] Failed to clear cloud table ${table}:`, error.message);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[Data Management] Fatal error during data wipe:', error);
    return false;
  }
}
