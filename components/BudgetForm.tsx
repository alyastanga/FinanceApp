import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import database from '../database';
import { useCurrency } from '../context/CurrencyContext';
import { generateUUID } from '../lib/id-utils';

import { useTheme } from '../context/ThemeContext';

const CATEGORY_PRESETS = ['Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Insurance', 'Subscriptions', 'Savings', 'Misc'];

interface BudgetFormProps {
  visible: boolean;
  onClose: () => void;
  editBudget?: any | null;
}

export const BudgetForm = ({ visible, onClose, editBudget }: BudgetFormProps) => {
  const { currency, symbolFor } = useCurrency();
  const { isDark } = useTheme();
  const currentSymbol = symbolFor(currency);
  const [category, setCategory] = useState('');
  const [amountLimit, setAmountLimit] = useState('');

  // Sync state with editBudget when it changes
  useEffect(() => {
    if (editBudget) {
      setCategory(editBudget.category || '');
      setAmountLimit(editBudget.amountLimit?.toString() || '');
    } else {
      setCategory('');
      setAmountLimit('');
    }
  }, [editBudget, visible]);

  const handleSubmit = async () => {
    if (!category || !amountLimit) return;

    try {
      await database.write(async () => {
        if (editBudget) {
          await editBudget.update((record: any) => {
            record.category = category;
            record.amountLimit = parseFloat(amountLimit);
          });
        } else {
          await database.get('budgets').create((record: any) => {
            record._raw.id = generateUUID();
            record.category = category;
            record.amountLimit = parseFloat(amountLimit);
          });
        }
      });
      onClose();
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50">
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onClose} 
        className="absolute inset-0 bg-black/80"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()} 
          className="w-full"
        >
          <BlurView intensity={isDark ? 30 : 80} tint={isDark ? "dark" : "light"} className={`rounded-t-[40px] overflow-hidden border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <View className={`p-8 pt-4 pb-12 ${isDark ? 'bg-[#0A0A0A]/90' : 'bg-[#FAFAFA]/90'}`}>
              <View className={`w-12 h-1.5 rounded-full self-center mb-8 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
              
              <Text className={`font-black text-xl mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
                {editBudget ? 'Edit Budget' : 'Create Budget'}
              </Text>
              <Text className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-8">
                Set your spending limit
              </Text>

              {/* Category Preset Chips */}
              <Text className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest pl-1">
                Category
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {CATEGORY_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => setCategory(preset)}
                    className={`px-4 py-2 rounded-2xl border ${
                      category === preset
                        ? 'bg-primary border-primary'
                        : (isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5')
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase tracking-widest ${
                        category === preset ? (isDark ? 'text-[#050505]' : 'text-white') : (isDark ? 'text-white/60' : 'text-black/60')
                      }`}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Category Input */}
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="Or type a custom category..."
                placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                className={`text-base font-bold rounded-2xl px-5 py-4 mb-6 border ${isDark ? 'text-white bg-white/5 border-white/5' : 'text-black bg-black/5 border-black/5'}`}
              />

              {/* Amount Limit Input */}
              <Text className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest pl-1">
                Monthly Limit
              </Text>
              <TextInput
                value={amountLimit}
                onChangeText={setAmountLimit}
                placeholder={`${currentSymbol}0`}
                placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                keyboardType="numeric"
                className={`text-3xl font-black rounded-2xl px-5 py-4 mb-8 border ${isDark ? 'text-white bg-white/5 border-white/5' : 'text-black bg-black/5 border-black/5'}`}
              />

              {/* Actions */}
              <View className="flex-row gap-x-3">
                <TouchableOpacity
                  onPress={onClose}
                  className={`flex-1 py-4 rounded-2xl items-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
                >
                  <Text className={`font-black text-xs uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  className="flex-1 bg-primary py-4 rounded-2xl items-center"
                >
                  <Text className="text-[#050505] font-black text-xs uppercase tracking-widest">
                    {editBudget ? 'Update' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
};
