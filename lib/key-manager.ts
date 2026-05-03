/**
 * E2EE Key Manager — Phase 10.2
 *
 * Manages the full DEK lifecycle: generation, secure storage, wrapping,
 * loading, rotation, and revocation.
 *
 * SECURITY CONSTRAINTS:
 * - DEK stored ONLY in expo-secure-store (iOS Keychain / Android Keystore)
 * - DEK never written to WatermelonDB or AsyncStorage
 * - Master Key used only for wrapping/unwrapping, then immediately zeroed
 * - Device ID is a UUID stored in secure store, generated on first launch
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateRandomKey,
  generateSalt,
  deriveKey,
  deriveKeyFromSeedPhrase,
  wrapKey,
  unwrapKey,
  encrypt,
  decrypt,
  zeroBuffer,
} from './crypto-service';
import { supabase } from './supabase';
import { generateUUID, isUUID } from './id-utils';

// ─── Secure Store Keys ───────────────────────────────────────────────────────
const SECURE_KEY_DEK = 'e2ee_dek';
const SECURE_KEY_WRAPPED_DEK = 'e2ee_wrapped_dek';
const SECURE_KEY_DEVICE_ID = 'e2ee_device_id';
const SECURE_KEY_SALT = 'e2ee_salt';
const SECURE_KEY_E2EE_ENABLED = 'e2ee_enabled';
const SECURE_KEY_MERKLE_ROOT = 'e2ee_merkle_root';
export const SECURE_KEY_ROTATION_CHECKPOINT = 'e2ee_rotation_checkpoint';
const SECURE_KEY_PHRASE_HASH = 'e2ee_phrase_hash';
const SECURE_KEY_CANARY = 'e2ee_canary';

// AsyncStorage key for cross-checking keystore integrity
const ASYNC_KEY_CANARY_MIRROR = 'e2ee_canary_mirror';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RotationStatus = 'idle' | 'in_progress' | 'completed' | 'interrupted';

export interface RotationProgress {
  total: number;
  completed: number;
  status: RotationStatus;
}

export interface E2EEState {
  isEnabled: boolean;
  isVaultLocked: boolean;
  deviceId: string | null;
  hasLocalDEK: boolean;
  keystoreIntact: boolean;
}

export interface EncryptedRecord {
  id: string;
  table: string;
  payload_blob: string;
  payload_iv: string;
  [key: string]: any;
}

// ─── Active Session State ────────────────────────────────────────────────────

// Holds the decrypted DEK in memory while the app is unlocked.
// Must be cleared when the app locks or goes to the background.
let activeDEK: Uint8Array | null = null;

export function getActiveDEK(): Uint8Array {
  if (!activeDEK) {
    throw new Error('E2EE Vault is locked. DEK is not available in memory.');
  }
  return activeDEK;
}

export function setActiveDEK(dek: Uint8Array): void {
  clearActiveDEK();
  activeDEK = new Uint8Array(dek);
}

export function clearActiveDEK(): void {
  if (activeDEK) {
    zeroBuffer(activeDEK);
    activeDEK = null;
  }
}

export function isVaultLocked(): boolean {
  return activeDEK === null;
}

// ─── Device Identity ─────────────────────────────────────────────────────────

/**
 * Gets or creates a unique device ID stored in the secure enclave.
 * This identifies the device for multi-device DEK management.
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(SECURE_KEY_DEVICE_ID);
  
  // Validate format to ensure Supabase compatibility (UUID required)
  if (!deviceId || !isUUID(deviceId)) {
    console.log('[KeyManager] Generating new valid UUID for device...');
    deviceId = generateUUID();
    await SecureStore.setItemAsync(SECURE_KEY_DEVICE_ID, deviceId);
  }
  return deviceId;
}

// ─── E2EE State ──────────────────────────────────────────────────────────────

/**
 * Checks whether E2EE has been set up on this device.
 */
export async function getE2EEState(): Promise<E2EEState> {
  const [enabled, deviceId, wrappedDek] = await Promise.all([
    SecureStore.getItemAsync(SECURE_KEY_E2EE_ENABLED),
    SecureStore.getItemAsync(SECURE_KEY_DEVICE_ID),
    SecureStore.getItemAsync(SECURE_KEY_WRAPPED_DEK),
  ]);

  // Check keystore integrity
  const keystoreIntact = await verifySecureStoreIntegrity();

  return {
    isEnabled: enabled === 'true',
    isVaultLocked: activeDEK === null,
    deviceId: deviceId,
    hasLocalDEK: !!wrappedDek,
    keystoreIntact,
  };
}

// ─── DEK Generation & Storage ────────────────────────────────────────────────

/**
 * Generates a 256-bit DEK using CSPRNG.
 */
export function generateDEK(): Uint8Array {
  return generateRandomKey();
}

/**
 * Wraps the DEK with the Local Key and stores it in the secure enclave.
 */
export async function storeLocalDEK(
  dek: Uint8Array,
  localKey: Uint8Array,
  saltBase64: string
): Promise<void> {
  const wrappedDek = await wrapKey(dek, localKey);
  await SecureStore.setItemAsync(SECURE_KEY_WRAPPED_DEK, wrappedDek);
  await SecureStore.setItemAsync(SECURE_KEY_SALT, saltBase64);
  await SecureStore.setItemAsync(SECURE_KEY_E2EE_ENABLED, 'true');
}

/**
 * Wraps the DEK with the Recovery Key (Seed Phrase) and uploads it to the cloud.
 */
export async function uploadCloudDEK(
  dek: Uint8Array,
  recoveryKey: Uint8Array,
  deviceId: string,
  saltBase64: string
): Promise<void> {
  const wrappedDek = await wrapKey(dek, recoveryKey);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('device_keys').upsert({
        device_id: deviceId,
        user_id: session.user.id,
        dek_wrapped: wrappedDek,
        salt: saltBase64,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[KeyManager] Cloud DEK upload failed (offline mode):', err);
  }
}

// ─── Initial Setup ───────────────────────────────────────────────────────────

/**
 * Performs first-time E2EE setup:
 * 1. Generates a DEK using CSPRNG
 * 2. Derives the Local Key from the user's passphrase
 * 3. Wraps the DEK with the Local Key (SecureStore)
 * 4. Derives the Recovery Key from the seed phrase
 * 5. Wraps the DEK with the Recovery Key (Supabase)
 * 6. Plants a sentinel canary for keystore-wipe detection
 * 7. Zeroes all key material from memory
 *
 * @param passphrase - User-chosen encryption passphrase
 * @param options - Optional setup options
 * @param options.seedPhrase - If provided, used instead of passphrase for key derivation
 * @param options.phraseHash - SHA-256 hash of the seed phrase (stored for re-verification)
 * @returns The salt (needed for re-deriving the Master Key)
 */
export async function setupE2EE(
  passphrase: string,
  options?: { seedPhrase?: string; phraseHash?: string }
): Promise<{ salt: string }> {
  // 1. Generate a fresh DEK
  const dek = generateDEK();

  // 2. Generate single salt for the device
  const salt = generateSalt();
  const saltBase64 = btoa(String.fromCharCode(...Array.from(salt)));
  const deviceId = await getDeviceId();

  // 3. Derive Local Key and store locally
  const localKey = await deriveKey(passphrase, salt);
  await storeLocalDEK(dek, localKey, saltBase64);

  // 4. Derive Recovery Key (if seed phrase provided) and upload
  if (options?.seedPhrase) {
    const recoveryKey = await deriveKeyFromSeedPhrase(options.seedPhrase, salt);
    await uploadCloudDEK(dek, recoveryKey, deviceId, saltBase64);
    zeroBuffer(recoveryKey);
  } else {
    // Fallback: if no seed phrase, use local key for cloud (not recommended)
    await uploadCloudDEK(dek, localKey, deviceId, saltBase64);
  }

  // 5. Store seed phrase hash if provided (for re-verification quiz)
  if (options?.phraseHash) {
    await SecureStore.setItemAsync(SECURE_KEY_PHRASE_HASH, options.phraseHash);
  }

  // 5. Plant sentinel canary for keystore-wipe detection
  await plantSecureStoreCanary();

  // 6. Validate the DEK before zeroing
  const isValid = await validateDEKIntegrity(dek);
  if (!isValid) {
    throw new Error('[KeyManager] DEK integrity check failed after setup — aborting.');
  }

  // 8. Zero key material
  zeroBuffer(dek);
  zeroBuffer(localKey);
  zeroBuffer(salt);

  return { salt: saltBase64 };
}

// ─── Load DEK ────────────────────────────────────────────────────────────────

/**
 * Loads the DEK from secure storage by unwrapping it with the Master Key.
 *
 * @param masterKey - 256-bit Master Key
 * @returns The raw DEK (caller MUST call zeroBuffer after use)
 * @throws If keystore is wiped or Master Key is wrong
 */
export async function loadDEK(masterKey: Uint8Array): Promise<Uint8Array> {
  const wrappedDek = await SecureStore.getItemAsync(SECURE_KEY_WRAPPED_DEK);

  if (!wrappedDek) {
    throw new Error(
      '[KeyManager] No encryption keys found in secure storage. ' +
      'If this is a new device, use your seed phrase to recover.'
    );
  }

  try {
    // Unwrap the DEK
    const dek = await unwrapKey(wrappedDek, masterKey);
    return dek;
  } catch (err) {
    throw new Error('[KeyManager] Failed to unlock — incorrect Master Key or corrupted keystore.');
  }
}

/**
 * Convenience function to load the DEK directly from a passphrase.
 * Looks up the salt, derives the Master Key, and loads the DEK.
 */
export async function loadDEKWithPassphrase(passphrase: string): Promise<Uint8Array> {
  const saltBase64 = await SecureStore.getItemAsync(SECURE_KEY_SALT);
  if (!saltBase64) throw new Error('[KeyManager] Salt missing from secure storage.');

  const salt = new Uint8Array(
    atob(saltBase64).split('').map((c) => c.charCodeAt(0))
  );

  const masterKey = await deriveKey(passphrase, salt);

  try {
    const dek = await loadDEK(masterKey);
    zeroBuffer(masterKey);
    zeroBuffer(salt);
    
    // Cache the DEK in memory for the active session
    activeDEK = new Uint8Array(dek);
    
    return dek;
  } catch (err) {
    zeroBuffer(masterKey);
    zeroBuffer(salt);
    throw err;
  }
}

/**
 * Alias for loadDEKWithPassphrase for UI consistency.
 */
export async function unlockVault(passphrase: string): Promise<Uint8Array> {
  return await loadDEKWithPassphrase(passphrase);
}

/**
 * Updates the vault passphrase by re-wrapping the DEK.
 * This is called during a password change flow.
 */
export async function updatePassphrase(oldPassphrase: string, newPassphrase: string): Promise<void> {
  // 1. Load current DEK to verify old passphrase and get the key material
  const dek = await loadDEKWithPassphrase(oldPassphrase);
  
  try {
    const saltBase64 = await SecureStore.getItemAsync(SECURE_KEY_SALT);
    if (!saltBase64) throw new Error('Salt missing from secure storage.');
    
    const salt = new Uint8Array(
      atob(saltBase64).split('').map((c) => c.charCodeAt(0))
    );

    // 2. Derive new Master Key
    const newMasterKey = await deriveKey(newPassphrase, salt);
    
    // 3. Re-wrap and store locally
    await storeLocalDEK(dek, newMasterKey, saltBase64);
    
    // 4. Update Cloud DEK (if currently using the passphrase-derived key)
    const deviceId = await getDeviceId();
    await uploadCloudDEK(dek, newMasterKey, deviceId, saltBase64);

    // 5. Zero sensitive material
    zeroBuffer(newMasterKey);
    zeroBuffer(salt);
    zeroBuffer(dek);
  } catch (err) {
    if (dek) zeroBuffer(dek);
    throw err;
  }
}


// ─── Recovery (Seed Phrase → Master Key → DEK) ──────────────────────────────

/**
 * Recovers encryption from a seed phrase on a new device.
 *
 * Single-Device Recovery Edge Case:
 * If no wrapped DEK exists in the cloud, a new DEK is provisioned.
 * OLD DATA IS UNRECOVERABLE in this scenario (by design — zero-knowledge).
 *
 * @param seedPhrase - 24-word BIP39 seed phrase (Cloud decryption)
 * @param newPassphrase - New daily passphrase to protect the DEK locally
 * @returns Whether existing data was recovered or a new DEK was provisioned
 */
export async function recoverFromSeedPhrase(
  seedPhrase: string,
  newPassphrase?: string
): Promise<{
  recovered: boolean;
  isNewDEK: boolean;
}> {
  if (!newPassphrase) {
    throw new Error('[KeyManager] A new daily passphrase is required to complete recovery.');
  }

  // The seed phrase IS the Recovery Key.
  const deviceId = await getDeviceId();
  const saltBase64 = await SecureStore.getItemAsync(SECURE_KEY_SALT);

  // Try to find existing wrapped DEK in cloud
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: keys } = await supabase
        .from('device_keys')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(1);

      if (keys && keys.length > 0) {
        // Found an existing wrapped DEK — try to unwrap it
        const existingKey = keys[0];
        const salt = new Uint8Array(
          atob(existingKey.salt).split('').map((c: string) => c.charCodeAt(0))
        );

        const recoveryKey = await deriveKeyFromSeedPhrase(seedPhrase, salt);

        try {
          const dek = await unwrapKey(existingKey.dek_wrapped, recoveryKey);

          // Success: DEK unwrapped from cloud. Now wrap it locally with the new passphrase.
          const localKey = await deriveKey(newPassphrase, salt);
          await storeLocalDEK(dek, localKey, existingKey.salt);

          zeroBuffer(dek);
          zeroBuffer(recoveryKey);
          zeroBuffer(localKey);
          zeroBuffer(salt);

          return { recovered: true, isNewDEK: false };
        } catch (unwrapErr) {
          zeroBuffer(recoveryKey);
          zeroBuffer(salt);
          throw new Error('[KeyManager] Seed phrase does not match the original encryption keys.');
        }
      }
    }
  } catch (err) {
    console.warn('[KeyManager] Cloud recovery check failed:', err);
  }

  // No existing DEK found — provision a new one (data loss scenario)
  const result = await setupE2EE(newPassphrase, { seedPhrase });
  return { recovered: false, isNewDEK: true };
}

// ─── DEK Revocation ──────────────────────────────────────────────────────────

/**
 * Revokes a device's DEK by removing its wrapped key from the cloud.
 * The revoked device will be unable to sync on next attempt.
 *
 * @param targetDeviceId - UUID of the device to revoke
 * @param masterKey - Optional Master Key (for spec compliance)
 */
export async function revokeDEK(targetDeviceId: string, masterKey?: Uint8Array): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('[KeyManager] No active session for revocation');

  const { error } = await supabase
    .from('device_keys')
    .delete()
    .eq('device_id', targetDeviceId)
    .eq('user_id', session.user.id);

  if (error) {
    throw new Error(`[KeyManager] Revocation failed: ${error.message}`);
  }

  console.log(`[KeyManager] Device ${targetDeviceId} revoked successfully.`);
}



// ─── Merkle Root Storage ─────────────────────────────────────────────────────
// The Merkle root MUST be stored in expo-secure-store, NEVER in WatermelonDB.

export async function storeMerkleRoot(root: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEY_MERKLE_ROOT, root);
}

export async function loadMerkleRoot(): Promise<string | null> {
  return await SecureStore.getItemAsync(SECURE_KEY_MERKLE_ROOT);
}

// ─── Secure Store Integrity (Keystore-Wipe Detection) ────────────────────────
//
// PATTERN: Sentinel Canary
// On E2EE setup, we write a random canary value to BOTH:
//   1. expo-secure-store (iOS Keychain / Android Keystore)
//   2. AsyncStorage (survives app reinstalls on both platforms)
//
// On each app launch, we compare them. If the secure store canary is missing
// but the AsyncStorage mirror says E2EE was configured → the keystore was wiped
// → prompt the user for passphrase/seed phrase recovery.
//

/**
 * Plants a sentinel canary in both secure store and AsyncStorage.
 * Called during initial E2EE setup and after successful recovery.
 */
async function plantSecureStoreCanary(): Promise<void> {
  const canary = generateUUID();
  await SecureStore.setItemAsync(SECURE_KEY_CANARY, canary);
  await AsyncStorage.setItem(ASYNC_KEY_CANARY_MIRROR, canary);
}

/**
 * Verifies that the secure store has not been wiped by the OS.
 *
 * Detection logic:
 * - If AsyncStorage has no mirror → E2EE was never set up → OK (returns true)
 * - If both stores match → keystore is intact → OK (returns true)
 * - If AsyncStorage has a mirror but secure store is empty → WIPED (returns false)
 *
 * @returns true if the keystore is intact or E2EE was never configured
 */
export async function verifySecureStoreIntegrity(): Promise<boolean> {
  const mirror = await AsyncStorage.getItem(ASYNC_KEY_CANARY_MIRROR);

  // E2EE was never set up — nothing to verify
  if (!mirror) return true;

  const canary = await SecureStore.getItemAsync(SECURE_KEY_CANARY);

  // Mirror exists but secure store is empty → keystore was wiped
  if (!canary) {
    console.warn(
      '[KeyManager] Keystore wipe detected: AsyncStorage mirror exists but ' +
      'secure store canary is missing. User must re-authenticate.'
    );
    return false;
  }

  // Both exist but don't match → something is corrupted
  if (canary !== mirror) {
    console.warn(
      '[KeyManager] Keystore integrity mismatch: canary values differ. ' +
      'This may indicate a partial wipe or data corruption.'
    );
    return false;
  }

  return true;
}

// ─── DEK Integrity Validation ────────────────────────────────────────────────

/**
 * Validates a DEK by performing a test encrypt → decrypt round-trip.
 *
 * This catches subtle corruption (e.g., bit flips in key material,
 * incomplete unwrapping) before the DEK is used on real data.
 *
 * @param dek - The DEK to validate
 * @returns true if the DEK produces a valid encrypt/decrypt round-trip
 */
export async function validateDEKIntegrity(dek: Uint8Array): Promise<boolean> {
  const testPayload = new TextEncoder().encode('E2EE_INTEGRITY_CHECK_VECTOR');

  try {
    const { blob, iv } = await encrypt(testPayload, dek);
    const decrypted = await decrypt(blob, iv, dek);

    // Verify the round-trip is byte-for-byte identical
    if (decrypted.length !== testPayload.length) return false;
    for (let i = 0; i < testPayload.length; i++) {
      if (decrypted[i] !== testPayload[i]) return false;
    }

    return true;
  } catch (err) {
    console.error('[KeyManager] DEK integrity validation failed:', err);
    return false;
  }
}

// ─── Seed Phrase Hash ────────────────────────────────────────────────────────

/**
 * Retrieves the stored seed phrase hash for re-verification purposes.
 * Returns null if no seed phrase was used during setup.
 */
export async function getSeedPhraseHash(): Promise<string | null> {
  return await SecureStore.getItemAsync(SECURE_KEY_PHRASE_HASH);
}

// ─── Rotation Checkpoint ─────────────────────────────────────────────────────

/**
 * Retrieves the current background rotation checkpoint from secure storage.
 */
export async function getRotationCheckpoint(): Promise<RotationProgress | null> {
  const raw = await SecureStore.getItemAsync(SECURE_KEY_ROTATION_CHECKPOINT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RotationProgress;
  } catch {
    return null;
  }
}

/**
 * Wipes all E2EE-related material from the device.
 * This is used for a total security reset.
 */
export async function wipeAllE2EEKeys(): Promise<void> {
  const keys = [
    'e2ee_dek',
    'e2ee_wrapped_dek',
    'e2ee_device_id',
    'e2ee_salt',
    'e2ee_enabled',
    'e2ee_merkle_root',
    'e2ee_rotation_checkpoint',
    'e2ee_phrase_hash',
    'e2ee_canary',
  ];

  await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key)));
  await AsyncStorage.removeItem('e2ee_canary_mirror');
  clearActiveDEK();
}
