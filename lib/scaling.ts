import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Standard design base (iPhone 13 / 11)
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

/**
 * Responsive Scaling Utilities
 * Ensures UI elements scale proportionally across different screen densities.
 */
export const scale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
export const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * GSD Minimalist Design System Tokens
 * Standardized spacing and radius for a consistent, "dense" UI.
 */
export const Spacing = {
  zero: 0,
  micro: scale(2),   // 2px
  xs: scale(4),      // 4px
  sm: scale(8),      // 8px
  md: scale(12),     // 12px
  lg: scale(16),     // 16px
  xl: scale(20),     // 20px
  xxl: scale(24),    // 24px
  huge: scale(32),   // 32px
  giant: scale(48),  // 48px
};

export const Radius = {
  xs: scale(6),      // Sharp minimalist
  sm: scale(10),     // Soft subtle
  md: scale(16),     // Standard card
  lg: scale(24),     // Large container
  xl: scale(32),     // Main dashboard cards
  full: 9999,
};

/**
 * Density Presets
 * Allows toggling between standard and minimalist layouts.
 */
export const Density = {
  compact: {
    padding: Spacing.md,
    gap: Spacing.sm,
    radius: Radius.md,
    fontSize: {
      label: scale(10),
      body: scale(13),
      title: scale(22),
    }
  },
  minimalist: {
    padding: Spacing.sm,
    gap: Spacing.xs,
    radius: Radius.sm,
    fontSize: {
      label: scale(8),
      body: scale(11),
      title: scale(18),
    }
  }
};

/**
 * Layout Constants
 */
export const Layout = {
  window: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  isSmallDevice: SCREEN_WIDTH < 375,
  safePadding: Spacing.xl,
};
