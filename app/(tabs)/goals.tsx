import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import GoalList from '../../components/GoalList';
import { GoalForm } from '../../components/GoalForm';
import Goal from '../../database/models/Goal';

export default function GoalsScreen() {
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

      {/* Goal Form Sheet (Replacing Modal for context stability) */}
      {showForm && (
        <View className="absolute inset-0 z-50">
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => {
              setShowForm(false);
              setEditingGoal(null);
            }} 
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
                </View>
              </BlurView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      )}
    </SafeAreaView>
  );
}
