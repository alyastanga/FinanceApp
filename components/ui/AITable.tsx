import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useCurrency } from '../../context/CurrencyContext';

interface AITableProps {
  data: string[][]; // Rows and columns
  isDark: boolean;
}

export const AITable: React.FC<AITableProps> = ({ data, isDark }) => {
  const { symbol, formatValue } = useCurrency();
  if (!data || data.length < 1) return null;

  const headers = data[0];
  const rows = data.slice(1);

  // Helper to detect if a string is a number and format it if so
  const formatCell = (val: string) => {
    const trimmed = val.trim();
    // Check if it's a number (allowing for currency symbols or commas)
    const num = parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num) && /^[+-]?\d+(\.\d+)?$/.test(trimmed.replace(/[,₱$]/g, ''))) {
      const hasPlus = trimmed.startsWith('+');
      return (
        <View className="flex-row items-baseline justify-end">
          <Text className={`${isDark ? 'text-white/40' : 'text-black/30'} text-[8px] font-black mr-0.5`}>{symbol}</Text>
          <Text className={`${isDark ? 'text-white' : 'text-black'} text-[11px] font-bold`}>
            {hasPlus ? '+' : ''}{formatValue(num)}
          </Text>
        </View>
      );
    }
    return <Text className={`${isDark ? 'text-white/80' : 'text-black/80'} text-[11px] font-medium`}>{trimmed}</Text>;
  };

  return (
    <View className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-black/[0.02] border-black/5'}`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header Row */}
          <View className={`flex-row border-b ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/[0.02]'}`}>
            {headers.map((header, i) => (
              <View key={i} className="px-4 py-3 min-w-[100px]">
                <Text className={`${isDark ? 'text-primary' : 'text-primary'} text-[9px] font-black uppercase tracking-widest`}>
                  {header.trim()}
                </Text>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {rows.map((row, rowIndex) => (
            <View 
              key={rowIndex} 
              className={`flex-row border-b ${isDark ? 'border-white/5' : 'border-black/[0.02]'} ${rowIndex === rows.length - 1 ? 'border-b-0' : ''}`}
            >
              {row.map((cell, cellIndex) => (
                <View key={cellIndex} className="px-4 py-3 min-w-[100px] justify-center">
                  {formatCell(cell)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
