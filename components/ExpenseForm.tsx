import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, Alert } from 'react-native';
import database from '../database';
import { useCurrency } from '../context/CurrencyContext';

const CATEGORIES = [
  'Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Misc'
];

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const { symbolFor, currency } = useCurrency();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || !category || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid amount and category.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      await database.write(async () => {
        await database.get('expenses').create((expense: any) => {
          expense.amount = parsedAmount;
          expense.category = category;
          expense._currency = currency;
          expense.createdAt = new Date();
        });
      });
      setAmount('');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="w-full">
      <ScrollView 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-black text-foreground tracking-tighter">Add Expense</Text>
        <Text className="mb-8 text-lg text-muted-foreground font-bold italic opacity-60">Log your spending</Text>

        <View className="gap-y-8">
          <View>
            <Text className="mb-3 text-sm font-black text-foreground/40 uppercase tracking-[2px]">Amount ({symbolFor(currency)})</Text>
            <TextInput
              style={{ includeFontPadding: false }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              className="rounded-[24px] bg-[#151515] p-6 text-3xl font-black text-foreground border border-white/5 focus:border-destructive"
              placeholderTextColor="rgba(255,255,255,0.1)"
            />
          </View>

          <View>
            <Text className="mb-4 text-sm font-black text-foreground/40 uppercase tracking-[2px]">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-x-2">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  // ULTRA-STABILIZATION: Use inline styles for dynamic colors to avoid NativeWind interop crash on mobile
                  style={{
                    backgroundColor: category === cat ? '#f43f5e' : '#151515',
                    borderColor: category === cat ? '#f43f5e' : 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderRadius: 20,
                    paddingHorizontal: 20,
                    paddingVertical: 12
                  }}
                >
                  <Text
                    className={`font-black uppercase text-xs tracking-widest ${
                      category === cat ? 'text-[#050505]' : 'text-muted-foreground'
                    }`}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        <View className="mt-12 flex-row gap-x-4">
          <Pressable
            onPress={onCancel}
            className="flex-1 items-center rounded-[24px] bg-[#151515] py-6 border border-white/5"
          >
            <Text className="font-black uppercase tracking-widest text-xs text-muted-foreground">Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 items-center rounded-[24px] py-6 ${isSubmitting ? 'bg-destructive/50' : 'bg-destructive'}`}
          >
            <Text className="font-black uppercase tracking-widest text-[#050505] text-xs">
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
