import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, Alert, ScrollView } from 'react-native';
import database from '../database';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { generateUUID } from '../lib/id-utils';

interface IncomeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function IncomeForm({ onSuccess, onCancel }: IncomeFormProps) {
  const { symbolFor, currency } = useCurrency();
  const { isDark } = useTheme();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salary');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || !category || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid amount and select a category.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const trimmedDescription = description.trim() || null;

      await database.write(async () => {
        await database.get('incomes').create((income: any) => {
          income._raw.id = generateUUID();
          income.amount = parsedAmount;
          income.category = category;
          income.description = trimmedDescription;
          income._currency = currency;
          income.createdAt = new Date();
          income.updatedAt = new Date();
        });
      });
      setAmount('');
      setCategory('Salary');
      setDescription('');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save income:', error);
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
        <Text className={`text-3xl font-black ${isDark ? 'text-white' : 'text-black'}`}>Add Income</Text>
        <Text className={`mb-8 text-lg ${isDark ? 'text-white/60' : 'text-black/60'}`}>Log your earnings</Text>

        <View className="gap-y-6">
          <View>
            <Text className={`mb-3 text-sm font-bold uppercase tracking-tighter ${isDark ? 'text-white/60' : 'text-black/60'}`}>Amount ({symbolFor(currency)})</Text>
            <TextInput
              style={{ includeFontPadding: false }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              className={`rounded-2xl p-5 text-2xl font-bold border focus:border-primary ${isDark ? 'bg-white/5 text-white border-white/5' : 'bg-black/5 text-black border-black/5'}`}
              placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
            />
          </View>

          <View>
            <Text className={`mb-3 text-sm font-bold uppercase tracking-tighter ${isDark ? 'text-white/60' : 'text-black/60'}`}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {INCOME_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-5 py-3 rounded-2xl border ${category === cat ? 'bg-primary border-primary' : (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')}`}
                >
                  <Text className={`font-black text-[10px] uppercase tracking-widest ${category === cat ? (isDark ? 'text-[#050505]' : 'text-white') : 'text-muted-foreground'}`}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View>
            <Text className={`mb-3 text-sm font-bold uppercase tracking-tighter ${isDark ? 'text-white/60' : 'text-black/60'}`}>Description (Optional)</Text>
            <TextInput
              style={{ includeFontPadding: false }}
              placeholder="Enter additional details..."
              value={description}
              onChangeText={setDescription}
              className={`rounded-2xl p-5 text-xl font-medium border focus:border-primary ${isDark ? 'bg-white/5 text-white border-white/5' : 'bg-black/5 text-black border-black/5'}`}
              placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
            />
          </View>
        </View>

        <View className="mt-10 flex-row gap-x-4">
          <TouchableOpacity
            onPress={onCancel}
            className={`flex-1 items-center rounded-2xl py-5 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
          >
            <Text className={`font-bold ${isDark ? 'text-white/60' : 'text-black/60'}`}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 items-center rounded-2xl py-5 shadow-lg shadow-primary/20 ${isSubmitting ? 'bg-primary/50' : 'bg-primary'}`}
          >
            <Text className="font-bold text-primary-foreground text-lg">
              {isSubmitting ? 'Saving...' : 'Save Income'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
