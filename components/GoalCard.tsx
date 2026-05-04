import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import database from '../database';
import Goal from '../database/models/Goal';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
}

import { GoalProgressCard } from './ui/GoalProgressCard';

import { calculateSmartIncrement } from '../lib/goal-utils';
import { CustomAlert } from './ui/CustomAlert';

const GoalCardComp = ({ goal, onEdit }: GoalCardProps) => {
  const { format } = useCurrency();
  const { isDark } = useTheme();
  const handleQuickAdd = async () => {
    const increment = calculateSmartIncrement(goal.targetAmount);
    console.log(`[GoalCard] Quick Add triggered: +${increment} for "${goal.name}"`);
    
    try {
      const { generateUUID } = require('../lib/id-utils');
      
      await database.write(async () => {
        // 1. Update the Goal progress
        await goal.update((record) => {
          record.currentAmount += increment;
        });

        // 2. Create the Savings Transaction to deduct from liquidity
        await database.get('expenses').create((exp: any) => {
          exp._raw.id = generateUUID();
          exp.amount = increment;
          exp.category = 'Savings';
          exp.description = `Quick Add: ${goal.name}`;
          exp._currency = goal.currency;
          exp.userId = goal.userId;
          const now = new Date();
          exp.createdAt = now;
          exp.updatedAt = now;
        });

        console.log(`[GoalCard] SUCCESS: Created ₱${increment} Savings transaction.`);
      });
    } catch (error) {
      console.error('[GoalCard] Failed to update goal/liquidity:', error);
    }
  };

  const handleDelete = () => {
    CustomAlert.alert(
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
    <GoalProgressCard goal={goal} isDark={isDark}>
      <View className="flex-row gap-x-3">
        <TouchableOpacity 
          onPress={handleQuickAdd}
          className="flex-1 overflow-hidden"
        >
          <View className="bg-primary/20 rounded-2xl py-3.5 items-center border border-primary/20">
            <Text className="text-primary font-black text-[10px] uppercase tracking-[1px] pl-0.5">+ {format(calculateSmartIncrement(goal.targetAmount), goal.currency)} Quick Add</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          onLongPress={handleDelete}
          onPress={() => onEdit(goal)}
          className="overflow-hidden"
        >
          <View className={`rounded-2xl px-6 py-3.5 items-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
            <Text className={`font-black text-[10px] uppercase tracking-[1px] pl-0.5 ${isDark ? 'text-white/60' : 'text-black/60'}`}>Edit</Text>
          </View>
        </TouchableOpacity>
      </View>
    </GoalProgressCard>
  );
};

export const GoalCard = withObservables(['goal'], ({ goal }) => ({
  goal: goal.observe()
}))(GoalCardComp);
