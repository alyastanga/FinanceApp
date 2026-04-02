import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Platform } from 'react-native';
import database from '../database';
import Goal from '../database/models/Goal';

interface GoalFormProps {
  goal?: Goal | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const GoalForm = ({ goal, onSuccess, onCancel }: GoalFormProps) => {
  const [title, setTitle] = useState(goal?.title || '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount?.toString() || '');
  const [savedAmount, setSavedAmount] = useState(goal?.savedAmount?.toString() || '0');

  const handleSubmit = async () => {
    if (!title || !targetAmount) return;

    try {
      await database.write(async () => {
        if (goal) {
          await goal.update((record) => {
            record.title = title;
            record.targetAmount = parseFloat(targetAmount);
            record.savedAmount = parseFloat(savedAmount);
          });
        } else {
          await database.get('goals').create((record: any) => {
            record.title = title;
            record.targetAmount = parseFloat(targetAmount);
            record.savedAmount = parseFloat(savedAmount);
            record.createdAt = new Date();
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
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. New Garage, Vacation Fund"
            placeholderTextColor="#4b5563"
            className="text-lg font-bold text-white px-2 py-1"
          />
        </View>

        <View className="bg-white/5 rounded-3xl p-4 border border-white/5">
          <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest pl-2">
            Target Amount ($)
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
              Saved Amount ($)
            </Text>
            <TextInput
              value={savedAmount}
              onChangeText={setSavedAmount}
              placeholder="0.00"
              placeholderTextColor="#4b5563"
              keyboardType="numeric"
              className="text-lg font-bold text-white px-2 py-1"
            />
          </View>
        )}
      </View>

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
