import { synchronize } from '@nozbe/watermelondb/sync';
import database from '../database';
import { decryptPayload, encryptPayload } from './crypto-service';
import { getActiveDEK, getDeviceId } from './key-manager';
import { supabase } from './supabase';

let isSyncing = false;
let isRotating = false;

export function setSyncLock(locked: boolean) {
  isRotating = locked;
}

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
  if (isRotating) {
    console.warn('[Sync] Sync aborted: Database maintenance (seed or rotation) is in progress.');
    return;
  }

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
          const res = await supabase
            .from(table)
            .select('*')
            .eq('user_id', session.user.id)
            .gt('updated_at', lastTimestamp);

          if (res.error && res.status === 404) {
            return { data: [], error: null };
          }
          return res;
        };

        const [incomeRes, expenseRes, goalRes, budgetRes, portfolioRes] = await Promise.all([
          fetchTableInfo('incomes'),
          fetchTableInfo('expenses'),
          fetchTableInfo('goals'),
          fetchTableInfo('budgets'),
          fetchTableInfo('portfolio'),
        ]);

        if (incomeRes.error) throw incomeRes.error;
        if (expenseRes.error) throw expenseRes.error;
        if (goalRes.error) throw goalRes.error;
        if (budgetRes.error) throw budgetRes.error;
        if (portfolioRes.error) throw portfolioRes.error;

        const dek = getActiveDEK(); // Throws if locked

        // Helper to decrypt Supabase rows into WatermelonDB-compatible plaintext in parallel
        const decryptRows = async (rows: any[]) => {
          return Promise.all(rows.map(async (row) => {
            if (row.payload_blob && row.payload_iv) {
              try {
                const plaintext = await decryptPayload(row.payload_blob, row.payload_iv, dek);
                return { ...row, ...plaintext };
              } catch (e) {
                console.warn('[Sync] Failed to decrypt row', row.id, e);
                return row;
              }
            }
            return row;
          }));
        };

        const patchLegacyDates = (data: any[]) => {
          return (data || []).map(d => {
            const rawCreatedAt = d.created_at;
            const rawUpdatedAt = d.updated_at;
            const nowIso = new Date().toISOString();

            // Cloud Scrubber: Remove any internal WatermelonDB or Supabase fields 
            // that might have leaked into the cloud storage.
            const cleaned = { ...d };
            delete cleaned._status;
            delete cleaned._changed;
            delete cleaned.payload_blob;
            delete cleaned.payload_iv;
            delete cleaned.device_id;

            return {
              ...cleaned,
              id: d.id.toString(),
              createdAt: new Date(isValidDate(rawCreatedAt) ? rawCreatedAt : (isValidDate(rawUpdatedAt) ? rawUpdatedAt : nowIso)),
              updatedAt: new Date(isValidDate(rawUpdatedAt) ? rawUpdatedAt : nowIso)
            };
          });
        };

        const processTable = async (res: any) => {
          const rawRows = res.data || [];
          const decryptedRows = await decryptRows(rawRows);
          const patchedRows = patchLegacyDates(decryptedRows);

          // If this is the first sync (lastPulledAt is null), treat everything as created locally
          if (!lastPulledAt) {
            return {
              created: patchedRows,
              updated: [],
              deleted: [],
            };
          }

          // Otherwise, WatermelonDB's default categorization (all in updated) works 
          // because it will match existing IDs or create if missing.
          return {
            created: [],
            updated: patchedRows,
            deleted: [],
          };
        };

        const changes = {
          incomes: await processTable(incomeRes),
          expenses: await processTable(expenseRes),
          goals: await processTable(goalRes),
          budgets: await processTable(budgetRes),
          portfolio: await processTable(portfolioRes),
        };

        return { changes, timestamp: Date.now() };
      },
      pushChanges: async ({ changes }) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session for push');

        const dek = getActiveDEK();
        const deviceId = await getDeviceId();

        const sanitizeRecord = (record: any) => {
          const sanitized = { ...record };
          const dateFields = ['createdAt', 'updatedAt', 'targetCompletionDate'];
          const nowIso = new Date().toISOString();

          dateFields.forEach(field => {
            let value = sanitized[field];
            if (value !== undefined && value !== null) {
              // Convert WatermelonDB date objects or numeric timestamps to ISO
              if (value instanceof Date) {
                value = value.toISOString();
              } else if (typeof value === 'number') {
                value = new Date(value).toISOString();
              } else if (typeof value === 'string' && /^\d{13}$/.test(value)) {
                value = new Date(parseInt(value, 10)).toISOString();
              }

              // Apply unified invalid date blocking
              if (!isValidDate(value)) {
                value = nowIso;
              }
              sanitized[field] = value;
            } else if (field !== 'targetCompletionDate') {
              sanitized[field] = nowIso;
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
          }));

          // E2EE Encryption Step (Parallelized for stability and performance)
          const encryptedChanges = await Promise.all(allChanges.map(async (row) => {
            const { id, user_id, createdAt, updatedAt, ...sensitivePayload } = row;
            const { blob, iv } = await encryptPayload(sensitivePayload, dek);
            
            return {
              id,
              user_id,
              created_at: new Date(createdAt || Date.now()).toISOString(),
              updated_at: new Date(updatedAt || Date.now()).toISOString(),
              payload_blob: blob,
              payload_iv: iv,
              device_id: deviceId
            };
          }));

          const { error } = await supabase.from(tableName).upsert(encryptedChanges);
          if (error) throw error;
        };

        await Promise.all([
          pushTable('incomes', (changes as any).incomes),
          pushTable('expenses', (changes as any).expenses),
          pushTable('goals', (changes as any).goals),
          pushTable('budgets', (changes as any).budgets),
          pushTable('portfolio', (changes as any).portfolio),
        ]);
      },
    });
  } finally {
    isSyncing = false;
  }
}
