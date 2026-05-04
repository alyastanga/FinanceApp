import database from '../database';
import { supabase } from './supabase';
import { wipeAllE2EEKeys } from './key-manager';
import { setSyncLock } from './sync';

/**
 * Unified data management utility for destructive operations.
 */

/**
 * Wipes only local SQLite data and keys.
 */
export async function clearLocalData() {
  setSyncLock(true);
  try {
    // 1. Wipe SQLite
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    // 2. Wipe Secure Keys
    await wipeAllE2EEKeys();
    console.log('[DataManagement] Local data wiped successfully.');
    return true;
  } catch (error) {
    console.error('[DataManagement] Local wipe failed:', error);
    return false;
  } finally {
    setSyncLock(false);
  }
}

/**
 * Wipes only cloud Supabase data and key backups.
 */
export async function clearCloudData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session for cloud wipe');

    const userId = session.user.id;
    const tables = ['incomes', 'expenses', 'goals', 'budgets', 'portfolio', 'device_keys'];

    setSyncLock(true);
    
    // Attempt deletion with both common column naming conventions to ensure success
    await Promise.all(tables.flatMap(table => [
      supabase.from(table).delete().eq('user_id', userId),
      supabase.from(table).delete().eq('userId', userId)
    ]));
    
    console.log('[DataManagement] Cloud data wiped successfully.');
    return true;
  } catch (error) {
    console.error('[DataManagement] Cloud wipe failed:', error);
    return false;
  } finally {
    setSyncLock(false);
  }
}

/**
 * The Nuclear Option: Wipes both local and cloud data.
 */
export async function clearAllUserData() {
  setSyncLock(true);
  try {
    // 1. Wipe Cloud
    await clearCloudData();
    // 2. Wipe Local
    await clearLocalData();
    console.log('[DataManagement] Global data wipe complete.');
    return true;
  } catch (error) {
    console.error('[DataManagement] Global wipe failed:', error);
    return false;
  } finally {
    setSyncLock(false);
  }
}
