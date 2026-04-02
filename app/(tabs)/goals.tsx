import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import GoalList from '@/components/GoalList';
import { GoalForm } from '@/components/GoalForm';
import Goal from '@/database/models/Goal';

export default function GoalsScreen() {
  const [editingGoal, setEditingGoal] = useState<Goal | null | 'new'>(null);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <GoalList 
          onEdit={(goal: Goal) => setEditingGoal(goal)} 
          onAdd={() => setEditingGoal('new')}
        />
      </ScrollView>

      {/* Goal Form Modal */}
      <Modal
        visible={editingGoal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingGoal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setEditingGoal(null)}
            className="flex-1"
          >
            {Platform.OS === 'web' ? (
              <View className="flex-1 justify-end bg-black/80">
                <TouchableOpacity 
                  activeOpacity={1} 
                  onPress={(e) => e.stopPropagation()} 
                  className="rounded-t-[40px] bg-card p-8 shadow-2xl"
                >
                  <View className="pb-8">
                     <GoalForm 
                        goal={editingGoal === 'new' ? null : editingGoal}
                        onSuccess={() => setEditingGoal(null)}
                        onCancel={() => setEditingGoal(null)}
                     />
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <BlurView intensity={80} tint="dark" className="flex-1 justify-end">
                <TouchableOpacity 
                  activeOpacity={1} 
                  onPress={(e) => e.stopPropagation()} 
                  className="rounded-t-[40px] bg-card/95 border-t border-white/10 p-8 shadow-2xl"
                >
                  <View className="pb-8">
                     <GoalForm 
                        goal={editingGoal === 'new' ? null : editingGoal}
                        onSuccess={() => setEditingGoal(null)}
                        onCancel={() => setEditingGoal(null)}
                     />
                  </View>
                </TouchableOpacity>
              </BlurView>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
