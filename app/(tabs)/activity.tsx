import { SwipeableSheet } from '@/components/ui/SwipeableSheet';
import TransactionForm from '@/components/TransactionForm';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TransactionList from '../../components/TransactionList';
import { useTheme } from '../../context/ThemeContext';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
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
          <Text className="text-primary font-black text-[10px] uppercase tracking-widest">+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveType('expense')}
          className="bg-destructive/20 px-3 py-2 rounded-xl border border-destructive/30 shadow-lg shadow-destructive/10"
        >
          <Text className="text-destructive font-black text-[10px] uppercase tracking-widest">-</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>
      <TransactionList Header={Header} />

      <SwipeableSheet 
        isVisible={!!activeType} 
        onClose={() => setActiveType(null)}
      >
        <TransactionForm
          initialType={activeType}
          onSuccess={() => setActiveType(null)}
        />
      </SwipeableSheet>
    </SafeAreaView>
  );
}
