import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import TransactionList from '../../components/TransactionList';
import TransactionForm from '@/components/TransactionForm';
import { useTheme } from '../../context/ThemeContext';

export default function ActivityScreen() {
  const { isDark } = useTheme();
  const [activeType, setActiveType] = useState<'income' | 'expense' | null>(null);

  const Header = () => (
    <View className="pt-6 px-4 flex-row justify-between items-end mb-6">
      <View>
        <Text className={`text-3xl font-black ${isDark ? 'text-white' : 'text-black'} mb-2`}>History</Text>
        <Text className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
          All Transactions
        </Text>
      </View>
      <View className="flex-row gap-x-2">
        <TouchableOpacity 
          onPress={() => setActiveType('income')}
          className="bg-primary/20 px-3 py-2 rounded-xl border border-primary/30 shadow-lg shadow-primary/10"
        >
          <Text className="text-primary font-black text-[10px] uppercase tracking-widest">+ Income</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveType('expense')}
          className="bg-destructive/20 px-3 py-2 rounded-xl border border-destructive/30 shadow-lg shadow-destructive/10"
        >
          <Text className="text-destructive font-black text-[10px] uppercase tracking-widest">- Expense</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>
      <TransactionList Header={Header} />

      {/* Sheet UI for Transaction Entry */}
      {activeType && (
        <View className="absolute inset-0 z-50">
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setActiveType(null)}
            className="absolute inset-0 bg-black/60"
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
              <BlurView intensity={20} tint={isDark ? "dark" : "light"} className="rounded-t-[40px] overflow-hidden border-t border-white/10">
                <View className={`${isDark ? 'bg-[#111]' : 'bg-white'} p-8 pt-4 pb-12`}>
                  <View className="w-12 h-1.5 bg-white/10 rounded-full self-center mb-8" />
                  <TransactionForm 
                    initialType={activeType} 
                    onSuccess={() => setActiveType(null)} 
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
