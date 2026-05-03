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
    <View className="flex-1">
      <Pressable onPress={Keyboard.dismiss}>
        {/* Hide toggle if we have a locked initialType */}
        {!initialType && (
          <View className={`flex-row p-1 rounded-xl mb-6 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
            <Pressable
              className={`flex-1 py-2 rounded-lg items-center ${type === 'expense' ? (isDark ? 'bg-white/10 shadow-sm' : 'bg-white shadow-sm') : ''}`}
              onPress={() => setType('expense')}
            >
              <Text className={`font-bold text-[10px] uppercase tracking-widest ${type === 'expense' ? (isDark ? 'text-white' : 'text-black') : 'text-muted-foreground/60'}`}>Expense</Text>
            </Pressable>
            <Pressable
              className={`flex-1 py-2 rounded-lg items-center ${type === 'income' ? (isDark ? 'bg-white/10 shadow-sm' : 'bg-white shadow-sm') : ''}`}
              onPress={() => setType('income')}
            >
              <Text className={`font-bold text-[10px] uppercase tracking-widest ${type === 'income' ? (isDark ? 'text-white' : 'text-black') : 'text-muted-foreground/60'}`}>Income</Text>
            </Pressable>
          </View>
        )}

        <View className="gap-y-4">
          <View>
            <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Amount ({txCurrency})</Text>
            <View className={`rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
              <TextInput
                style={{ includeFontPadding: false }}
                className={`text-4xl font-black py-2 h-14 ${isDark ? 'text-white' : 'text-black'}`}
                placeholder="0.00"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <View>
            <Text className={`text-[11px] font-semibold mb-1 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Currency</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {[...SUPPORTED_CURRENCIES].sort((a, b) => a.code === txCurrency ? -1 : b.code === txCurrency ? 1 : 0).map((info) => (
                <Pressable
                  key={info.code}
                  onPress={() => setTxCurrency(info.code)}
                  className={`px-3 py-1.5 rounded-lg border ${txCurrency === info.code
                    ? 'bg-primary border-primary'
                    : (isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5')
                    }`}
                >
                  <Text className={`font-bold text-[9px] uppercase tracking-widest ${txCurrency === info.code ? (isDark ? 'text-[#050505]' : 'text-white') : 'text-muted-foreground/60'
                    }`}>
                    {info.code}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View>
            <Text className={`text-[11px] font-semibold mb-1 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg border ${category === cat
                    ? 'bg-primary border-primary'
                    : (isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5')
                    }`}
                >
                  <Text className={`font-bold text-[9px] uppercase tracking-widest ${category === cat ? (isDark ? 'text-[#050505]' : 'text-black/60') : 'text-muted-foreground/60'
                    }`}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View>
            <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Description</Text>
            <View className={`rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
              <TextInput
                style={{ includeFontPadding: false }}
                className={`text-base font-bold py-2 h-10 ${isDark ? 'text-white' : 'text-black'}`}
                placeholder="Optional details..."
                placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          <Pressable
            className={`mt-2 overflow-hidden rounded-xl`}
            onPress={handleSubmit}
          >
            {({ pressed }) => (
              <View className={`py-3 items-center ${type === 'expense' ? 'bg-destructive/80' : 'bg-primary'} ${pressed ? 'opacity-70' : ''}`}>
                <Text className={`font-black text-[11px] uppercase tracking-widest ${isDark ? 'text-white' : 'text-[#050505]'}`}>
                  Commit {type}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}
