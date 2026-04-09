import ExpoConstants from 'expo-constants';
import schema from './schema';
import migrations from './migrations';

export const getAdapter = () => {
  // Detect if we are running in Expo Go (standard app store app)
  // or a custom Development Build.
  const isExpoGo = ExpoConstants.appOwnership === 'expo';

  if (isExpoGo) {
    // Lazy-load LokiJS for Expo Go fallback
    const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default;
    
    console.warn('WatermelonDB: Running in Expo Go. Falling back to LokiJS (JS-only).');
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
