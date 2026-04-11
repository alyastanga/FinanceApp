import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import database from '../database';
import Goal from '../database/models/Goal';
import { IconSymbol } from './ui/icon-symbol';
import { useCurrency } from '../context/CurrencyContext';
import { generateUUID } from '../lib/id-utils';

interface GoalFormProps {
  goal?: Goal | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const GoalForm = ({ goal, onSuccess, onCancel }: GoalFormProps) => {
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
  const [currentMonth, setCurrentMonth] = useState(new Date(targetCompletionDate.getFullYear(), targetCompletionDate.getMonth(), 1));

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
        <Text className="text-3xl font-black text-white mb-2">
          {goal ? 'Refine Goal' : 'Set New Target'}
        </Text>
        <Text className="text-sm font-medium text-muted-foreground">
          {goal ? 'Adjust your vision for this target.' : 'Define what you are building towards.'}
        </Text>
      </View>

      <View className="gap-y-4">
        <View className="bg-white/5 rounded-3xl p-4 border border-white/5">
          <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest pl-2">
            Goal Title
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. New Garage, Vacation Fund"
            placeholderTextColor="#4b5563"
            className="text-lg font-bold text-white px-2 py-1"
          />
        </View>

        <View className="bg-white/5 rounded-3xl p-4 border border-white/5">
          <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest pl-2">
            Target Amount ({currentSymbol})
          </Text>
          <TextInput
            value={targetAmount}
            onChangeText={setTargetAmount}
            placeholder="0.00"
            placeholderTextColor="#4b5563"
            keyboardType="numeric"
            className="text-lg font-bold text-white px-2 py-1"
          />
        </View>

        {goal && (
          <View className="bg-white/5 rounded-3xl p-4 border border-white/5">
            <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest pl-2">
              Saved Amount ({currentSymbol})
            </Text>
            <TextInput
              value={currentAmount}
              onChangeText={setCurrentAmount}
              placeholder="0.00"
              placeholderTextColor="#4b5563"
              keyboardType="numeric"
              className="text-lg font-bold text-white px-2 py-1"
            />
          </View>
        )}

        <View className="bg-white/5 rounded-3xl p-4 border border-white/5">
          <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest pl-2">
            Target Completion Date
          </Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} className="px-2 py-1">
            <Text className="text-lg font-bold text-primary">
              {targetCompletionDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white/5 rounded-3xl p-4 border border-white/5 flex-row justify-between items-center px-6">
           <View>
              <Text className="text-white font-bold text-sm">Sync to Google Calendar</Text>
              <Text className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Connect your timeline</Text>
           </View>
           <TouchableOpacity 
             onPress={() => setSyncToCalendar(!syncToCalendar)}
             className={`w-12 h-6 rounded-full p-1 ${syncToCalendar ? 'bg-primary' : 'bg-white/10'}`}
           >
              <View className={`w-4 h-4 rounded-full bg-white ${syncToCalendar ? 'self-end' : 'self-start'}`} />
           </TouchableOpacity>
        </View>
      </View>

      {/* Advanced Calendar Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/90 px-4">
          <View className="bg-[#121212] p-6 rounded-[40px] w-full border border-white/10 shadow-2xl">
              <View className="flex-row justify-between items-center mb-6">
                <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                   <IconSymbol name="chevron.left" size={24} color="#10b981" />
                </TouchableOpacity>
                <Text className="text-white font-black text-lg">
                   {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                   <IconSymbol name="chevron.right" size={24} color="#10b981" />
                </TouchableOpacity>
              </View>

              <View className="flex-row flex-wrap">
                 {['S','M','T','W','T','F','S'].map((d, i) => (
                    <View key={i} className="w-[14.28%] items-center mb-4">
                       <Text className="text-[10px] font-black text-muted-foreground">{d}</Text>
                    </View>
                 ))}
                 {/* Generate Calendar Days */}
                 {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
                    <View key={`pad-${i}`} className="w-[14.28%] h-10" />
                 ))}
                 {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const isSelected = date.toDateString() === targetCompletionDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();

                    return (
                      <TouchableOpacity 
                        key={day} 
                        onPress={() => {
                          setTargetCompletionDate(date);
                        }}
                        className={`w-[14.28%] h-10 items-center justify-center rounded-xl ${isSelected ? 'bg-primary' : ''} ${isToday && !isSelected ? 'border border-primary/30' : ''}`}
                      >
                         <Text className={`font-bold ${isSelected ? 'text-[#050505]' : 'text-white/70'}`}>{day}</Text>
                      </TouchableOpacity>
                    );
                 })}
              </View>

              <TouchableOpacity onPress={() => setShowDatePicker(false)} className="bg-primary py-4 rounded-2xl items-center mt-8">
                 <Text className="text-[#050505] font-black uppercase tracking-widest text-xs">Confirm Selection</Text>
              </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View className="flex-row gap-x-4 pt-4">
        <TouchableOpacity 
          onPress={onCancel}
          className="flex-1 bg-white/5 rounded-2xl p-5 items-center border border-white/5"
        >
          <Text className="text-white font-black text-[12px] uppercase tracking-widest">Cancel</Text>
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
