/**
 * Native-platform no-op initializer for Skia.
 * On iOS and Android, the Skia engine is linked directly into the binary.
 */
export const initializeSkia = async () => {
  // No-op on Native devices.
  return true;
};
