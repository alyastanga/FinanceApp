import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getCSVHeaders, guessMappings, transformRows, generateCSV, CSVMapping } from '@/lib/csv-utils';
import database from '@/database';
import * as Sharing from 'expo-sharing';
import { useCurrency } from '@/context/CurrencyContext';
import { useTheme } from '@/context/ThemeContext';

export default function CSVImportScreen() {
  const router = useRouter();
  const [csvText, setCsvText] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CSVMapping>({
    dateHeader: '',
    sourceHeader: '',
    amountHeader: '',
    type: 'auto'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const { currency, symbolFor } = useCurrency();
  const { isDark } = useTheme();
  const currentSymbol = symbolFor(currency);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/comma-separated-values',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        let content = '';

        if (Platform.OS === 'web') {
          // On Web, read from the native File object
          const file = asset.file as unknown as File;
          if (file) {
            content = await file.text();
          } else if (asset.uri) {
            // Fallback for some web environments
            const response = await fetch(asset.uri);
            content = await response.text();
          }
        } else {
          // On Native, use expo-file-system
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
      Alert.alert('Error', 'Failed to read CSV file.');
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
        const incomesStore = database.get('incomes');
        const expensesStore = database.get('expenses');

        // 2.5: Duplicate Detection Logic
        const existingIncomes = await incomesStore.query().fetch();
        const existingExpenses = await expensesStore.query().fetch();

        const isDuplicate = (t: any, existing: any[]) => {
          return existing.some(e => 
            Math.abs(e.amount - t.amount) < 0.01 && 
            e.source === t.source &&
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
            record.source = t.source;
            record.createdAt = t.createdAt;
          });
          importedCount++;
        }
        
        Alert.alert('Success', `Imported ${importedCount} new transactions. (${parsed.length - importedCount} duplicates skipped)`);
      });

      router.back();
    } catch (err: any) {
      console.error('Import failed:', err);
      Alert.alert('Import Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      const incomes = await database.get('incomes').query().fetch();
      const expenses = await database.get('expenses').query().fetch();
      
      const csv = generateCSV(incomes, expenses);
      const filename = `FinanceApp_Export_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'File downloaded successfully.');
      } else {
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csv);
        await Sharing.shareAsync(fileUri);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      Alert.alert('Export Failed', err.message);
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
        <View className="p-6">
          <View className="flex-row justify-between items-center mb-8">
            <View>
              <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-black'}`}>Data Hub</Text>
              <Text className={`text-xs uppercase tracking-widest mt-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Export & Migration</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} className={`h-10 w-10 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <IconSymbol name="xmark" size={20} color={isDark ? "white" : "black"} />
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-x-3 mb-10">
            <TouchableOpacity 
              onPress={handleExport}
              disabled={isProcessing}
              className={`flex-1 p-5 rounded-[32px] border items-center gap-y-2 ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
            >
              <IconSymbol name="square.and.arrow.up" size={18} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"} />
              <Text className={`font-black text-[10px] uppercase tracking-widest text-center ${isDark ? 'text-white' : 'text-black'}`}>Export All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className={`flex-1 p-5 rounded-[32px] border items-center gap-y-2 opacity-50 ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
            >
              <IconSymbol name="cloud.fill" size={18} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"} />
              <Text className={`font-black text-[10px] uppercase tracking-widest text-center ${isDark ? 'text-white' : 'text-black'}`}>Backup</Text>
            </TouchableOpacity>
          </View>

          {!csvText ? (
            <TouchableOpacity 
              onPress={handlePickFile}
              className={`h-48 w-full border-2 border-dashed rounded-[32px] items-center justify-center ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}
            >
              <View className="h-12 w-12 bg-primary/20 rounded-2xl items-center justify-center mb-4">
                <IconSymbol name="doc.fill" size={24} color="#10b981" />
              </View>
              <Text className={`font-bold ${isDark ? 'text-white' : 'text-black'}`}>Select CSV File</Text>
              <Text className={`text-[10px] uppercase mt-2 ${isDark ? 'text-white/30' : 'text-black/30'}`}>.csv files only</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <View className={`p-5 rounded-3xl border mb-8 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                <Text className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-black'}`}>File Loaded</Text>
                <Text className={`text-[10px] ${isDark ? 'text-white/40' : 'text-black/40'}`}>{headers.length} columns identified.</Text>
              </View>

              <Text className={`text-[12px] font-black uppercase tracking-[4px] mb-6 ${isDark ? 'text-white' : 'text-black'}`}>Column Mapping</Text>
              
              {renderMappingRow('Transaction Date', 'dateHeader', 'calendar')}
              {renderMappingRow('Source / Description', 'sourceHeader', 'text.alignleft')}
              {renderMappingRow(`Amount (${currentSymbol})`, 'amountHeader', 'dollarsign.circle')}

              <TouchableOpacity 
                onPress={executeImport}
                disabled={isProcessing}
                className="mt-6 bg-primary p-5 rounded-2xl items-center shadow-lg shadow-primary/20"
              >
                {isProcessing ? (
                  <ActivityIndicator color={isDark ? "white" : "black"} />
                ) : (
                  <Text className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-white' : 'text-black'}`}>Execute Import</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setCsvText(null)}
                className="mt-4 p-4 rounded-2xl items-center"
              >
                <Text className={`font-bold text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>Reset File</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BlurView>
    </SafeAreaView>
  );
}
