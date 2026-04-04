import { synchronize } from '@nozbe/watermelondb/sync';
import database from '../database';
import { supabase } from './supabase';

let isSyncing = false;

/**
 * Validates if a date is actually usable and not a Unix Epoch zero (1970-01-01) 
 * or related corrupted timestamp.
 */
function isValidDate(dateValue: any): boolean {
  if (!dateValue) return false;
  
  // Handle numeric epoch 0
  if (dateValue === 0) return false;

  const dateStr = dateValue.toString();
  
  // Catch 1970, 1969 (timezone offsets), and 0001 (default DB values)
  if (dateStr.startsWith('1970') || dateStr.startsWith('1969') || dateStr.startsWith('0001')) {
    return false;
  }

  // Catch leading zeros (e.g. '0000-00-00')
  if (dateStr.startsWith('0')) return false;

  return true;
}

export async function syncData() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    await synchronize({
      database,
      sendCreatedAsUpdated: true,
      pullChanges: async ({ lastPulledAt }) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session for sync');

        const lastTimestamp = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString();

        const fetchTableInfo = async (table: string) => {
          const res = await supabase.from(table).select('*').gt('updated_at', lastTimestamp);
          if (res.error && res.status === 404) {
            return { data: [], error: null };
          }
          return res;
        };

        const [incomeRes, expenseRes, goalRes, budgetRes] = await Promise.all([
          fetchTableInfo('incomes'),
          fetchTableInfo('expenses'),
          fetchTableInfo('goals'),
          fetchTableInfo('budgets'),
        ]);

        if (incomeRes.error) throw incomeRes.error;
        if (expenseRes.error) throw expenseRes.error;
        if (goalRes.error) throw goalRes.error;
        if (budgetRes.error) throw budgetRes.error;

        const patchLegacyDates = (data: any[]) => {
          return (data || []).map(d => {
            const rawCreatedAt = d.created_at;
            const rawUpdatedAt = d.updated_at;
            const nowIso = new Date().toISOString();

            return {
              ...d,
              id: d.id.toString(),
              created_at: isValidDate(rawCreatedAt) ? rawCreatedAt : (isValidDate(rawUpdatedAt) ? rawUpdatedAt : nowIso),
              updated_at: isValidDate(rawUpdatedAt) ? rawUpdatedAt : nowIso
            };
          });
        };

        const changes = {
          incomes: {
            created: [] as any[],
            updated: patchLegacyDates(incomeRes.data || []),
            deleted: [] as string[],
          },
          expenses: {
            created: [] as any[],
            updated: patchLegacyDates(expenseRes.data || []),
            deleted: [] as string[],
          },
          goals: {
            created: [] as any[],
            updated: patchLegacyDates(goalRes.data || []),
            deleted: [] as string[],
          },
          budgets: {
            created: [] as any[],
            updated: patchLegacyDates(budgetRes.data || []),
            deleted: [] as string[],
          },
        };

        return { changes, timestamp: Date.now() };
      },
      pushChanges: async ({ changes }) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session for push');

        const sanitizeRecord = (record: any) => {
          const sanitized = { ...record };
          const dateFields = ['created_at', 'updated_at', 'target_completion_date'];
          const nowIso = new Date().toISOString();

          dateFields.forEach(field => {
            let value = sanitized[field];
            if (value) {
              if (typeof value === 'number') {
                value = new Date(value).toISOString();
              } else if (typeof value === 'string' && /^\d{13}$/.test(value)) {
                value = new Date(parseInt(value, 10)).toISOString();
              }

              // Apply unified invalid date blocking
              if (!isValidDate(value)) {
                value = nowIso;
              }
              sanitized[field] = value;
            }
          });
          delete sanitized._status;
          delete sanitized._changed;
          return sanitized;
        };

        const pushTable = async (tableName: string, tableChanges: any) => {
          const { created, updated } = tableChanges;
          const records = [...created, ...updated];
          if (records.length === 0) return;

          const allChanges = records.map(record => ({
            ...sanitizeRecord(record),
            user_id: session.user.id,
            updated_at: new Date().toISOString(),
          }));

          const { error } = await supabase.from(tableName).upsert(allChanges);
          if (error) throw error;
        };

        await Promise.all([
          pushTable('incomes', (changes as any).incomes),
          pushTable('expenses', (changes as any).expenses),
          pushTable('goals', (changes as any).goals),
          pushTable('budgets', (changes as any).budgets),
        ]);
      },
    });
  } finally {
    isSyncing = false;
  }
}
