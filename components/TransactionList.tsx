import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, LayoutAnimation, Platform, UIManager, TextInput, Pressable, Modal, Alert, ActivityIndicator, ScrollView, TouchableOpacity, Keyboard } from 'react-native';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import { BlurView } from 'expo-blur';
import database from '../database';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Transaction Item component
const TransactionItem = React.memo(({ 
  item, 
  type, 
  isExpanded, 
  onToggle, 
  onEdit 
}: { 
  item: any; 
  type: 'income' | 'expense';
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (item: any) => void;
}) => {
  const { format } = useCurrency();
  const { isDark } = useTheme();

  return (
    <Pressable 
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggle();
      }}
      className={`mb-4 overflow-hidden rounded-3xl border shadow-sm ${isDark ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-black/5'}`}
    >
      <View className="p-5 flex-row items-center justify-between">
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
            <Text className={`text-lg font-black tracking-tighter leading-tight ${isDark ? 'text-white' : 'text-black'}`}>
              {item.category}
            </Text>
            {item.description && (
              <Text className={`text-[10px] font-bold ${isDark ? 'text-white/60' : 'text-black/60'} mt-0.5`}>
                {item.description}
              </Text>
            )}
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

      {isExpanded && (
        <View className={`px-5 pb-5 pt-2 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <TouchableOpacity 
            onPress={() => onEdit(item)}
            className={`flex-row items-center justify-center py-3 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}
          >
            <Text className={`font-black text-[10px] uppercase tracking-[2px] ${isDark ? 'text-white/80' : 'text-black/80'}`}>
              Edit Transaction
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
  );
});

TransactionItem.displayName = 'TransactionItem';

import { SwipeableSheet } from './ui/SwipeableSheet';

// Edit Modal Component
const EditTransactionModal = ({ 
  visible, 
  onClose, 
  transaction, 
  isDark 
}: { 
  visible: boolean; 
  onClose: () => void; 
  transaction: any; 
  isDark: boolean;
}) => {
  const { symbolFor, currency } = useCurrency();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];
  const EXPENSE_CATEGORIES = ['Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Misc'];
  
  const categories = transaction?.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setCategory(transaction.category || '');
      setDescription(transaction.description || '');
    }
  }, [transaction]);

  const handleUpdate = async () => {
    if (!amount || !category) return;

    Alert.alert(
      "Confirm Update",
      "Are you sure you want to update this transaction? This will modify your history.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Update", 
          style: "default",
          onPress: async () => {
            setIsSaving(true);
            try {
              await database.write(async () => {
                const table = transaction.type === 'income' ? 'incomes' : 'expenses';
                const record = await database.get(table).find(transaction.id);
                await record.update((r: any) => {
                  r.amount = parseFloat(amount);
                  r.category = category;
                  r.description = description.trim() || null;
                  if (table === 'incomes') {
                    r.source = category; // Backwards compatibility
                  }
                  r.updatedAt = new Date();
                });
              });
              onClose();
            } catch (error) {
              Alert.alert("Error", "Failed to update transaction.");
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  if (!transaction) return null;

  return (
    <SwipeableSheet isVisible={visible} onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={Keyboard.dismiss} className="mb-4">
          <Text className={`text-2xl font-black tracking-tighter mb-1 ${isDark ? 'text-white' : 'text-black'}`}>Edit {transaction.type === 'income' ? 'Income' : 'Expense'}</Text>
          <Text className="text-muted-foreground text-[10px] font-black uppercase tracking-[2px] mb-8">Update your records</Text>

          <View className="gap-y-6">
            <View>
              <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-3 pl-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Amount ({symbolFor(transaction.currency || currency)})</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                className={`rounded-2xl p-5 text-3xl font-black border ${isDark ? 'bg-white/5 text-white border-white/10' : 'bg-black/5 text-black border-black/10'}`}
              />
            </View>

            <View>
              <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-3 pl-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`px-5 py-3 rounded-2xl border ${category === cat 
                      ? (transaction.type === 'income' ? 'bg-primary border-primary' : 'bg-destructive border-destructive') 
                      : (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')}`}
                  >
                    <Text className={`font-black text-[10px] uppercase tracking-widest ${category === cat ? 'text-[#050505]' : (isDark ? 'text-white/60' : 'text-black/60')}`}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-3 pl-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Description (Optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Additional details..."
                placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                className={`rounded-2xl p-5 text-lg font-bold border ${isDark ? 'bg-white/5 text-white border-white/10' : 'bg-black/5 text-black border-black/10'}`}
              />
            </View>
          </View>

          <View className="flex-row gap-x-4 mt-10">
            <TouchableOpacity 
              onPress={onClose}
              className={`flex-1 py-5 rounded-2xl items-center border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
            >
              <Text className={`font-black text-xs uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleUpdate}
              disabled={isSaving}
              className={`flex-1 py-5 rounded-2xl items-center shadow-lg ${transaction.type === 'income' ? 'bg-primary shadow-primary/20' : 'bg-destructive shadow-destructive/20'}`}
            >
              <Text className="text-[#050505] font-black text-xs uppercase tracking-widest">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </ScrollView>
    </SwipeableSheet>
  );
};

// Combined List component
const TransactionList = ({ incomes, expenses, Header }: { incomes: any[]; expenses: any[]; Header?: React.ComponentType<any> }) => {
  const { format, convertFrom, currency } = useCurrency();
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  
  const totalIncome = incomes.reduce((acc, i) => acc + convertFrom(i.amount || 0, i.currency || currency), 0);
  const totalExpense = expenses.reduce((acc, e) => acc + convertFrom(e.amount || 0, e.currency || currency), 0);
  const netBalance = totalIncome - totalExpense;

  const allTransactions = [
    ...incomes.map(i => ({ id: i.id, amount: i.amount, currency: i.currency, category: i.category, description: i.description, createdAt: i.createdAt, type: 'income' as const })),
    ...expenses.map(e => ({ id: e.id, amount: e.amount, currency: e.currency, category: e.category, description: e.description, createdAt: e.createdAt, type: 'expense' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredTransactions = allTransactions.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const category = item.category || '';
    const description = item.description || '';
    const amount = item.amount?.toString() || '';

    return (
      category.toLowerCase().includes(searchLower) ||
      description.toLowerCase().includes(searchLower) ||
      amount.includes(searchLower)
    );
  });

  // Apply layout animation when data changes (Native only)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [allTransactions.length]);

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditModalVisible(true);
  };

  return (
    <View className="flex-1 px-6">
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem 
            item={item} 
            type={item.type} 
            isExpanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onEdit={handleEdit}
          />
        )}
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

      <EditTransactionModal 
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setExpandedId(null);
        }}
        transaction={editingTransaction}
        isDark={isDark}
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
