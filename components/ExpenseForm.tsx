import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import database from '../database';
import { generateUUID } from '../lib/id-utils';

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const { symbolFor, currency } = useCurrency();
  const { isDark } = useTheme();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const CATEGORIES = [
    'Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Misc'
  ];

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || !category || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid amount and category.");
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedDescription = description.trim() || null;

      await database.write(async () => {
        await database.get('expenses').create((expense: any) => {
          expense._raw.id = generateUUID();
          expense.amount = parsedAmount;
          expense.category = category;
          expense.description = trimmedDescription;
          expense._currency = currency;
          expense.createdAt = new Date();
          expense.updatedAt = new Date();
        });
      });
      setAmount('');
      setDescription('');
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
        <Text className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>Add Expense</Text>
        <Text className={`mb-8 text-lg font-bold italic opacity-60 ${isDark ? 'text-white' : 'text-black'}`}>Log your spending</Text>

        <View className="gap-y-8">
          <View>
            <Text className={`mb-3 text-sm font-black uppercase tracking-[2px] ${isDark ? 'text-white/40' : 'text-black/40'}`}>Amount ({symbolFor(currency)})</Text>
            <TextInput
              style={{ includeFontPadding: false }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              className={`rounded-[24px] p-6 text-3xl font-black border focus:border-destructive ${isDark ? 'bg-white/5 text-white border-white/5' : 'bg-black/5 text-black border-black/5'}`}
              placeholderTextColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
            />
          </View>

          <View>
            <Text className={`mb-4 text-sm font-black uppercase tracking-[2px] ${isDark ? 'text-white/40' : 'text-black/40'}`}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="flex-row">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-5 py-3 rounded-2xl border ${category === cat 
                    ? 'bg-destructive border-destructive' 
                    : (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')}`}
                >
                  <Text
                    className={`font-black uppercase text-xs tracking-widest ${category === cat ? 'text-[#050505]' : (isDark ? 'text-white/60' : 'text-black/60')}`}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View>
            <Text className={`mb-3 text-sm font-black uppercase tracking-[2px] ${isDark ? 'text-white/40' : 'text-black/40'}`}>Description (Optional)</Text>
            <TextInput
              style={{ includeFontPadding: false }}
              placeholder="Enter additional details..."
              value={description}
              onChangeText={setDescription}
              className={`rounded-[24px] p-6 text-xl font-bold border focus:border-destructive ${isDark ? 'bg-white/5 text-white border-white/5' : 'bg-black/5 text-black border-black/5'}`}
              placeholderTextColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
            />
          </View>
        </View>

        <View className="mt-12 flex-row gap-x-4">
          <Pressable
            onPress={onCancel}
            className={`flex-1 items-center rounded-[24px] py-6 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
          >
            <Text className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-white/60' : 'text-black/60'}`}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 items-center rounded-[24px] py-6 shadow-lg shadow-destructive/20 ${isSubmitting ? 'bg-destructive/50' : 'bg-destructive'}`}
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
