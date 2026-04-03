import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import database from '../database';
import Goal from '../database/models/Goal';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
}

const GoalCardComp = ({ goal, onEdit }: GoalCardProps) => {
  const progress = Math.min(1, (goal.currentAmount || 0) / (goal.targetAmount || 1));
  const remaining = Math.max(0, goal.targetAmount - (goal.currentAmount || 0));

  const handleQuickAdd = async () => {
    try {
      await database.write(async () => {
        await goal.update((record) => {
          record.currentAmount += 50; // Custom increment for quick demo
        });
      });
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await database.write(async () => {
              await goal.markAsDeleted();
            });
          }
        }
      ]
    );
  };

  return (
    <View className="mb-4 overflow-hidden rounded-[32px] bg-card/40 border border-white/5">
      <LinearGradient
        colors={progress >= 1 ? ['#10b98125', 'transparent'] : ['#ffffff05', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pt-5 pb-6"
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-4">
            <Text className="text-[9px] font-black uppercase tracking-[3px] text-muted-foreground/70 mb-2">
              Active Target
            </Text>
            <Text className="text-xl font-black text-white" numberOfLines={1}>{goal.name}</Text>
          </View>
          <View className="items-end pt-1">
             <Text className="text-sm font-bold text-primary">{Math.round(progress * 100)}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-6">
          <LinearGradient
            colors={['#34d399', '#10b981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: `${progress * 100}%` }}
            className="h-full rounded-full"
          />
        </View>

        <View className="flex-row justify-between mb-6">
          <View>
            <Text className="text-[9px] font-black text-muted-foreground uppercase mb-1">Saved</Text>
            <Text className="text-white font-bold">${(goal.currentAmount || 0).toLocaleString()}</Text>
          </View>
          <View className="items-end">
            <Text className="text-[9px] font-black text-muted-foreground uppercase mb-1">Target</Text>
            <Text className="text-white/40 font-bold">${(goal.targetAmount || 0).toLocaleString()}</Text>
          </View>
        </View>

        <View className="flex-row gap-x-3">
          <TouchableOpacity 
            onPress={handleQuickAdd}
            className="flex-1 bg-primary/20 rounded-2xl py-3 items-center border border-primary/20"
          >
            <Text className="text-primary font-black text-[10px] uppercase tracking-widest">+ $50 Quick Add</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onLongPress={handleDelete}
            onPress={() => onEdit(goal)}
            className="bg-white/5 rounded-2xl px-6 py-3 items-center border border-white/5"
          >
            <Text className="text-white/60 font-black text-[10px] uppercase tracking-widest">Edit</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

export const GoalCard = withObservables(['goal'], ({ goal }) => ({
  goal: goal.observe()
}))(GoalCardComp);
