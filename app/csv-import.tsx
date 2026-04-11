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
        <IconSymbol name={icon as any} size={14} color="#999" />
        <Text className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-x-2">
        {headers.map((h) => (
          <TouchableOpacity
            key={h}
            onPress={() => setMapping(prev => ({ ...prev, [field]: h }))}
            className={`px-4 py-2.5 rounded-xl border ${mapping[field] === h ? 'bg-primary/20 border-primary' : 'bg-white/5 border-white/10'}`}
          >
            <Text className={`text-xs font-bold ${mapping[field] === h ? 'text-primary' : 'text-white/60'}`}>{h}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <BlurView intensity={20} className="flex-1">
        <View className="p-6">
          <View className="flex-row justify-between items-center mb-8">
            <View>
              <Text className="text-2xl font-black text-white">Data Hub</Text>
              <Text className="text-white/40 text-xs uppercase tracking-widest mt-1">Export & Migration</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 bg-white/5 rounded-full items-center justify-center">
              <IconSymbol name="xmark" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-x-3 mb-10">
            <TouchableOpacity 
              onPress={handleExport}
              disabled={isProcessing}
              className="flex-1 bg-white/5 p-5 rounded-[32px] border border-white/5 items-center gap-y-2"
            >
              <IconSymbol name="square.and.arrow.up" size={18} color="#999" />
              <Text className="text-white font-black text-[10px] uppercase tracking-widest text-center">Export All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-1 bg-white/5 p-5 rounded-[32px] border border-white/5 items-center gap-y-2 opacity-50"
            >
              <IconSymbol name="cloud.fill" size={18} color="#999" />
              <Text className="text-white font-black text-[10px] uppercase tracking-widest text-center">Backup</Text>
            </TouchableOpacity>
          </View>

          {!csvText ? (
            <TouchableOpacity 
              onPress={handlePickFile}
              className="h-48 w-full border-2 border-dashed border-white/10 rounded-[32px] items-center justify-center bg-white/[0.02]"
            >
              <View className="h-12 w-12 bg-primary/20 rounded-2xl items-center justify-center mb-4">
                <IconSymbol name="doc.fill" size={24} color="#10b981" />
              </View>
              <Text className="text-white font-bold">Select CSV File</Text>
              <Text className="text-white/30 text-[10px] uppercase mt-2">.csv files only</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <View className="bg-white/5 p-5 rounded-3xl border border-white/10 mb-8">
                <Text className="text-white font-bold text-sm mb-1">File Loaded</Text>
                <Text className="text-white/40 text-[10px]">{headers.length} columns identified.</Text>
              </View>

              <Text className="text-[12px] font-black text-white uppercase tracking-[4px] mb-6">Column Mapping</Text>
              
              {renderMappingRow('Transaction Date', 'dateHeader', 'calendar')}
              {renderMappingRow('Source / Description', 'sourceHeader', 'text.alignleft')}
              {renderMappingRow(`Amount (${currentSymbol})`, 'amountHeader', 'dollarsign.circle')}

              <TouchableOpacity 
                onPress={executeImport}
                disabled={isProcessing}
                className="mt-6 bg-primary p-5 rounded-2xl items-center shadow-lg shadow-primary/20"
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-black uppercase tracking-widest text-xs">Execute Import</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setCsvText(null)}
                className="mt-4 p-4 rounded-2xl items-center"
              >
                <Text className="text-white/40 font-bold text-xs">Reset File</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BlurView>
    </SafeAreaView>
  );
}
