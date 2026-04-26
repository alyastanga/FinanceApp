import React from 'react';
import { View, Text } from 'react-native';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import { LinearGradient } from 'expo-linear-gradient';
import database from '../database';
import { useCurrency } from '../context/CurrencyContext';

import { useTheme } from '../context/ThemeContext';

const BalanceSummary = ({ incomes, expenses }: { incomes: any[]; expenses: any[] }) => {
  const { currency, symbolFor, convertFrom } = useCurrency();
  const { isDark } = useTheme();
  const totalIncome = incomes.reduce((acc, curr) => acc + convertFrom(curr.amount, curr.currency || currency), 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + convertFrom(curr.amount, curr.currency || currency), 0);
  const balance = totalIncome - totalExpenses;
  const currentSymbol = symbolFor(currency);

  return (
    <View className={`mb-10 overflow-hidden rounded-[40px] border ${isDark ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-black/5'}`}>
      <LinearGradient
        colors={['#10b98120', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-8"
      >
        <View className="mb-8">
          <Text className="text-sm font-black uppercase tracking-[3px] text-primary/60">
            Total Wealth
          </Text>
          <Text className={`text-5xl font-black tracking-tighter mt-1 ${isDark ? 'text-white' : 'text-black'}`}>
            {currentSymbol}{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <View className={`flex-row items-center gap-x-6 border-t pt-8 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <View className="flex-1">
            <View className="flex-row items-center gap-x-2 mb-1">
              <View className="h-2 w-2 rounded-full bg-primary" />
              <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Income</Text>
            </View>
            <Text className="text-xl font-bold text-primary">+{currentSymbol}{totalIncome.toLocaleString()}</Text>
          </View>
          
          <View className={`h-8 w-[1px] ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

          <View className="flex-1 items-end">
            <View className="flex-row items-center gap-x-2 mb-1">
              <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expenses</Text>
              <View className="h-2 w-2 rounded-full bg-destructive" />
            </View>
            <Text className="text-xl font-bold text-destructive">-{currentSymbol}{totalExpenses.toLocaleString()}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const enhance = withObservables([], () => ({
  incomes: database.get('incomes').query().observe(),
  expenses: database.get('expenses').query().observe(),
}));

export default enhance(BalanceSummary);
