import "@expo/metro-runtime";
import { renderRootComponent } from "expo-router/build/renderRootComponent";

/**
 * Absolute Isolation v3: Synchronous CDN Bootstrap.
 * 
 * To avoid any version skew between the local node_modules' canvaskit.js
 * and the CDN's canvaskit.wasm, we load both from the same CDN source.
 * This also resolves the "failed to create webgl context: err 0" often caused
 * by mismatched internal JS/WASM states.
 */
async function bootstrap() {
  try {
    // 1. Manually inject the CanvasKit JS from the CDN.
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/canvaskit.js";
    script.async = true;
    document.head.appendChild(script);

    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });

    // 2. Initialize CanvasKit from the injected script.
    // @ts-ignore
    const CanvasKit = await window.CanvasKitInit({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`
    });

    // 3. Set the global CanvasKit object.
    global.CanvasKit = CanvasKit;
    global.C_CanvasKit = CanvasKit;
    window.CanvasKit = CanvasKit;
    window.C_CanvasKit = CanvasKit;

    // Defensive check for PixelRatio to ensure consistent WebGL surface sizing 
    // across different browser environments/devices.
    if (typeof window !== 'undefined' && !window.devicePixelRatio) {
        window.devicePixelRatio = 1;
    }

    // 4. Now that the environment is primed, dynamically import the application.
    const { App } = await import("expo-router/build/qualified-entry");
    renderRootComponent(App);

  } catch (err) {
    console.error("Critical failure during Skia Web 'Synchronous CDN' bootstrap:", err);
    
    // Attempt fallback to allow the rest of the app to function.
    try {
        const { App } = await import("expo-router/build/qualified-entry");
        renderRootComponent(App);
    } catch (fallbackErr) {
        console.error("Complete bootstrap failure:", fallbackErr);
    }
  }
}

bootstrap();
