import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import database from '../database';
import { useAuth } from '../context/AuthContext';
import { useCurrency, SUPPORTED_CURRENCIES, CurrencyCode } from '../context/CurrencyContext';

interface TransactionFormProps {
  initialType?: 'income' | 'expense';
  onSuccess?: () => void;
}

export default function TransactionForm({ initialType = 'expense', onSuccess }: TransactionFormProps) {
  const { user, loading: authLoading } = useAuth();
  const { currency, symbolFor, convertFrom } = useCurrency();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [txCurrency, setTxCurrency] = useState<CurrencyCode>(currency);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    // Definitive mobile stabilization: Delay interactive mount to let native context settle
    const transitionTimer = setTimeout(() => {
      setIsHydrated(true);
      setTxCurrency(currency); // Sync with detected currency on mount
    }, 50);
    return () => clearTimeout(transitionTimer);
  }, [currency]);

  if (authLoading || !user || !isHydrated) {
    return (
      <View className="h-[300px] items-center justify-center bg-card/40 rounded-[32px] border border-white/5">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  async function handleSubmit() {
    if (!amount || !description || !user) return;

    try {
      const inputAmount = parseFloat(amount);
      const isForeign = txCurrency !== currency;
      const finalAmount = isForeign ? convertFrom(inputAmount, txCurrency) : inputAmount;
      const finalDescription = isForeign 
        ? `${description} (from ${symbolFor(txCurrency)}${inputAmount.toFixed(2)})`
        : description;

      await database.write(async () => {
        if (type === 'income') {
          await database.get('incomes').create((record: any) => {
            record.amount = finalAmount;
            record.source = finalDescription;
            record._currency = currency;
            record.userId = user.id;
            record.createdAt = new Date();
            record.updatedAt = new Date();
          });
        } else {
          await database.get('expenses').create((record: any) => {
            record.amount = finalAmount;
            record.category = finalDescription;
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
    <View className="bg-card/40 p-6 rounded-[32px] border border-white/5">
      {/* Hide toggle if we have a locked initialType */}
      {!initialType && (
        <View className="flex-row bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
          <Pressable 
            className={`flex-1 py-3 rounded-xl items-center ${type === 'expense' ? 'bg-white/10 shadow-sm' : ''}`}
            onPress={() => setType('expense')}
          >
            <Text className={`font-black text-[11px] uppercase tracking-widest ${type === 'expense' ? 'text-white' : 'text-muted-foreground'}`}>Expense</Text>
          </Pressable>
          <Pressable 
            className={`flex-1 py-3 rounded-xl items-center ${type === 'income' ? 'bg-white/10 shadow-sm' : ''}`}
            onPress={() => setType('income')}
          >
            <Text className={`font-black text-[11px] uppercase tracking-widest ${type === 'income' ? 'text-white' : 'text-muted-foreground'}`}>Income</Text>
          </Pressable>
        </View>
      )}

      <View className="gap-y-6">
        <View>
          <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 mb-3 pl-1">Amount ({symbolFor(txCurrency)})</Text>
          <View className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4">
            <TextInput
              className="text-4xl font-black text-white p-0"
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.1)"
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
                className={`px-5 py-3 rounded-2xl border ${
                  txCurrency === info.code 
                    ? 'bg-primary border-primary' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <Text className={`font-black text-[10px] uppercase tracking-widest ${
                  txCurrency === info.code ? 'text-white' : 'text-muted-foreground'
                }`}>
                  {info.code}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 mb-3 pl-1">
            {type === 'income' ? 'Source' : 'Category'}
          </Text>
          <View className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4">
            <TextInput
              className="text-lg font-bold text-white p-0"
              placeholder={type === 'income' ? 'e.g. Salary' : 'e.g. Shopping'}
            placeholderTextColor="rgba(255,255,255,0.1)"
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
              <Text className="text-white font-black text-sm uppercase tracking-widest">
                Lock In {type}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
