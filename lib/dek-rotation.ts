import * as SecureStore from 'expo-secure-store';
import database from '../database';
import { deriveKey, deriveKeyFromSeedPhrase, encryptPayload, generateSalt, sha256, zeroBuffer } from './crypto-service';
import {
  generateDEK,
  getActiveDEK,
  getDeviceId,
  RotationProgress,
  RotationStatus,
  SECURE_KEY_ROTATION_CHECKPOINT,
  setActiveDEK,
  storeLocalDEK,
  uploadCloudDEK
} from './key-manager';
import { supabase } from './supabase';
import { setSyncLock } from './sync';

export async function startRotation(passphrase: string, seedPhrase: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No active session for rotation');

  setSyncLock(true);

  try {
    const newSalt = generateSalt();
    const newDek = generateDEK();

    const localKey = await deriveKey(passphrase, newSalt);
    const recoveryKey = await deriveKeyFromSeedPhrase(seedPhrase, newSalt);
    const phraseHash = await sha256(seedPhrase);

    const saltBase64 = Buffer.from(newSalt).toString('base64');
    await storeLocalDEK(newDek, localKey, saltBase64);
    await uploadCloudDEK(newDek, recoveryKey, phraseHash, saltBase64);

    setActiveDEK(newDek);

    zeroBuffer(localKey);
    zeroBuffer(recoveryKey);
    zeroBuffer(newSalt);

    // Initialize checkpoint
    const tables = ['incomes', 'expenses', 'goals', 'budgets', 'portfolio'];
    let totalRecords = 0;

    for (const table of tables) {
      const count = await database.get(table).query().fetchCount();
      totalRecords += count;
    }

    const checkpoint = {
      tablesPending: tables,
      currentTableOffset: 0,
      total: totalRecords,
      completed: 0,
      status: 'in_progress' as RotationStatus,
    };

    await SecureStore.setItemAsync(SECURE_KEY_ROTATION_CHECKPOINT, JSON.stringify(checkpoint));

  } catch (err) {
    setSyncLock(false);
    throw err;
  }
}

export async function resumeRotation(onProgress?: (p: RotationProgress) => void): Promise<void> {
  const rawCheckpoint = await SecureStore.getItemAsync(SECURE_KEY_ROTATION_CHECKPOINT);
  if (!rawCheckpoint) return; // Nothing to resume

  setSyncLock(true);
  const checkpoint = JSON.parse(rawCheckpoint);
  const dek = getActiveDEK();
  const deviceId = await getDeviceId();
  const BATCH_SIZE = 50;

  try {
    while (checkpoint.tablesPending.length > 0) {
      const table = checkpoint.tablesPending[0];
      const collection = database.get(table);

      // Fetch in batches using WatermelonDB standard queries
      // Note: WatermelonDB doesn't have offset/limit directly in its fluent API easily without raw SQL,
      // but we can just fetch all and slice, or we can use raw queries. 
      // For simplicity on mobile with <10k records, we fetch all and process the slice.
      const allRecords = await collection.query().fetch();

      while (checkpoint.currentTableOffset < allRecords.length) {
        const batch = allRecords.slice(checkpoint.currentTableOffset, checkpoint.currentTableOffset + BATCH_SIZE);

        const encryptedChanges = [];
        for (const record of batch) {
          // Serialize to JSON (excluding internal Watermelon fields)
          const recordData = record._raw;
          const { id, _status, _changed, created_at, updated_at, ...sensitivePayload } = recordData as any;

          const { blob, iv } = await encryptPayload(sensitivePayload, dek);

          encryptedChanges.push({
            id,
            user_id: (recordData as any).user_id,
            created_at: new Date(created_at).toISOString(),
            updated_at: new Date().toISOString(), // Bump updated_at so other devices pull this!
            payload_blob: blob,
            payload_iv: iv,
            device_id: deviceId
          });
        }

        // Push directly to Supabase
        const { error } = await supabase.from(table).upsert(encryptedChanges);
        if (error) throw new Error(`[Rotation] Supabase upsert failed: ${error.message}`);

        // Update checkpoint
        checkpoint.currentTableOffset += batch.length;
        checkpoint.completed += batch.length;
        await SecureStore.setItemAsync(SECURE_KEY_ROTATION_CHECKPOINT, JSON.stringify(checkpoint));

        if (onProgress) {
          onProgress({ total: checkpoint.total, completed: checkpoint.completed, status: 'in_progress' });
        }
      }

      // Move to next table
      checkpoint.tablesPending.shift();
      checkpoint.currentTableOffset = 0;
      await SecureStore.setItemAsync(SECURE_KEY_ROTATION_CHECKPOINT, JSON.stringify(checkpoint));
    }

    if (onProgress) {
      onProgress({ total: checkpoint.total, completed: checkpoint.total, status: 'completed' });
    }

    // Clear checkpoint and unlock sync
    await SecureStore.deleteItemAsync(SECURE_KEY_ROTATION_CHECKPOINT);
    setSyncLock(false);

  } catch (err) {
    // Leave lock on if it failed so we don't accidentally sync partial rotations
    if (onProgress) {
      onProgress({ total: checkpoint.total, completed: checkpoint.completed, status: 'interrupted' });
    }
    throw err;
  }
}
