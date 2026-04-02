import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

/**
 * Browser-platform Skia initializer.
 * Fetches the CanvasKit module from a reliable CDN for immediate Web rendering.
 */
export const initializeSkia = async () => {
  if (typeof window !== 'undefined') {
    try {
      const CanvasKit = await LoadSkiaWeb({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`
      });
      // Crucial: define it globally for any components that assume so
      (window as any).CanvasKit = CanvasKit;
      return true;
    } catch (err: any) {
      console.error('Skia Web Initialization failed:', err);
      return false;
    }
  }
  return true;
};
