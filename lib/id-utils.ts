import 'react-native-get-random-values';

/**
 * Generates a standard RFC 4122 version 4 UUID.
 * This ensures compatibility with Supabase's UUID column type and resolves 
 * synchronization syntax errors.
 */
export function generateUUID(): string {
  // Using a robust fallback-ready UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
