import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import database from '../database';
import Goal from '../database/models/Goal';
import { IconSymbol } from './ui/icon-symbol';
import { useCurrency } from '../context/CurrencyContext';
import { generateUUID } from '../lib/id-utils';
import { useTheme } from '../context/ThemeContext';
import { SleekCalendar } from './ui/SleekCalendar';

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
  const [syncToCalendar, setSyncToCalendar] = useState(goal?.syncToCalendar || false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = async () => {
    if (!name || !targetAmount) return;

    try {
      await database.write(async () => {
        if (goal) {
          await goal.update((record: any) => {
            record.name = name;
            record.targetAmount = parseFloat(targetAmount);
            record.currentAmount = parseFloat(currentAmount);
            record.targetCompletionDate = targetCompletionDate.getTime();
            record.syncToCalendar = syncToCalendar;
          });
        } else {
          await database.get('goals').create((record: any) => {
            record._raw.id = generateUUID();
            record.name = name;
            record.targetAmount = parseFloat(targetAmount);
            record.currentAmount = parseFloat(currentAmount);
            record.targetCompletionDate = targetCompletionDate.getTime();
            record.syncToCalendar = syncToCalendar;
          });
        }
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  return (
    <View className="gap-y-6">
      <View>
        <Text className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
          {goal ? 'Refine Goal' : 'Set New Target'}
        </Text>
        <Text className="text-sm font-medium text-muted-foreground">
          {goal ? 'Adjust your vision for this target.' : 'Define what you are building towards.'}
        </Text>
      </View>

      <View className="gap-y-4">
        <View className={`rounded-3xl p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
          <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest pl-2">
            Goal Title
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. New Garage, Vacation Fund"
            placeholderTextColor="#4b5563"
            className={`text-lg font-bold px-2 py-1 ${isDark ? 'text-white' : 'text-black'}`}
          />
        </View>

        <View className={`rounded-3xl p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
          <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest pl-2">
            Target Amount ({currentSymbol})
          </Text>
          <TextInput
            value={targetAmount}
            onChangeText={setTargetAmount}
            placeholder="0.00"
            placeholderTextColor="#4b5563"
            keyboardType="numeric"
            className={`text-lg font-bold px-2 py-1 ${isDark ? 'text-white' : 'text-black'}`}
          />
        </View>

        {goal && (
          <View className={`rounded-3xl p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
            <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest pl-2">
              Saved Amount ({currentSymbol})
            </Text>
            <TextInput
              value={currentAmount}
              onChangeText={setCurrentAmount}
              placeholder="0.00"
              placeholderTextColor="#4b5563"
              keyboardType="numeric"
              className={`text-lg font-bold px-2 py-1 ${isDark ? 'text-white' : 'text-black'}`}
            />
          </View>
        )}

        <View className={`rounded-3xl p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
          <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest pl-2">
            Target Completion Date
          </Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} className="px-2 py-1">
            <Text className="text-lg font-bold text-primary">
              {targetCompletionDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </TouchableOpacity>
        </View>

        <View className={`rounded-3xl p-4 border flex-row justify-between items-center px-6 ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
           <View>
              <Text className={`font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>Sync to Google Calendar</Text>
              <Text className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Connect your timeline</Text>
           </View>
           <TouchableOpacity 
             onPress={() => setSyncToCalendar(!syncToCalendar)}
             className={`w-12 h-6 rounded-full p-1 ${syncToCalendar ? 'bg-primary' : (isDark ? 'bg-white/10' : 'bg-black/10')}`}
           >
              <View className={`w-4 h-4 rounded-full ${syncToCalendar ? 'self-end' : 'self-start'} ${isDark ? 'bg-white' : 'bg-white shadow'}`} />
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

      <View className="flex-row gap-x-4 pt-4">
        <TouchableOpacity 
          onPress={onCancel}
          className={`flex-1 rounded-2xl p-5 items-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
        >
          <Text className={`font-black text-[12px] uppercase tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleSubmit}
          className="flex-1 bg-primary rounded-2xl p-5 items-center"
        >
          <Text className="text-primary-foreground font-black text-[12px] uppercase tracking-widest">
            {goal ? 'Update Goal' : 'Lock It In'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
