import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoalForm } from '../../components/GoalForm';
import GoalList from '../../components/GoalList';
import { SwipeableSheet } from '../../components/ui/SwipeableSheet';
import Goal from '../../database/models/Goal';

import { useTheme } from '../../context/ThemeContext';

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
      >
        <GoalList
          onEdit={(goal: Goal) => {
            setEditingGoal(goal);
            setShowForm(true);
          }}
          onAdd={() => {
            setEditingGoal(null);
            setShowForm(true);
          }}
        />
      </ScrollView>

      {/* Goal Form Sheet */}
      <SwipeableSheet
        isVisible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingGoal(null);
        }}
      >
        <GoalForm
          goal={editingGoal}
          onSuccess={() => {
            setShowForm(false);
            setEditingGoal(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingGoal(null);
          }}
        />
      </SwipeableSheet>
    </SafeAreaView>
  );
}
