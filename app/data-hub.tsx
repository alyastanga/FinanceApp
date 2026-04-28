import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getCSVHeaders, guessMappings, transformRows, CSVMapping } from '@/lib/csv-utils';
import database from '@/database';
import { useCurrency } from '@/context/CurrencyContext';
import { useTheme } from '@/context/ThemeContext';
import { DateRangeModal } from '@/components/DateRangeModal';
import { exportTransactionsToCSV, ExportTransaction } from '@/lib/export-service';
import { PasswordPromptModal } from '@/components/PasswordPromptModal';
import { PDFService } from '@/lib/pdf-service';
import Income from '@/database/models/Income';
import Expense from '@/database/models/Expense';

export default function DataHubScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { currency, symbolFor } = useCurrency();
  const currentSymbol = symbolFor(currency);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingPdfUri, setPendingPdfUri] = useState<string | null>(null);
  const [pendingPdfName, setPendingPdfName] = useState('');

  // Import State
  const [csvText, setCsvText] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CSVMapping>({
    dateHeader: '',
    sourceHeader: '',
    amountHeader: '',
    type: 'auto'
  });

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/comma-separated-values', 'application/pdf'],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        if (asset.mimeType === 'application/pdf' || asset.name.toLowerCase().endsWith('.pdf')) {
          setPendingPdfUri(asset.uri);
          setPendingPdfName(asset.name);
          setShowPasswordModal(true);
          return;
        }

        let content = '';
        if (Platform.OS === 'web') {
          const file = asset.file as unknown as File;
          if (file) content = await file.text();
        } else {
          content = await FileSystem.readAsStringAsync(asset.uri);
        }

        if (content) {
          setCsvText(content);
          const foundHeaders = getCSVHeaders(content);
          setHeaders(foundHeaders);
          const guessed = guessMappings(foundHeaders);
          setMapping(prev => ({ ...prev, ...guessed }));
        }
      }
    } catch (err) {
      console.error('File pick failed:', err);
      Alert.alert('Error', 'Failed to read file.');
    }
  };

  const handlePdfPasswordSubmit = async (password: string) => {
    if (!pendingPdfUri) return;
    setIsProcessing(true);
    try {
      const result = await PDFService.parseStatement(pendingPdfUri, password);
      if (result.success) {
        Alert.alert('Success', `Parsed ${result.count} transactions from statement.`);
        setShowPasswordModal(false);
        setPendingPdfUri(null);
      } else {
        Alert.alert('Parse Failed', result.error || 'Check password and try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const executeImport = async () => {
    if (!csvText) return;
    if (!mapping.dateHeader || !mapping.sourceHeader || !mapping.amountHeader) {
      Alert.alert('Mapping Required', 'Please map all three required columns first.');
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = transformRows(csvText, mapping);
      
      await database.write(async () => {
        const incomesStore = database.get<Income>('incomes');
        const expensesStore = database.get<Expense>('expenses');

        const existingIncomes = await incomesStore.query().fetch();
        const existingExpenses = await expensesStore.query().fetch();

        const isDuplicate = (t: any, existing: any[]) => {
          return existing.some(e => 
            Math.abs(e.amount - t.amount) < 0.01 && 
            (e.source === t.source || e.category === t.source) &&
            new Date(e.createdAt).getTime() === t.createdAt.getTime()
          );
        };

        let importedCount = 0;
        for (const t of parsed) {
          const existing = t.type === 'income' ? existingIncomes : existingExpenses;
          if (isDuplicate(t, existing)) continue;

          const store = t.type === 'income' ? incomesStore : expensesStore;
          await store.create((record: any) => {
            record.amount = t.amount;
            if (t.type === 'income') {
               (record as any).source = t.source;
            } else {
               (record as any).category = t.source;
            }
            record.createdAt = t.createdAt;
          });
          importedCount++;
        }
        
        Alert.alert('Success', `Imported ${importedCount} new transactions.`);
      });

      setCsvText(null);
    } catch (err: any) {
      console.error('Import failed:', err);
      Alert.alert('Import Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async (fromDate: Date, toDate: Date) => {
    setIsProcessing(true);
    try {
      const fromTime = new Date(fromDate).setHours(0, 0, 0, 0);
      const toTime = new Date(toDate).setHours(23, 59, 59, 999);

      const incomes = await database.get<Income>('incomes').query().fetch();
      const expenses = await database.get<Expense>('expenses').query().fetch();

      const filteredIncomes = incomes.filter(i => {
        const time = i.createdAt.getTime();
        return time >= fromTime && time <= toTime;
      });
      const filteredExpenses = expenses.filter(e => {
        const time = e.createdAt.getTime();
        return time >= fromTime && time <= toTime;
      });

      const allTransactions: ExportTransaction[] = [
        ...filteredIncomes.map(i => ({
          amount: i.amount,
          category: (i as any).source || 'Income',
          description: '',
          createdAt: i.createdAt.getTime(),
          type: 'Inflow' as const
        })),
        ...filteredExpenses.map(e => ({
          amount: e.amount,
          category: e.category,
          description: '',
          createdAt: e.createdAt.getTime(),
          type: 'Outflow' as const
        }))
      ].sort((a, b) => b.createdAt - a.createdAt);

      await exportTransactionsToCSV(allTransactions, fromDate, toDate);
      setShowExportModal(false);
    } catch (error: any) {
      console.error('Export Error:', error);
      Alert.alert("Export Failed", error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMappingRow = (label: string, field: keyof CSVMapping, icon: string) => (
    <View className="mb-6">
      <View className="flex-row items-center gap-x-2 mb-3">
        <IconSymbol name={icon as any} size={14} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} />
        <Text className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>{label}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-x-2">
        {headers.map((h) => (
          <TouchableOpacity
            key={h}
            onPress={() => setMapping(prev => ({ ...prev, [field]: h }))}
            className={`px-4 py-2.5 rounded-xl border ${mapping[field] === h ? 'bg-primary/20 border-primary' : (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')}`}
          >
            <Text className={`text-xs font-bold ${mapping[field] === h ? 'text-primary' : (isDark ? 'text-white/60' : 'text-black/60')}`}>{h}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <BlurView intensity={isDark ? 20 : 80} tint={isDark ? "dark" : "light"} className="flex-1">
        <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
          <View className="flex-row justify-between items-center mb-8">
            <View>
              <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-neutral-900'}`}>Data Hub</Text>
              <Text className={`text-xs uppercase tracking-widest mt-1 ${isDark ? 'text-white/40' : 'text-neutral-500'}`}>Migration & Portability</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} className={`h-10 w-10 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <IconSymbol name="xmark" size={20} color={isDark ? "white" : "black"} />
            </TouchableOpacity>
          </View>

          {/* Primary Action: Export */}
          <TouchableOpacity 
            onPress={() => setShowExportModal(true)}
            className={`p-8 rounded-[40px] border flex-row items-center gap-x-6 mb-12 ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-500/5 border-emerald-500/10'}`}
          >
            <View className="h-16 w-16 bg-emerald-500/20 rounded-3xl items-center justify-center">
              <IconSymbol name="arrow.up.doc.fill" size={28} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="font-black text-lg text-[#10b981] mb-1">Export Data</Text>
              <Text className={`text-[10px] uppercase tracking-widest font-bold ${isDark ? 'text-white/40' : 'text-neutral-500'}`}>Generate CSV Report</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#10b981" style={{ opacity: 0.5 }} />
          </TouchableOpacity>

          {/* Import Section */}
          <View className="mb-10">
            <Text className={`text-[12px] font-black uppercase tracking-[4px] mb-6 ${isDark ? 'text-white' : 'text-black'}`}>Import Transactions</Text>
            
            {!csvText ? (
              <TouchableOpacity 
                onPress={handlePickFile}
                className={`h-48 w-full border-2 border-dashed rounded-[32px] items-center justify-center ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}
              >
                <View className="h-12 w-12 bg-primary/20 rounded-2xl items-center justify-center mb-4">
                  <IconSymbol name="tray.and.arrow.down.fill" size={24} color="#10b981" />
                </View>
                <Text className={`font-bold ${isDark ? 'text-white' : 'text-black'}`}>Select Statement File</Text>
                <Text className={`text-[10px] uppercase mt-2 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Supports CSV or Password Protected PDFs</Text>
              </TouchableOpacity>
            ) : (
              <View className={`p-6 rounded-[32px] border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                <View className="flex-row justify-between items-start mb-8">
                  <View>
                    <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-black'}`}>File Mapping</Text>
                    <Text className={`text-[10px] uppercase tracking-widest mt-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>{headers.length} Columns Found</Text>
                  </View>
                  <TouchableOpacity onPress={() => setCsvText(null)}>
                    <Text className="text-red-400 font-bold text-[10px] uppercase tracking-widest">Reset</Text>
                  </TouchableOpacity>
                </View>
                
                {renderMappingRow('Transaction Date', 'dateHeader', 'calendar')}
                {renderMappingRow('Source / Description', 'sourceHeader', 'text.alignleft')}
                {renderMappingRow(`Amount (${currentSymbol})`, 'amountHeader', 'dollarsign.circle')}

                <TouchableOpacity 
                  onPress={executeImport}
                  disabled={isProcessing}
                  className="mt-4 bg-primary p-5 rounded-2xl items-center shadow-lg shadow-primary/20"
                >
                  {isProcessing ? (
                    <ActivityIndicator color={isDark ? "white" : "black"} />
                  ) : (
                    <Text className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-[#050505]' : 'text-white'}`}>Execute Migration</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </BlurView>

      <DateRangeModal 
        isVisible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />

      <PasswordPromptModal
        isVisible={showPasswordModal}
        fileName={pendingPdfName}
        isProcessing={isProcessing}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handlePdfPasswordSubmit}
      />
    </SafeAreaView>
  );
}
