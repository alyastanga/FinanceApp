import React, { useEffect } from 'react';
import { View, Text, FlatList, LayoutAnimation, Platform, UIManager } from 'react-native';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import database from '../database';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Transaction Item component
const TransactionItem = React.memo(({ item, type }: { item: any; type: 'income' | 'expense' }) => (
  <View className="mb-4 flex-row items-center justify-between rounded-3xl bg-[#0A0A0A] p-5 border border-white/5 shadow-sm">
    <View className="flex-row items-center flex-1 gap-x-4">
      <View 
        className={`h-12 w-12 rounded-2xl items-center justify-center ${
          type === 'income' ? 'bg-primary/10' : 'bg-destructive/10'
        }`}
      >
        <View 
          className={`h-3 w-3 rounded-full ${
            type === 'income' ? 'bg-primary shadow-sm shadow-primary' : 'bg-destructive shadow-sm shadow-destructive'
          }`} 
        />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-black tracking-tighter text-foreground leading-tight">
          {type === 'income' ? item.source : item.category}
        </Text>
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">
          {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
    <View className="items-end">
      <Text 
        className={`text-xl font-black tracking-tighter ${
          type === 'income' ? 'text-primary' : 'text-destructive'
        }`}
      >
        {type === 'income' ? '+' : '-'}${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </Text>
    </View>
  </View>
));

// Combined List component
const TransactionList = ({ incomes, expenses, Header }: { incomes: any[]; expenses: any[]; Header?: React.ComponentType<any> }) => {
  const allTransactions = [
    ...incomes.map(i => ({ id: i.id, amount: i.amount, source: i.source, createdAt: i.createdAt, type: 'income' as const })),
    ...expenses.map(e => ({ id: e.id, amount: e.amount, category: e.category, createdAt: e.createdAt, type: 'expense' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply layout animation when data changes (Native only)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [allTransactions.length]);

  return (
    <View className="flex-1 px-6">
      <FlatList
        data={allTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem item={item} type={item.type} />}
        ListHeaderComponent={
          <>
            {Header && <Header />}
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-sm font-black uppercase tracking-[3px] text-muted-foreground">
                History
              </Text>
            </View>
            {allTransactions.length === 0 && (
              <View className="items-center justify-center py-20 rounded-[40px] bg-[#0A0A0A] border border-dashed border-white/10">
                <Text className="text-muted-foreground font-bold tracking-tighter">No activity detected</Text>
              </View>
            )}
          </>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
};

// Enhance with observables to make it reactive
const enhance = withObservables([], () => ({
  incomes: database.get('incomes').query().observe(),
  expenses: database.get('expenses').query().observe(),
}));

export default enhance(TransactionList);
