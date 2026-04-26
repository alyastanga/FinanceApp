import React, { useEffect } from 'react';
import { View, Text, FlatList, LayoutAnimation, Platform, UIManager, TextInput } from 'react-native';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import database from '../database';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Transaction Item component
const TransactionItem = React.memo(({ item, type }: { item: any; type: 'income' | 'expense' }) => {
  const { format } = useCurrency();
  const { isDark } = useTheme();
  return (
  <View className={`mb-4 flex-row items-center justify-between rounded-3xl p-5 border shadow-sm ${isDark ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-black/5'}`}>
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
        {type === 'income' ? '+' : '-'} {format(item.amount, item.currency)}
      </Text>
    </View>
  </View>
  );
});

TransactionItem.displayName = 'TransactionItem';

// Combined List component
const TransactionList = ({ incomes, expenses, Header }: { incomes: any[]; expenses: any[]; Header?: React.ComponentType<any> }) => {
  const { format, convertFrom, currency } = useCurrency();
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const totalIncome = incomes.reduce((acc, i) => acc + convertFrom(i.amount || 0, i.currency || currency), 0);
  const totalExpense = expenses.reduce((acc, e) => acc + convertFrom(e.amount || 0, e.currency || currency), 0);
  const netBalance = totalIncome - totalExpense;

  const allTransactions = [
    ...incomes.map(i => ({ id: i.id, amount: i.amount, currency: i.currency, source: i.source, createdAt: i.createdAt, type: 'income' as const })),
    ...expenses.map(e => ({ id: e.id, amount: e.amount, currency: e.currency, category: e.category, createdAt: e.createdAt, type: 'expense' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredTransactions = allTransactions.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    // Use type casting to access properties safely on the union type
    const source = (item as any).source || '';
    const category = (item as any).category || '';
    const amount = item.amount?.toString() || '';

    return (
      source.toLowerCase().includes(searchLower) ||
      category.toLowerCase().includes(searchLower) ||
      amount.includes(searchLower)
    );
  });

  // Apply layout animation when data changes (Native only)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [allTransactions.length]);

  return (
    <View className="flex-1 px-6">
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem item={item} type={item.type} />}
        ListHeaderComponent={
          <>
            {Header && <Header />}
            
            {/* Search Bar */}
            <View className={`mb-8 flex-row items-center rounded-[24px] border px-6 py-4 shadow-sm ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-white border-black/5'}`}>
               <View className="opacity-40 mr-3">
                 <Text className={isDark ? "text-white" : "text-black"}>🔍</Text>
               </View>
               <TextInput
                 value={searchQuery}
                 onChangeText={setSearchQuery}
                 placeholder="Search history (e.g. Food, Salary, 50.00)"
                 placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                 className={`flex-1 font-bold ${isDark ? 'text-white' : 'text-black'}`}
               />
            </View>
            
            {/* Overall Summary Panel */}
            <View className={`mb-10 rounded-[48px] border p-8 shadow-2xl overflow-hidden ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-[#FFFFFF] border-black/5'}`}>
               <View className="flex-row justify-between items-center mb-8">
                  <View>
                    <Text className={`text-[10px] font-black tracking-[4px] uppercase mb-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Lifetime Flow</Text>
                    <Text className={`text-4xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
                      {format(netBalance)}
                    </Text>
                  </View>
                  <View className={`px-4 py-1.5 rounded-full border ${netBalance >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
                    <Text className={`${netBalance >= 0 ? 'text-primary' : 'text-destructive'} font-black text-[10px] uppercase tracking-widest`}>
                      {netBalance >= 0 ? 'Surplus' : 'Deficit'}
                    </Text>
                  </View>
               </View>

               <View className="flex-row gap-x-8">
                  <View className="flex-1">
                    <Text className={`text-[9px] font-black uppercase tracking-[2px] mb-2 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Total Incomes</Text>
                    <View className={`rounded-[24px] p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                      <Text className="text-primary font-black text-lg tracking-tight">
                        +{format(totalIncome)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-[9px] font-black uppercase tracking-[2px] mb-2 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Total Expenses</Text>
                    <View className={`rounded-[24px] p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                      <Text className="text-destructive font-black text-lg tracking-tight">
                        -{format(totalExpense)}
                      </Text>
                    </View>
                  </View>
               </View>
            </View>

            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-sm font-black uppercase tracking-[3px] text-muted-foreground pl-2">
                Recent Activity
              </Text>
            </View>
            {allTransactions.length === 0 && (
              <View className={`items-center justify-center py-20 rounded-[40px] border border-dashed ${isDark ? 'bg-[#0A0A0A] border-white/10' : 'bg-[#FAFAFA] border-black/10'}`}>
                <Text className="text-muted-foreground font-bold tracking-tighter opacity-40">No activity detected</Text>
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
