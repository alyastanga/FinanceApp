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

  // STEP 1: Update formatCell to accept a column index to control text alignment
  const formatCell = (val: string, colIndex: number) => {
    const trimmed = val.trim();
    const isAmountCol = colIndex > 0;

    // Extract number safely
    const num = parseFloat(trimmed.replace(/[^0-9.-]/g, ''));

    // STEP 2: Improved regex to allow currency codes like "PHP" or "USD" at the end of the string
    if (!isNaN(num) && /^[+-]?\d+(\.\d+)?\s*[a-zA-Z]*$/.test(trimmed.replace(/[, $]/g, ''))) {
      const hasPlus = trimmed.startsWith('+');
      return (
        <View className={`flex-row items-baseline ${isAmountCol ? 'justify-end' : 'justify-start'}`}>
          <Text className={`${isDark ? 'text-white/40' : 'text-black/30'} text-[8px] font-black mr-0.5`}>{symbol}</Text>
          <Text className={`${isDark ? 'text-white' : 'text-black'} text-[11px] font-bold`}>
            {hasPlus ? '+' : ''}{formatValue(num)}
          </Text>
        </View>
      );
    }

    // Fallback for regular text, applying right-alignment if it's the amount column
    return (
      <Text className={`${isDark ? 'text-white/80' : 'text-black/80'} text-[11px] font-medium ${isAmountCol ? 'text-right' : 'text-left'}`}>
        {trimmed}
      </Text>
    );
  };

  return (
    <View className={`rounded-2xl border overflow-hidden self-start ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-black/[0.02] border-black/5'}`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ flexGrow: 0 }}
      >
        <View>
          {/* Header Row */}
          <View className={`flex-row border-b ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/[0.02]'}`}>
            {headers.map((header, i) => (
              // STEP 3: Assign fixed widths. Index 0 (Description) gets 220px, Index 1+ (Amount) gets 120px
              <View key={i} className={`px-4 py-3 justify-center ${i === 0 ? 'w-[220px]' : 'w-[120px]'}`}>
                <Text className={`${isDark ? 'text-primary' : 'text-primary'} text-[9px] font-black uppercase tracking-widest ${i > 0 ? 'text-right' : 'text-left'}`}>
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
                // STEP 4: Apply the exact same fixed widths to the data cells to force vertical alignment
                <View key={cellIndex} className={`px-4 py-3 justify-center ${cellIndex === 0 ? 'w-[220px]' : 'w-[120px]'}`}>
                  {formatCell(cell, cellIndex)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};