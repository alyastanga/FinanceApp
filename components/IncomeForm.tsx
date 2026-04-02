import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, Alert, ScrollView } from 'react-native';
import database from '../database';

interface IncomeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function IncomeForm({ onSuccess, onCancel }: IncomeFormProps) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || !source || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid amount and source.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      await database.write(async () => {
        await database.get('incomes').create((income: any) => {
          income.amount = parsedAmount;
          income.source = source;
          income.createdAt = new Date();
        });
      });
      setAmount('');
      setSource('');
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
        <Text className="text-3xl font-black text-foreground">Add Income</Text>
        <Text className="mb-8 text-lg text-muted-foreground">Log your earnings</Text>

        <View className="gap-y-6">
          <View>
            <Text className="mb-3 text-sm font-bold text-foreground/60 uppercase tracking-tighter">Amount ($)</Text>
            <TextInput
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              className="rounded-2xl bg-muted p-5 text-2xl font-bold text-foreground border border-white/5 focus:border-primary"
              placeholderTextColor="#475569"
            />
          </View>

          <View>
            <Text className="mb-3 text-sm font-bold text-foreground/60 uppercase tracking-tighter">Source</Text>
            <TextInput
              placeholder="e.g. Salary, Freelance"
              value={source}
              onChangeText={setSource}
              className="rounded-2xl bg-muted p-5 text-xl font-medium text-foreground border border-white/5 focus:border-primary"
              placeholderTextColor="#475569"
            />
          </View>
        </View>

        <View className="mt-10 flex-row gap-x-4">
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1 items-center rounded-2xl bg-muted py-5 border border-white/5"
          >
            <Text className="font-bold text-muted-foreground">Cancel</Text>
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
