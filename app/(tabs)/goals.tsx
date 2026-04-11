import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import GoalList from '../../components/GoalList';
import { GoalForm } from '../../components/GoalForm';
import { SwipeableSheet } from '../../components/ui/SwipeableSheet';
import Goal from '../../database/models/Goal';

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={['top']}>
      <View className="px-6 pt-6 pb-2">
        <Text className="text-3xl font-black text-white mb-2">My Goals</Text>
        <Text className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
          Future Proofing
        </Text>
      </View>

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
