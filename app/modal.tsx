import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import database from '../database';

function ModalScreen({ incomeCount, expenseCount }: { incomeCount: number, expenseCount: number }) {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background p-6">
      <Text className="text-3xl font-black text-foreground mb-4">System Status</Text>
      
      <View className="gap-4">
        <View className="bg-card p-5 rounded-3xl border border-muted shadow-sm">
          <Text className="text-muted-foreground text-xs uppercase font-bold tracking-widest mb-3">Database Records</Text>
          <View className="flex-row justify-between items-center bg-background/50 p-3 rounded-2xl mb-2">
            <Text className="text-foreground font-medium">Income Logs</Text>
            <Text className="text-primary font-black text-xl">{incomeCount}</Text>
          </View>
          <View className="flex-row justify-between items-center bg-background/50 p-3 rounded-2xl">
            <Text className="text-foreground font-medium">Expense Logs</Text>
            <Text className="text-destructive font-black text-xl">{expenseCount}</Text>
          </View>
        </View>

        <View className="bg-card p-5 rounded-3xl border border-muted shadow-sm">
          <Text className="text-muted-foreground text-xs uppercase font-bold tracking-widest mb-1">App Details</Text>
          <Text className="text-foreground font-medium">FinanceApp v1.0.0</Text>
          <Text className="text-muted-foreground text-sm">GSD Optimized • WatermelonDB • NativeWind v4</Text>
        </View>
      </View>

      <TouchableOpacity 
        onPress={() => router.back()}
        className="mt-auto bg-primary p-5 rounded-2xl items-center shadow-lg shadow-primary/30"
      >
        <Text className="text-primary-foreground font-bold text-lg">Close Details</Text>
      </TouchableOpacity>
    </View>
  );
}

const enhance = withObservables([], () => ({
  incomeCount: database.get('incomes').query().observeCount(),
  expenseCount: database.get('expenses').query().observeCount(),
}));

export default enhance(ModalScreen);
