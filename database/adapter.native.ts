import ExpoConstants from 'expo-constants';
import schema from './schema';
import migrations from './migrations';

export const getAdapter = () => {
  // Detect if we are running in Expo Go (standard app store app)
  // or a custom Development Build.
  const appOwnership = ExpoConstants.appOwnership;
  const isExpoGo = appOwnership === 'expo';
  
  console.log(`[Database] appOwnership: ${appOwnership}, isExpoGo: ${isExpoGo}`);

  // Also check if the native JSI bridge is actually available
  // WatermelonDB's SQLite adapter requires this on native.
  const isNativeBridgeAvailable = !!(global as any).nativeWatermelon;
  console.log(`[Database] isNativeBridgeAvailable: ${isNativeBridgeAvailable}`);

  if (isExpoGo || !isNativeBridgeAvailable) {
    // Lazy-load LokiJS for Expo Go fallback or missing native bridge
    const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default;
    
    if (isExpoGo) {
      console.warn('WatermelonDB: Running in Expo Go. Falling back to LokiJS (JS-only).');
    } else {
      console.warn('WatermelonDB: Native bridge not found. Falling back to LokiJS (JS-only). Check if you have built a development client with the WatermelonDB plugin.');
    }

    return new LokiJSAdapter({
      schema,
      migrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      onSetUpError: (error: any) => {
        console.error('LokiJS fallback failed to load:', error);
      }
    });
  }

  // Lazy-load the high-performance SQLite adapter in standalone / development builds.
  // This prevents the app from searching for NativeDatabaseBridge in Expo Go at startup.
  const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;

  return new SQLiteAdapter({
    schema,
    migrations,
    dbName: 'FinanceApp',
    jsi: true,
    onSetUpError: (error: any) => {
      console.error('Database failed to load:', error);
    }
  });
};
