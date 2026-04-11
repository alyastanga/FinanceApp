/**
 * Standardizes date parsing across the app.
 * Handles Date objects, ISO strings, and Unix timestamps (ms and s).
 */
export const normalizeDate = (record: any): number => {
  if (!record) return 0;
  
  // Extract value from common fields
  const val = record.createdAt || record.created_at || (record._raw && record._raw.created_at) || record;
  
  if (!val) return 0;
  
  // If already a Date object
  if (val instanceof Date) {
    return val.getTime();
  }
  
  // If string (ISO or timestamp string)
  if (typeof val === 'string') {
    const d = new Date(val);
    const t = d.getTime();
    if (!isNaN(t)) return t;
    
    // Try parsing as number string
    const num = Number(val);
    if (!isNaN(num) && num > 0) return normalizeTimestamp(num);
    return 0;
  }
  
  // If number (timestamp)
  if (typeof val === 'number') {
    return normalizeTimestamp(val);
  }
  
  return 0;
};

const normalizeTimestamp = (num: number): number => {
  if (num === 0) return 0;
  // If timestamp is in seconds (e.g. legacy WatermelonDB), convert to ms
  // Threshold: 30,000,000,000 (roughly Year 2920)
  return num < 30000000000 ? num * 1000 : num;
};
