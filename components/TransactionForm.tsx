import React, { useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { CurrencyCode, SUPPORTED_CURRENCIES, useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import database from '../database';
import { generateUUID } from '../lib/id-utils';
import { fetchExchangeRate } from '../lib/market-service';

interface TransactionFormProps {
  initialType?: 'income' | 'expense';
  onSuccess?: () => void;
}

export default function TransactionForm({ initialType = 'expense', onSuccess }: TransactionFormProps) {
  const { user, loading: authLoading } = useAuth();
  const { currency, symbolFor } = useCurrency();
  const { isDark } = useTheme();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [txCurrency, setTxCurrency] = useState<CurrencyCode>(currency);
  const [isHydrated, setIsHydrated] = React.useState(false);

  const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Allowance', 'Other'];
  const EXPENSE_CATEGORIES = [
    'Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Other'
  ];

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  React.useEffect(() => {
    // Definitive mobile stabilization: Delay interactive mount to let native context settle
    const transitionTimer = setTimeout(() => {
      setIsHydrated(true);
      setTxCurrency(currency); // Sync with detected currency on mount
    }, 50);
    return () => clearTimeout(transitionTimer);
  }, [currency]);

  // Set default category when type changes
  React.useEffect(() => {
    setCategory(categories[0]);
  }, [type]);

  if (authLoading || !user || !isHydrated) {
    return (
      <View className={`h-[300px] items-center justify-center rounded-[32px] border ${isDark ? 'bg-card/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  async function handleSubmit() {
    if (!amount || !category || !user) {
      Alert.alert('Incomplete Data', 'Please enter an amount and select a category.');
      return;
    }

    try {
      const inputAmount = parseFloat(amount);
      const isForeign = txCurrency !== currency;

      let finalAmount = inputAmount;
      if (isForeign) {
        try {
          // Await live authoritative conversion to ensure the database record is 100% accurate
          const rate = await fetchExchangeRate(currency, txCurrency);
          finalAmount = inputAmount * rate;
        } catch (error) {
          Alert.alert('Conversion Failed', 'Could not perform live currency conversion. Please check your network connection.');
          return;
        }
      }

      const trimmedDescription = description.trim() || null;

      await database.write(async () => {
        if (type === 'income') {
          await database.get('incomes').create((record: any) => {
            record._raw.id = generateUUID();
            record.amount = finalAmount;
            record.category = category;
            record.description = trimmedDescription;
            record._currency = currency;
            record.userId = user.id;
            record.createdAt = new Date();
            record.updatedAt = new Date();
          });
        } else {
          await database.get('expenses').create((record: any) => {
            record._raw.id = generateUUID();
            record.amount = finalAmount;
            record.category = category;
            record.description = trimmedDescription;
            record._currency = currency;
            record.userId = user.id;
            record.createdAt = new Date();
            record.updatedAt = new Date();
          });
        }
      });

      setAmount('');
      setDescription('');
      if (onSuccess) onSuccess();
      Alert.alert('Success', `${type} added locally!`);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  }

  return (
    <View className={`p-6 rounded-[32px] border ${isDark ? 'bg-card/40 border-white/5' : 'bg-black/[0.03] border-black/5'}`}>
      <Pressable onPress={Keyboard.dismiss}>
        {/* Hide toggle if we have a locked initialType */}
        {!initialType && (
          <View className={`flex-row p-1 rounded-2xl mb-8 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
            <Pressable
              className={`flex-1 py-3 rounded-xl items-center ${type === 'expense' ? (isDark ? 'bg-white/10 shadow-sm' : 'bg-white shadow-sm') : ''}`}
              onPress={() => setType('expense')}
            >
              <Text className={`font-black text-[11px] uppercase tracking-widest ${type === 'expense' ? (isDark ? 'text-white' : 'text-black') : 'text-muted-foreground'}`}>Expense</Text>
            </Pressable>
            <Pressable
              className={`flex-1 py-3 rounded-xl items-center ${type === 'income' ? (isDark ? 'bg-white/10 shadow-sm' : 'bg-white shadow-sm') : ''}`}
              onPress={() => setType('income')}
            >
              <Text className={`font-black text-[11px] uppercase tracking-widest ${type === 'income' ? (isDark ? 'text-white' : 'text-black') : 'text-muted-foreground'}`}>Income</Text>
            </Pressable>
          </View>
        )}

        <View className="gap-y-6">
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 mb-3 pl-1">Amount ({symbolFor(txCurrency)})</Text>
            <View className={`border rounded-2xl px-5 py-4 ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}>
              <TextInput
                style={{ includeFontPadding: false }}
                className={`text-4xl font-black py-2 h-16 ${isDark ? 'text-white' : 'text-black'}`}
                placeholder="0.00"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <View>
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 mb-3 pl-1">Currency</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {[...SUPPORTED_CURRENCIES].sort((a, b) => a.code === txCurrency ? -1 : b.code === txCurrency ? 1 : 0).map((info) => (
                <Pressable
                  key={info.code}
                  onPress={() => setTxCurrency(info.code)}
                  className={`px-5 py-3 rounded-2xl border ${txCurrency === info.code
                    ? 'bg-primary border-primary'
                    : (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')
                    }`}
                >
                  <Text className={`font-black text-[10px] uppercase tracking-widest ${txCurrency === info.code ? (isDark ? 'text-[#050505]' : 'text-white') : 'text-muted-foreground'
                    }`}>
                    {info.code}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View>
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 mb-3 pl-1">Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-5 py-3 rounded-2xl border ${category === cat
                    ? 'bg-primary border-primary'
                    : (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')
                    }`}
                >
                  <Text className={`font-black text-[10px] uppercase tracking-widest ${category === cat ? (isDark ? 'text-[#050505]' : (isDark ? 'text-white/60' : 'text-black/60')) : 'text-muted-foreground'
                    }`}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View>
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 mb-3 pl-1">Description (Optional)</Text>
            <View className={`border rounded-2xl px-5 py-4 ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}>
              <TextInput
                style={{ includeFontPadding: false }}
                className={`text-lg font-bold py-2 h-14 ${isDark ? 'text-white' : 'text-black'}`}
                placeholder="Enter additional details..."
                placeholderTextColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          <Pressable
            className={`mt-4 overflow-hidden rounded-2xl`}
            onPress={handleSubmit}
          >
            {({ pressed }) => (
              <View className={`py-4 items-center ${type === 'expense' ? 'bg-destructive/80' : 'bg-primary'} ${pressed ? 'opacity-70' : ''}`}>
                <Text className={`font-black text-sm uppercase tracking-widest ${isDark ? 'text-white' : 'text-[#050505]'}`}>
                  Lock In {type}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}
