import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import database from '../database';
import { useCurrency } from '../context/CurrencyContext';
import { generateUUID } from '../lib/id-utils';

const CATEGORY_PRESETS = ['Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Savings', 'Misc'];

interface BudgetFormProps {
  visible: boolean;
  onClose: () => void;
  editBudget?: any | null;
}

export const BudgetForm = ({ visible, onClose, editBudget }: BudgetFormProps) => {
  const { currency, symbolFor } = useCurrency();
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
          <BlurView intensity={30} className="rounded-t-[40px] overflow-hidden border-t border-white/10">
            <View className="bg-card/90 p-8 pt-4 pb-12">
              <View className="w-12 h-1.5 bg-white/10 rounded-full self-center mb-8" />
              
              <Text className="text-white font-black text-xl mb-2">
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
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase tracking-widest ${
                        category === preset ? 'text-[#050505]' : 'text-white/60'
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
                placeholderTextColor="rgba(255,255,255,0.2)"
                className="text-white text-base font-bold bg-white/5 rounded-2xl px-5 py-4 mb-6 border border-white/5"
              />

              {/* Amount Limit Input */}
              <Text className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest pl-1">
                Monthly Limit
              </Text>
              <TextInput
                value={amountLimit}
                onChangeText={setAmountLimit}
                placeholder={`${currentSymbol}0`}
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                className="text-white text-3xl font-black bg-white/5 rounded-2xl px-5 py-4 mb-8 border border-white/5"
              />

              {/* Actions */}
              <View className="flex-row gap-x-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 bg-white/5 py-4 rounded-2xl items-center border border-white/5"
                >
                  <Text className="text-white/60 font-black text-xs uppercase tracking-widest">Cancel</Text>
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
