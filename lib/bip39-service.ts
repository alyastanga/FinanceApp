/**
 * E2EE BIP39 Seed Phrase Service — Phase 10.1
 *
 * Handles the full BIP39 mnemonic lifecycle:
 * - Generation using native CSPRNG entropy (expo-crypto)
 * - Validation against the official English wordlist
 * - NFKD normalization for KDF input (per BIP39 spec)
 * - Confirmation quiz generation for onboarding security
 *
 * SECURITY CONSTRAINTS:
 * - Entropy sourced EXCLUSIVELY from expo-crypto (native CSPRNG)
 * - Never use Math.random() or any non-cryptographic RNG
 * - Seed phrase is displayed ONCE and never persisted to storage
 * - Only a SHA-256 hash of the phrase is stored (for quiz re-verification)
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
 */

import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import * as ExpoCrypto from 'expo-crypto';
import { sha256 } from './crypto-service';

// ─── Constants ───────────────────────────────────────────────────────────────
const ENTROPY_BYTES = 32; // 256 bits → 24-word mnemonic
const QUIZ_WORD_COUNT = 4; // Number of words to quiz during confirmation
const MIN_WORD_COUNT = 12; // Minimum acceptable mnemonic length
const MAX_WORD_COUNT = 24; // Maximum / default mnemonic length

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SeedPhraseResult {
  /** The 24-word BIP39 mnemonic — display once and discard */
  phrase: string;
  /** SHA-256 hash of the normalized phrase — safe to store for quiz re-verification */
  phraseHash: string;
  /** The individual words as an array for UI display */
  words: string[];
}

export interface QuizQuestion {
  /** 1-indexed position of the word in the mnemonic */
  position: number;
  /** The correct answer (the word at that position) */
  correctWord: string;
}

export interface QuizResult {
  questions: QuizQuestion[];
  /** Total number of questions */
  total: number;
}

// ─── Core: Seed Phrase Generation ────────────────────────────────────────────

/**
 * Generates a BIP39 24-word seed phrase using native CSPRNG entropy.
 *
 * The entropy is sourced from expo-crypto (CommonCrypto on iOS, OpenSSL on Android).
 * The resulting mnemonic includes a checksum per the BIP39 specification.
 *
 * IMPORTANT: The returned phrase must be shown to the user ONCE and then
 * discarded from memory. Only the phraseHash should be persisted.
 *
 * @returns SeedPhraseResult with the phrase, its hash, and individual words
 */
export async function generateSeedPhrase(): Promise<SeedPhraseResult> {
  // Generate 256 bits of entropy using native CSPRNG
  const entropy = ExpoCrypto.getRandomBytes(ENTROPY_BYTES);

  // Convert entropy to a 24-word BIP39 mnemonic
  const phrase = entropyToMnemonic(entropy, wordlist);

  // Normalize using NFKD (per BIP39 spec) before hashing
  const normalizedPhrase = normalizeMnemonic(phrase);

  // Compute SHA-256 hash for storage (NOT the phrase itself)
  const phraseHash = await sha256(normalizedPhrase);

  // Split into individual words for UI rendering
  const words = normalizedPhrase.split(' ');

  // Zero the entropy buffer
  entropy.fill(0);

  return {
    phrase: normalizedPhrase,
    phraseHash,
    words,
  };
}

// ─── Core: Seed Phrase Validation ────────────────────────────────────────────

/**
 * Validates a BIP39 mnemonic against the English wordlist.
 *
 * Checks:
 * 1. All words are in the BIP39 English wordlist
 * 2. The checksum is correct
 * 3. The word count is valid (12, 15, 18, 21, or 24)
 *
 * @param phrase - The mnemonic phrase to validate
 * @returns true if the phrase is a valid BIP39 mnemonic
 */
export function isValidSeedPhrase(phrase: string): boolean {
  const normalized = normalizeMnemonic(phrase);
  return validateMnemonic(normalized, wordlist);
}

/**
 * Validates a seed phrase and returns detailed error information.
 *
 * @param phrase - The mnemonic phrase to validate
 * @returns Object with validity status and optional error message
 */
export function validateSeedPhraseDetailed(phrase: string): {
  valid: boolean;
  error?: string;
} {
  const normalized = normalizeMnemonic(phrase);
  const words = normalized.split(' ').filter((w) => w.length > 0);

  // Check word count
  const validWordCounts = [12, 15, 18, 21, 24];
  if (!validWordCounts.includes(words.length)) {
    return {
      valid: false,
      error: `Invalid word count: ${words.length}. Must be one of: ${validWordCounts.join(', ')}.`,
    };
  }

  // Check each word against the wordlist
  const invalidWords: string[] = [];
  for (const word of words) {
    if (!wordlist.includes(word)) {
      invalidWords.push(word);
    }
  }

  if (invalidWords.length > 0) {
    return {
      valid: false,
      error: `Invalid words: ${invalidWords.join(', ')}. These are not in the BIP39 English wordlist.`,
    };
  }

  // Full BIP39 validation (includes checksum)
  if (!validateMnemonic(normalized, wordlist)) {
    return {
      valid: false,
      error: 'Checksum verification failed. Please check that all words are entered correctly and in the right order.',
    };
  }

  return { valid: true };
}

// ─── Core: Seed Phrase → Passphrase for KDF ──────────────────────────────────

/**
 * Converts a seed phrase to a normalized passphrase for key derivation.
 *
 * Per BIP39 spec, the mnemonic is NFKD-normalized before use as KDF input.
 * This ensures consistent key derivation across different Unicode implementations.
 *
 * @param phrase - The BIP39 seed phrase
 * @returns NFKD-normalized passphrase string ready for KDF input
 */
export function seedPhraseToPassphrase(phrase: string): string {
  return normalizeMnemonic(phrase);
}

// ─── Core: Confirmation Quiz ─────────────────────────────────────────────────

/**
 * Generates a confirmation quiz by randomly selecting word positions.
 *
 * The quiz asks the user to recall specific words by their position
 * in the mnemonic. This ensures the user has actually written down
 * or memorized the seed phrase before proceeding.
 *
 * @param phrase - The original seed phrase
 * @param count - Number of questions to generate (default: 4)
 * @returns QuizResult with randomly selected positions and correct answers
 */
export function generateConfirmationQuiz(
  phrase: string,
  count: number = QUIZ_WORD_COUNT
): QuizResult {
  const words = normalizeMnemonic(phrase).split(' ');

  if (words.length < count) {
    throw new Error(
      `[BIP39Service] Cannot generate ${count} quiz questions from a ${words.length}-word phrase.`
    );
  }

  // Generate unique random positions using CSPRNG
  const positions = new Set<number>();
  const randomBytes = ExpoCrypto.getRandomBytes(count * 2); // Extra bytes to handle collisions

  let byteIndex = 0;
  while (positions.size < count && byteIndex < randomBytes.length) {
    // Map random byte to a valid word index (0 to words.length - 1)
    const position = randomBytes[byteIndex] % words.length;
    positions.add(position);
    byteIndex++;
  }

  // Fallback: if we somehow didn't get enough unique positions (very unlikely)
  // fill in sequentially from the beginning
  let fallbackIndex = 0;
  while (positions.size < count) {
    positions.add(fallbackIndex);
    fallbackIndex++;
  }

  // Sort positions for a natural quiz flow
  const sortedPositions = Array.from(positions).sort((a, b) => a - b);

  const questions: QuizQuestion[] = sortedPositions.map((pos) => ({
    position: pos + 1, // 1-indexed for user display
    correctWord: words[pos],
  }));

  return {
    questions,
    total: questions.length,
  };
}

// ─── Core: Quiz Verification ─────────────────────────────────────────────────

/**
 * Verifies user answers against the quiz questions.
 *
 * @param questions - The original quiz questions
 * @param answers - User-provided answers (keyed by 1-indexed position)
 * @returns Object with pass/fail status and details of incorrect answers
 */
export function verifyQuizAnswers(
  questions: QuizQuestion[],
  answers: Record<number, string>
): {
  passed: boolean;
  incorrectPositions: number[];
} {
  const incorrectPositions: number[] = [];

  for (const question of questions) {
    const userAnswer = (answers[question.position] || '').trim().toLowerCase();
    if (userAnswer !== question.correctWord) {
      incorrectPositions.push(question.position);
    }
  }

  return {
    passed: incorrectPositions.length === 0,
    incorrectPositions,
  };
}

// ─── Core: Phrase Hash Verification ──────────────────────────────────────────

/**
 * Verifies a seed phrase against a stored SHA-256 hash.
 *
 * Used for re-verification scenarios (e.g., confirming the user still
 * knows their phrase before performing a destructive operation).
 *
 * @param phrase - The seed phrase to verify
 * @param storedHash - The SHA-256 hash stored during initial setup
 * @returns true if the phrase matches the stored hash
 */
export async function verifySeedPhraseHash(
  phrase: string,
  storedHash: string
): Promise<boolean> {
  const normalized = normalizeMnemonic(phrase);
  const hash = await sha256(normalized);
  return hash === storedHash;
}

// ─── Utility: Mnemonic Normalization ─────────────────────────────────────────

/**
 * Normalizes a mnemonic phrase per BIP39 specification:
 * 1. NFKD Unicode normalization
 * 2. Lowercase
 * 3. Collapse whitespace to single spaces
 * 4. Trim leading/trailing whitespace
 */
function normalizeMnemonic(phrase: string): string {
  return phrase
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Utility: Entropy Recovery ───────────────────────────────────────────────

/**
 * Recovers the original entropy from a valid BIP39 mnemonic.
 *
 * This is the inverse of entropyToMnemonic. The caller MUST zero
 * the returned buffer after use.
 *
 * @param phrase - A valid BIP39 mnemonic
 * @returns The original entropy as Uint8Array
 * @throws If the phrase is invalid
 */
export function recoverEntropy(phrase: string): Uint8Array {
  const normalized = normalizeMnemonic(phrase);

  if (!validateMnemonic(normalized, wordlist)) {
    throw new Error('[BIP39Service] Cannot recover entropy from an invalid mnemonic.');
  }

  return mnemonicToEntropy(normalized, wordlist);
}
