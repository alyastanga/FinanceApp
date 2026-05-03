import { DateRangeModal } from '@/components/DateRangeModal';
import { PasswordPromptModal } from '@/components/PasswordPromptModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCurrency } from '@/context/CurrencyContext';
import { useTheme } from '@/context/ThemeContext';
import database from '@/database';
import Expense from '@/database/models/Expense';
import Income from '@/database/models/Income';
import { CSVMapping, getCSVHeaders, guessMappings, transformRows } from '@/lib/csv-utils';
import { ExportTransaction, exportTransactionsToCSV } from '@/lib/export-service';
import { PDFService } from '@/lib/pdf-service';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    amountHeader: '',
    typeHeader: '',
    categoryHeader: '',
    descriptionHeader: '',
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
    if (!mapping.dateHeader || !mapping.amountHeader) {
      Alert.alert('Mapping Required', 'Please map at least Date and Amount columns.');
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
            e.category === t.category &&
            (e.description || '') === (t.description || '') &&
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
            record.category = t.category;
            record.description = t.description;
            record.createdAt = t.createdAt;
            record.userId = 'default_user'; // Required by schema
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


  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <BlurView intensity={isDark ? 20 : 80} tint={isDark ? "dark" : "light"} className="flex-1">
        <View className="pt-0 px-gsd-lg pb-gsd-lg flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className={`z-10 h-gsd-huge w-gsd-huge rounded-gsd-md items-center justify-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
          >
            <IconSymbol name="chevron.left" size={18} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-neutral-900'} tracking-tighter`}>Data Hub</Text>
          </View>
          <View className="w-gsd-huge" />
        </View>

        <ScrollView className="p-gsd-lg" showsVerticalScrollIndicator={false}>

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

                <View className="mb-6">
                  <Text className={`text-[10px] font-black uppercase tracking-widest mb-4 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Map Columns to Database</Text>
                  {headers.map((h, index) => (
                    <View key={h} className={`mb-4 p-4 rounded-2xl ${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
                      <View className="flex-row items-center gap-x-2 mb-3">
                        <View className="h-5 w-5 rounded-full bg-primary/20 items-center justify-center">
                          <Text className="text-[10px] font-bold text-primary">{index + 1}</Text>
                        </View>
                        <Text className={`text-xs font-bold flex-1 ${isDark ? 'text-white/80' : 'text-black/80'}`} numberOfLines={1}>{h}</Text>
                      </View>
                      <View className="flex-row gap-x-2">
                        {[
                          { label: 'Date', field: 'dateHeader', icon: 'calendar' },
                          { label: 'Type', field: 'typeHeader', icon: 'arrow.up.arrow.down' },
                          { label: 'Category', field: 'categoryHeader', icon: 'tag' },
                          { label: 'Desc', field: 'descriptionHeader', icon: 'text.alignleft' },
                          { label: 'Amount', field: 'amountHeader', icon: 'dollarsign.circle' },
                        ].map((target) => (
                          <TouchableOpacity
                            key={target.field}
                            onPress={() => {
                              // If this header is already assigned to this field, unassign it
                              if (mapping[target.field as keyof CSVMapping] === h) {
                                setMapping(prev => ({ ...prev, [target.field]: '' }));
                              } else {
                                // Assign this header to the field
                                setMapping(prev => ({ ...prev, [target.field]: h }));
                              }
                            }}
                            className={`flex-1 flex-row items-center justify-center gap-x-1.5 py-2.5 rounded-xl border ${mapping[target.field as keyof CSVMapping] === h ? 'bg-primary/20 border-primary' : (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')}`}
                          >
                            <IconSymbol name={target.icon as any} size={10} color={mapping[target.field as keyof CSVMapping] === h ? "#10b981" : (isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)")} />
                            <Text className={`text-[10px] font-black uppercase ${mapping[target.field as keyof CSVMapping] === h ? 'text-primary' : (isDark ? 'text-white/40' : 'text-black/40')}`}>{target.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

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
