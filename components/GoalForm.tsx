import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import database from '../database';
import Goal from '../database/models/Goal';
import { IconSymbol } from './ui/icon-symbol';
import { useCurrency } from '../context/CurrencyContext';
import { generateUUID } from '../lib/id-utils';
import { useTheme } from '../context/ThemeContext';
import { SleekCalendar } from './ui/SleekCalendar';
import { supabase } from '../lib/supabase';
import { CustomAlert } from './ui/CustomAlert';

interface GoalFormProps {
  goal?: Goal | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const GoalForm = ({ goal, onSuccess, onCancel }: GoalFormProps) => {
  const { isDark } = useTheme();
  const { currency, symbolFor } = useCurrency();
  const currentSymbol = symbolFor(currency);
  const [name, setName] = useState(goal?.name || '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount?.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount?.toString() || '0');
  const [targetCompletionDate, setTargetCompletionDate] = useState<Date>(
    goal?.targetCompletionDate ? new Date(goal.targetCompletionDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = async () => {
    if (!name || !targetAmount) return;

    const newAmount = parseFloat(currentAmount) || 0;
    const oldAmount = goal?.currentAmount || 0;
    const delta = newAmount - oldAmount;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;

      if (!userId) return;

      await database.write(async () => {
        if (goal) {
          await goal.update((record: any) => {
            record.name = name;
            record.targetAmount = parseFloat(targetAmount);
            record.currentAmount = newAmount;
            record.targetCompletionDate = targetCompletionDate.getTime();
          });
        } else {
          await database.get('goals').create((record: any) => {
            record._raw.id = generateUUID();
            record.name = name;
            record.targetAmount = parseFloat(targetAmount);
            record.currentAmount = newAmount;
            record.targetCompletionDate = targetCompletionDate.getTime();
            record.userId = userId;
          });
        }

        // If the user increased their savings, record it as a transaction to deduct from liquidity
        if (delta > 0) {
          await database.get('expenses').create((exp: any) => {
            exp._raw.id = generateUUID();
            exp.amount = delta;
            exp.category = 'Goals';
            exp.description = `Contribution: ${name}`;
            exp._currency = currency;
            exp.userId = userId;
            const now = new Date();
            exp.createdAt = now;
            exp.updatedAt = now;
          });
        }
      });
      onSuccess();
    } catch (error) {
      console.error('[GoalForm] Failed to save goal:', error);
    }
  };

  const handleDelete = async () => {
    if (!goal) return;

    // Use a standard Alert for confirmation
    CustomAlert.alert(
      'Delete Goal',
      `Are you sure you want to remove "${goal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await goal.markAsDeleted();
                await goal.destroyPermanently();
              });
              onSuccess();
            } catch (error) {
              console.error('Failed to delete goal:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <View className="gap-y-6">
      <View>
        <Text className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
          {goal ? 'Refine Goal' : 'Set New Target'}
        </Text>
        <Text className={`text-xs font-medium mt-0.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
          {goal ? 'Adjust your vision for this target.' : 'Define what you are building towards.'}
        </Text>
      </View>

      <View className="gap-y-4">
        <View className={`rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
          <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
            Goal Title
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. New Garage, Vacation Fund"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
            style={{ includeFontPadding: false }}
            className={`text-base font-bold px-1 h-10 ${isDark ? 'text-white' : 'text-black'}`}
          />
        </View>

        <View className="flex-row gap-x-gsd-sm">
          <View className={`flex-1 rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
            <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
              Target ({currency})
            </Text>
            <TextInput
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="0.00"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
              keyboardType="numeric"
              style={{ includeFontPadding: false }}
              className={`text-base font-bold px-1 h-10 ${isDark ? 'text-white' : 'text-black'}`}
            />
          </View>

          {goal && (
            <View className={`flex-1 rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
              <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                Saved ({currency})
              </Text>
              <TextInput
                value={currentAmount}
                onChangeText={setCurrentAmount}
                placeholder="0.00"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
                keyboardType="numeric"
                style={{ includeFontPadding: false }}
                className={`text-base font-bold px-1 h-10 ${isDark ? 'text-white' : 'text-black'}`}
              />
            </View>
          )}
        </View>

        <View className={`rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
          <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
            Target Completion Date
          </Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} className="px-1 h-10 justify-center">
            <Text className="text-base font-bold text-primary">
              {targetCompletionDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Advanced Calendar Modal */}
      <SleekCalendar 
        isVisible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={targetCompletionDate}
        onSelect={(date) => setTargetCompletionDate(date)}
        title="Set Target Date"
      />

      <View className="gap-y-2 pt-2">
        <View className="flex-row gap-x-gsd-md">
          <TouchableOpacity 
            onPress={onCancel}
            className={`flex-1 rounded-xl p-gsd-md items-center border ${isDark ? 'border-white/10' : 'border-black/10'}`}
          >
            <Text className={`font-black text-[11px] uppercase tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSubmit}
            className="flex-1 bg-primary rounded-xl p-gsd-md items-center"
          >
            <Text className={`font-black text-[11px] uppercase tracking-widest ${isDark ? 'text-[#050505]' : 'text-white'}`}>
              {goal ? 'Update' : 'Commit'}
            </Text>
          </TouchableOpacity>
        </View>

        {goal && (
           <TouchableOpacity 
             onPress={handleDelete}
             className="w-full rounded-xl p-gsd-md items-center border border-destructive/20 mt-2"
           >
              <Text className="text-destructive font-black text-[11px] uppercase tracking-widest">Terminate Goal</Text>
           </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
