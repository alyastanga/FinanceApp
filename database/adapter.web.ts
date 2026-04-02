import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import schema from './schema';

export const getAdapter = () => new LokiJSAdapter({
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  onSetUpError: error => {
    console.error('Database failed to load:', error);
  }
});
