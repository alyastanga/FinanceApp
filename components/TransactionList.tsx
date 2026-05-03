import withObservables from '@nozbe/watermelondb/react/withObservables';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Keyboard, LayoutAnimation, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import database from '../database';
import { SwipeableSheet } from './ui/SwipeableSheet';

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
            className={`h-12 w-12 rounded-2xl items-center justify-center ${type === 'income' ? 'bg-primary/10' : 'bg-destructive/10'
              }`}
          >
            <View
              className={`h-3 w-3 rounded-full ${type === 'income' ? 'bg-primary shadow-sm shadow-primary' : 'bg-destructive shadow-sm shadow-destructive'
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
            className={`text-xl font-black tracking-tighter ${type === 'income' ? 'text-primary' : 'text-destructive'
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

// Filter Dropdown Component
const FilterSelector = ({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  isDark
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: string[];
  selectedValue: string;
  onSelect: (val: string) => void;
  isDark: boolean;
}) => {
  return (
    <SwipeableSheet isVisible={visible} onClose={onClose}>
      <View className="pb-8">
        <Text className={`text-xl font-black tracking-tighter mb-1 ${isDark ? 'text-white' : 'text-black'}`}>{title}</Text>
        <Text className="text-muted-foreground text-[10px] font-black uppercase tracking-[2px] mb-6">Select to filter results</Text>

        <ScrollView className="max-h-[400px]" showsVerticalScrollIndicator={false}>
          <View className="gap-y-2">
            {['All', ...options].map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  onSelect(opt);
                  onClose();
                }}
                className={`p-5 rounded-2xl border flex-row justify-between items-center ${selectedValue === opt
                  ? (isDark ? 'bg-primary border-primary' : 'bg-primary border-primary')
                  : (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')}`}
              >
                <Text className={`font-black text-xs uppercase tracking-widest ${selectedValue === opt ? 'text-[#050505]' : (isDark ? 'text-white/80' : 'text-black/80')}`}>
                  {opt}
                </Text>
                {selectedValue === opt && <Text className="text-sm">✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </SwipeableSheet>
  );
};

// Combined List component
const TransactionList = ({ incomes, expenses, Header }: { incomes: any[]; expenses: any[]; Header?: React.ComponentType<any> }) => {
  const { format, convertFrom, currency } = useCurrency();
  const { isDark } = useTheme();

  // Search & Basic UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  // Advanced Filter State
  const [filterYear, setFilterYear] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');

  // Selector UI State
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorTitle, setSelectorTitle] = useState('');
  const [selectorOptions, setSelectorOptions] = useState<string[]>([]);
  const [selectorTarget, setSelectorTarget] = useState<'year' | 'month' | 'category' | 'type'>('year');

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const allTransactionsRaw = useMemo(() => [
    ...incomes.map(i => ({ id: i.id, amount: i.amount, currency: i.currency, category: i.category, description: i.description, createdAt: i.createdAt, type: 'income' as const })),
    ...expenses.map(e => ({ id: e.id, amount: e.amount, currency: e.currency, category: e.category, description: e.description, createdAt: e.createdAt, type: 'expense' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [incomes, expenses]);

  // Dynamic Options Extraction
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    allTransactionsRaw.forEach(t => {
      const year = new Date(t.createdAt).getFullYear().toString();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allTransactionsRaw]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    allTransactionsRaw.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [allTransactionsRaw]);

  const totalIncome = incomes.reduce((acc, i) => acc + convertFrom(i.amount || 0, i.currency || currency), 0);
  const totalExpense = expenses.reduce((acc, e) => acc + convertFrom(e.amount || 0, e.currency || currency), 0);
  const netBalance = totalIncome - totalExpense;

  const filteredTransactions = allTransactionsRaw.filter(item => {
    const date = new Date(item.createdAt);
    const itemYear = date.getFullYear().toString();
    const itemMonth = MONTHS[date.getMonth()];

    // Search Filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (item.category || '').toLowerCase().includes(searchLower) ||
      (item.description || '').toLowerCase().includes(searchLower) ||
      (item.amount?.toString() || '').includes(searchLower);

    // Year Filter
    const matchesYear = filterYear === 'All' || itemYear === filterYear;

    // Month Filter
    const matchesMonth = filterMonth === 'All' || itemMonth === filterMonth;

    // Category Filter
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;

    // Type Filter
    const matchesType = filterType === 'All' || (filterType === 'Inflow' ? item.type === 'income' : item.type === 'expense');

    return matchesSearch && matchesYear && matchesMonth && matchesCategory && matchesType;
  });

  // Apply layout animation when filters change
  useEffect(() => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [filterYear, filterMonth, filterCategory, filterType, searchQuery]);

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditModalVisible(true);
  };

  const openSelector = (type: 'year' | 'month' | 'category' | 'type') => {
    setSelectorTarget(type);
    if (type === 'year') {
      setSelectorTitle('Select Year');
      setSelectorOptions(uniqueYears);
    } else if (type === 'month') {
      setSelectorTitle('Select Month');
      setSelectorOptions(MONTHS);
    } else if (type === 'category') {
      setSelectorTitle('Select Category');
      setSelectorOptions(uniqueCategories);
    } else {
      setSelectorTitle('Transaction Type');
      setSelectorOptions(['Inflow', 'Outflow']);
    }
    setSelectorVisible(true);
  };

  const currentSelectedValue = () => {
    if (selectorTarget === 'year') return filterYear;
    if (selectorTarget === 'month') return filterMonth;
    if (selectorTarget === 'category') return filterCategory;
    return filterType;
  };

  const handleSelect = (val: string) => {
    if (selectorTarget === 'year') setFilterYear(val);
    else if (selectorTarget === 'month') setFilterMonth(val);
    else if (selectorTarget === 'category') setFilterCategory(val);
    else setFilterType(val);
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
                placeholder="Search history..."
                placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                className={`flex-1 font-bold ${isDark ? 'text-white' : 'text-black'}`}
              />
            </View>

            {/* Filter Dropdowns */}
            <View className="mb-10">
              <Text className={`text-[9px] font-black uppercase tracking-[2px] mb-3 pl-2 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Advanced Filters</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingLeft: 4 }}>
                {[
                  { id: 'year', label: filterYear === 'All' ? 'Year' : filterYear, active: filterYear !== 'All' },
                  { id: 'month', label: filterMonth === 'All' ? 'Month' : filterMonth, active: filterMonth !== 'All' },
                  { id: 'type', label: filterType === 'All' ? 'Type' : filterType, active: filterType !== 'All' },
                  { id: 'category', label: filterCategory === 'All' ? 'Category' : filterCategory, active: filterCategory !== 'All' }
                ].map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => openSelector(f.id as any)}
                    className={`flex-row items-center px-5 py-3 rounded-2xl border ${f.active
                      ? (isDark ? 'bg-primary border-primary' : 'bg-primary border-primary')
                      : (isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5')}`}
                  >
                    <Text className={`font-black text-[10px] uppercase tracking-widest ${f.active ? 'text-[#050505]' : (isDark ? 'text-white/60' : 'text-black/60')}`}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {(filterYear !== 'All' || filterMonth !== 'All' || filterCategory !== 'All' || filterType !== 'All') && (
                  <TouchableOpacity
                    onPress={() => {
                      setFilterYear('All');
                      setFilterMonth('All');
                      setFilterCategory('All');
                      setFilterType('All');
                    }}
                    className="px-4 py-3 items-center justify-center"
                  >
                    <Text className="text-destructive font-black text-[9px] uppercase tracking-widest">Reset</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* Overall Summary Panel */}
            <View className={`mb-10 rounded-[48px] border p-8 shadow-2xl overflow-hidden ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-[#FFFFFF] border-black/5'}`}>
              <View className="flex-row justify-between items-center mb-8">
                <View>
                  <Text className={`text-[10px] font-black tracking-[4px] uppercase mb-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Flow Summary</Text>
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
                  <Text className={`text-[9px] font-black uppercase tracking-[2px] mb-2 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Incomes</Text>
                  <View className={`rounded-[24px] p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <Text className="text-primary font-black text-lg tracking-tight">
                      +{format(totalIncome)}
                    </Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className={`text-[9px] font-black uppercase tracking-[2px] mb-2 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Expenses</Text>
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
                Filtered Activity
              </Text>
            </View>
            {filteredTransactions.length === 0 && (
              <View className={`items-center justify-center py-20 rounded-[40px] border border-dashed ${isDark ? 'bg-[#0A0A0A] border-white/10' : 'bg-[#FAFAFA] border-black/10'}`}>
                <Text className="text-muted-foreground font-bold tracking-tighter opacity-40">No transactions match your filters</Text>
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

      <FilterSelector
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        title={selectorTitle}
        options={selectorOptions}
        selectedValue={currentSelectedValue()}
        onSelect={handleSelect}
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
