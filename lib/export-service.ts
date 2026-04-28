import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const formatDateTime = (timestamp: number) => {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const escapeCSV = (value: any) => {
  const str = String(value ?? '').replace(/"/g, '""');
  return `"${str}"`;
};

const formatAmount = (amount: number, type: 'Inflow' | 'Outflow') => {
  const abs = Math.abs(amount).toFixed(2);
  return type === 'Inflow' ? `+${abs}` : `-${abs}`;
};

export interface ExportTransaction {
  amount: number;
  category: string;
  description: string | null;
  createdAt: number;
  type: 'Inflow' | 'Outflow';
}

export const generateCSV = (transactions: ExportTransaction[]) => {
  const header = [
    'Date & Time',
    'Transaction Type',
    'Category',
    'Description',
    'Amount'
  ].map(escapeCSV).join(',');

  const rows = transactions.map((t) => [
    escapeCSV(formatDateTime(t.createdAt)),
    escapeCSV(t.type),
    escapeCSV(t.category),
    escapeCSV(t.description),
    escapeCSV(formatAmount(t.amount, t.type))
  ].join(','));

  return [header, ...rows].join('\n');
};

export const exportTransactionsToCSV = async (
  transactions: ExportTransaction[],
  fromDate: Date,
  toDate: Date
) => {
  if (transactions.length === 0) {
    Alert.alert('No Transactions', 'No transactions found in the selected date range.');
    return;
  }

  try {
    const csvContent = generateCSV(transactions);

    const formatFileDate = (d: Date) => d.toISOString().split('T')[0];
    const fileName = `transactions_${formatFileDate(fromDate)}_to_${formatFileDate(toDate)}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Transactions',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Error', 'Sharing is not available on this device.');
    }
  } catch (err: any) {
    console.error('Export Error:', err);
    Alert.alert('Error', `Failed to export CSV: ${err.message}`);
  }
};
