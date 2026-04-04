import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import database from '../database';
import Goal from '../database/models/Goal';
import { GoalCard } from './GoalCard';

interface GoalListProps {
  goals: Goal[];
  onEdit: (goal: Goal) => void;
  onAdd: () => void;
}

const GoalList = ({ goals, onEdit, onAdd }: GoalListProps) => {
  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-end mb-8 pt-4">
        <View className="flex-1 mr-4">
          <Text className="text-3xl font-black text-white mb-1">Goal Setting</Text>
          <Text className="text-sm font-medium text-muted-foreground leading-5">
            Monitor and adjust your savings targets.
          </Text>
        </View>
        <TouchableOpacity 
          onPress={onAdd}
          className="bg-primary px-5 py-2.5 rounded-full"
        >
          <Text className="text-[10px] font-black text-primary-foreground uppercase tracking-[1px] pl-0.5">+ Goal</Text>
        </TouchableOpacity>
      </View>

      <View className="gap-y-4 pb-20">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onEdit={onEdit} />
        ))}

        {goals.length === 0 && (
          <TouchableOpacity 
            onPress={onAdd}
            className="p-12 items-center justify-center bg-white/[0.02] rounded-[40px] border border-dashed border-white/10"
          >
             <Text className="text-primary font-black text-[12px] uppercase tracking-[1px] mb-3 pl-0.5">No Goals Locked In</Text>
             <Text className="text-muted-foreground text-xs text-center px-8 leading-5">
               Set your first goal to start monitoring your wealth transformation.
             </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const enhance = withObservables([], () => ({
  goals: database.get<Goal>('goals').query().observe(),
}));

export default enhance(GoalList);
