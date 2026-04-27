/**
 * E2EE Phase 10.1 — Verification Test Script
 *
 * Tests the cryptographic foundation:
 * 1. BIP39 seed phrase generation and validation
 * 2. Confirmation quiz generation and verification
 * 3. Key derivation (PBKDF2-600k)
 * 4. AES-256-GCM encrypt/decrypt round-trip
 * 5. Key wrapping/unwrapping round-trip
 * 6. Seed phrase normalization consistency
 *
 * Run with: npx ts-node _tests_dev/test-crypto-e2ee.ts
 * (or import and call runAllTests() from the app)
 */

import {
  generateIV,
  generateSalt,
  generateRandomKey,
  deriveKey,
  deriveKeyFromSeedPhrase,
  encrypt,
  decrypt,
  wrapKey,
  unwrapKey,
  zeroBuffer,
  sha256,
  encryptPayload,
  decryptPayload,
  KDF_ALGORITHM,
  ARGON2_AVAILABLE,
} from '../lib/crypto-service';

import {
  generateSeedPhrase,
  isValidSeedPhrase,
  validateSeedPhraseDetailed,
  seedPhraseToPassphrase,
  generateConfirmationQuiz,
  verifyQuizAnswers,
  verifySeedPhraseHash,
  recoverEntropy,
} from '../lib/bip39-service';

// ─── Test Utilities ──────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failCount++;
  }
}

async function assertThrows(fn: () => Promise<any>, testName: string): Promise<void> {
  try {
    await fn();
    console.error(`  ❌ FAIL: ${testName} — expected error but none was thrown`);
    failCount++;
  } catch (err) {
    console.log(`  ✅ PASS: ${testName} — correctly threw: ${(err as Error).message.substring(0, 60)}`);
    passCount++;
  }
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

async function testCryptoConfig() {
  console.log('\n🔧 Crypto Configuration');
  assert(ARGON2_AVAILABLE === false, 'Argon2id feature flag is OFF (PBKDF2 active)');
  assert(KDF_ALGORITHM === 'pbkdf2-sha512', 'KDF algorithm reports pbkdf2-sha512');
}

async function testIVGeneration() {
  console.log('\n🎲 IV Generation');
  const iv1 = generateIV();
  const iv2 = generateIV();

  assert(iv1.length === 12, 'IV is 12 bytes (96 bits)');
  assert(iv2.length === 12, 'Second IV is 12 bytes');
  assert(!arraysEqual(iv1, iv2), 'Two IVs are unique (CSPRNG confirmed)');
}

async function testSaltGeneration() {
  console.log('\n🧂 Salt Generation');
  const salt1 = generateSalt();
  const salt2 = generateSalt();

  assert(salt1.length === 16, 'Salt is 16 bytes (128 bits)');
  assert(!arraysEqual(salt1, salt2), 'Two salts are unique');
}

async function testKeyDerivation() {
  console.log('\n🔑 Key Derivation (PBKDF2-600k)');
  const salt = generateSalt();
  const key1 = await deriveKey('test-passphrase-alpha', salt);
  const key2 = await deriveKey('test-passphrase-alpha', salt);
  const key3 = await deriveKey('test-passphrase-beta', salt);

  assert(key1.length === 32, 'Derived key is 32 bytes (256 bits)');
  assert(arraysEqual(key1, key2), 'Same passphrase + salt produces same key');
  assert(!arraysEqual(key1, key3), 'Different passphrase produces different key');
}

async function testEncryptDecrypt() {
  console.log('\n🔐 AES-256-GCM Encrypt/Decrypt');
  const dek = generateRandomKey();
  const plaintext = new TextEncoder().encode('Financial data: $1,234.56 in Savings');

  const { blob, iv } = await encrypt(plaintext, dek);
  const decrypted = await decrypt(blob, iv, dek);

  assert(arraysEqual(plaintext, decrypted), 'Round-trip produces identical plaintext');
  assert(blob.length > 0, 'Blob is non-empty');
  assert(iv.length > 0, 'IV is non-empty');

  // Test with different DEK fails
  const wrongDek = generateRandomKey();
  await assertThrows(
    () => decrypt(blob, iv, wrongDek),
    'Decryption with wrong DEK throws auth tag mismatch'
  );

  // Test tamper detection (flip a byte in the blob)
  const tamperedBlob = blob.substring(0, 5) +
    String.fromCharCode(blob.charCodeAt(5) ^ 0xFF) +
    blob.substring(6);
  await assertThrows(
    () => decrypt(tamperedBlob, iv, dek),
    'Decryption with tampered blob throws error'
  );

  zeroBuffer(dek);
  zeroBuffer(wrongDek);
}

async function testEncryptUniqueness() {
  console.log('\n🎯 Encryption IV Uniqueness');
  const dek = generateRandomKey();
  const plaintext = new TextEncoder().encode('Same payload each time');

  const result1 = await encrypt(plaintext, dek);
  const result2 = await encrypt(plaintext, dek);

  assert(result1.iv !== result2.iv, 'Same plaintext + DEK produces different IVs');
  assert(result1.blob !== result2.blob, 'Same plaintext + DEK produces different blobs');

  zeroBuffer(dek);
}

async function testKeyWrapping() {
  console.log('\n🔒 Key Wrapping/Unwrapping');
  const masterKey = generateRandomKey();
  const dek = generateRandomKey();

  const wrapped = await wrapKey(dek, masterKey);
  const unwrapped = await unwrapKey(wrapped, masterKey);

  assert(arraysEqual(dek, unwrapped), 'Unwrapped DEK matches original');

  // Wrong master key fails
  const wrongMasterKey = generateRandomKey();
  await assertThrows(
    () => unwrapKey(wrapped, wrongMasterKey),
    'Unwrapping with wrong master key throws error'
  );

  zeroBuffer(masterKey);
  zeroBuffer(dek);
  zeroBuffer(unwrapped);
  zeroBuffer(wrongMasterKey);
}

async function testDualWrapArchitecture() {
  console.log('\n🔄 Dual-Wrap Architecture Simulation');
  const dek = generateRandomKey();
  const salt = generateSalt();

  // 1. User sets up E2EE with a Passphrase and a Seed Phrase
  const passphrase = 'my-daily-passphrase';
  const { phrase: seedPhrase } = await generateSeedPhrase();

  const localKey = await deriveKey(passphrase, salt);
  const recoveryKey = await deriveKeyFromSeedPhrase(seedPhrase, salt);

  // They must be different keys
  assert(!arraysEqual(localKey, recoveryKey), 'Local Key and Recovery Key are distinct');

  // 2. Wrap DEK for Local (SecureStore) and Cloud (Supabase)
  const localWrappedDek = await wrapKey(dek, localKey);
  const cloudWrappedDek = await wrapKey(dek, recoveryKey);

  assert(localWrappedDek !== cloudWrappedDek, 'Local and Cloud wraps are distinct ciphertexts');

  // 3. Local Unlock (Daily usage)
  const unlockedLocal = await unwrapKey(localWrappedDek, localKey);
  assert(arraysEqual(dek, unlockedLocal), 'Local Key successfully unwraps Local DEK');

  // 4. Cloud Recovery (New device)
  const unlockedCloud = await unwrapKey(cloudWrappedDek, recoveryKey);
  assert(arraysEqual(dek, unlockedCloud), 'Recovery Key successfully unwraps Cloud DEK');

  // 5. Cross-unwrap should fail
  await assertThrows(
    () => unwrapKey(cloudWrappedDek, localKey),
    'Local Key cannot unwrap Cloud DEK'
  );
  await assertThrows(
    () => unwrapKey(localWrappedDek, recoveryKey),
    'Recovery Key cannot unwrap Local DEK'
  );

  zeroBuffer(dek);
  zeroBuffer(localKey);
  zeroBuffer(recoveryKey);
  zeroBuffer(unlockedLocal);
  zeroBuffer(unlockedCloud);
}

async function testPayloadHelpers() {
  console.log('\n📦 JSON Payload Encrypt/Decrypt');
  const dek = generateRandomKey();
  const payload = {
    amount: 1234.56,
    category: 'Groceries',
    description: 'Weekly shopping at Trader Joe\'s',
    currency: 'USD',
    created_at: Date.now(),
  };

  const { blob, iv } = await encryptPayload(payload, dek);
  const decrypted = await decryptPayload(blob, iv, dek);

  assert(decrypted.amount === payload.amount, 'Amount preserved');
  assert(decrypted.category === payload.category, 'Category preserved');
  assert(decrypted.description === payload.description, 'Description preserved');
  assert(decrypted.currency === payload.currency, 'Currency preserved');
  assert(decrypted.created_at === payload.created_at, 'Timestamp preserved');

  zeroBuffer(dek);
}

async function testSHA256() {
  console.log('\n#️⃣  SHA-256 Hashing');
  const hash1 = await sha256('hello world');
  const hash2 = await sha256('hello world');
  const hash3 = await sha256('hello world!');

  assert(hash1.length === 64, 'Hash is 64 hex characters (256 bits)');
  assert(hash1 === hash2, 'Same input produces same hash');
  assert(hash1 !== hash3, 'Different input produces different hash');
}

async function testBIP39Generation() {
  console.log('\n🌱 BIP39 Seed Phrase Generation');
  const result = await generateSeedPhrase();

  assert(result.words.length === 24, 'Generates 24-word mnemonic');
  assert(result.phrase.split(' ').length === 24, 'Phrase contains 24 words');
  assert(result.phraseHash.length === 64, 'Phrase hash is 64 hex chars (SHA-256)');
  assert(isValidSeedPhrase(result.phrase), 'Generated phrase is valid BIP39');

  // Second generation is different
  const result2 = await generateSeedPhrase();
  assert(result.phrase !== result2.phrase, 'Two generations produce different phrases');
}

async function testBIP39Validation() {
  console.log('\n✅ BIP39 Seed Phrase Validation');

  // Valid phrase (must generate one to test)
  const { phrase } = await generateSeedPhrase();
  assert(isValidSeedPhrase(phrase), 'Generated phrase validates as valid');

  // Invalid phrases
  assert(!isValidSeedPhrase('invalid phrase'), 'Rejects obviously invalid phrase');
  assert(!isValidSeedPhrase(''), 'Rejects empty string');
  assert(
    !isValidSeedPhrase('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'),
    'Rejects phrase with wrong checksum'
  );

  // Detailed validation
  const detailedInvalid = validateSeedPhraseDetailed('foo bar baz');
  assert(!detailedInvalid.valid, 'Detailed validation rejects 3-word phrase');
  assert(detailedInvalid.error !== undefined, 'Detailed validation provides error message');

  const detailedValid = validateSeedPhraseDetailed(phrase);
  assert(detailedValid.valid, 'Detailed validation accepts valid phrase');
}

async function testBIP39Normalization() {
  console.log('\n📐 BIP39 Normalization');
  const { phrase } = await generateSeedPhrase();

  const passphrase1 = seedPhraseToPassphrase(phrase);
  const passphrase2 = seedPhraseToPassphrase('  ' + phrase.toUpperCase() + '  ');

  assert(passphrase1 === passphrase2, 'Normalization handles case + whitespace');
}

async function testConfirmationQuiz() {
  console.log('\n❓ Confirmation Quiz');
  const { phrase, words } = await generateSeedPhrase();

  const quiz = generateConfirmationQuiz(phrase, 4);
  assert(quiz.total === 4, 'Quiz has 4 questions');
  assert(quiz.questions.length === 4, 'Quiz contains 4 question objects');

  // Positions are valid (1-indexed)
  for (const q of quiz.questions) {
    assert(q.position >= 1 && q.position <= 24, `Position ${q.position} is in range [1, 24]`);
    assert(q.correctWord === words[q.position - 1], `Word at position ${q.position} matches`);
  }

  // Positions are unique
  const positions = quiz.questions.map((q) => q.position);
  const uniquePositions = new Set(positions);
  assert(uniquePositions.size === 4, 'All 4 quiz positions are unique');

  // Verify correct answers
  const correctAnswers: Record<number, string> = {};
  for (const q of quiz.questions) {
    correctAnswers[q.position] = q.correctWord;
  }
  const verifyResult = verifyQuizAnswers(quiz.questions, correctAnswers);
  assert(verifyResult.passed, 'Correct answers pass quiz');
  assert(verifyResult.incorrectPositions.length === 0, 'No incorrect positions');

  // Verify wrong answers
  const wrongAnswers: Record<number, string> = {};
  for (const q of quiz.questions) {
    wrongAnswers[q.position] = 'wrongword';
  }
  const wrongResult = verifyQuizAnswers(quiz.questions, wrongAnswers);
  assert(!wrongResult.passed, 'Wrong answers fail quiz');
  assert(wrongResult.incorrectPositions.length === 4, 'All positions marked incorrect');
}

async function testSeedPhraseHashVerification() {
  console.log('\n🔍 Seed Phrase Hash Verification');
  const { phrase, phraseHash } = await generateSeedPhrase();

  const matches = await verifySeedPhraseHash(phrase, phraseHash);
  assert(matches, 'Phrase matches its own hash');

  const { phrase: otherPhrase } = await generateSeedPhrase();
  const doesNotMatch = await verifySeedPhraseHash(otherPhrase, phraseHash);
  assert(!doesNotMatch, 'Different phrase does not match hash');
}

async function testSeedPhraseKeyDerivation() {
  console.log('\n🔐 Seed Phrase → Key Derivation');
  const { phrase } = await generateSeedPhrase();
  const salt = generateSalt();

  const key1 = await deriveKeyFromSeedPhrase(phrase, salt);
  const key2 = await deriveKeyFromSeedPhrase(phrase, salt);
  const key3 = await deriveKeyFromSeedPhrase(phrase + ' ', salt); // extra whitespace

  assert(key1.length === 32, 'Derived key is 32 bytes');
  assert(arraysEqual(key1, key2), 'Same phrase + salt produces same key');
  assert(arraysEqual(key1, key3), 'Normalization handles trailing whitespace');

  zeroBuffer(key1);
  zeroBuffer(key2);
  zeroBuffer(key3);
}

async function testEntropyRecovery() {
  console.log('\n♻️  Entropy Recovery');
  const { phrase } = await generateSeedPhrase();

  const entropy = recoverEntropy(phrase);
  assert(entropy.length === 32, 'Recovered entropy is 32 bytes (256 bits)');

  // Invalid phrase throws
  try {
    recoverEntropy('invalid phrase');
    assert(false, 'Should have thrown for invalid phrase');
  } catch {
    assert(true, 'Throws for invalid phrase');
  }

  zeroBuffer(entropy);
}

async function testZeroBuffer() {
  console.log('\n🧹 Buffer Zeroing');
  const buf = generateRandomKey();
  const hasNonZero = buf.some((b) => b !== 0);
  assert(hasNonZero, 'Key initially has non-zero bytes');

  zeroBuffer(buf);
  const allZero = buf.every((b) => b === 0);
  assert(allZero, 'Buffer is all zeros after zeroBuffer()');
}

// ─── Runner ──────────────────────────────────────────────────────────────────

export async function runAllTests(): Promise<{ passed: number; failed: number }> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  E2EE Phase 10.1 — Cryptographic Foundation Tests');
  console.log('═══════════════════════════════════════════════════════');

  passCount = 0;
  failCount = 0;

  await testCryptoConfig();
  await testIVGeneration();
  await testSaltGeneration();
  await testKeyDerivation();
  await testEncryptDecrypt();
  await testEncryptUniqueness();
  await testKeyWrapping();
  await testDualWrapArchitecture();
  await testPayloadHelpers();
  await testSHA256();
  await testBIP39Generation();
  await testBIP39Validation();
  await testBIP39Normalization();
  await testConfirmationQuiz();
  await testSeedPhraseHashVerification();
  await testSeedPhraseKeyDerivation();
  await testEntropyRecovery();
  await testZeroBuffer();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  Results: ${passCount} passed, ${failCount} failed`);
  console.log('═══════════════════════════════════════════════════════\n');

  return { passed: passCount, failed: failCount };
}

// Auto-run if executed directly
runAllTests().catch(console.error);
