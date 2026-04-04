import { IconSymbol } from '@/components/ui/icon-symbol';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TransactionForm from '../../components/TransactionForm';
import { BudgetChart } from '../../components/ui/BudgetChart';
import database from '../../database';

interface MissionControlProps {
  incomes: any[];
  expenses: any[];
  goals: any[];
  budgets: any[];
}

const GoalProgressGlimpseComp = ({ goal }: { goal: any }) => {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  return (
    <View>
      <View className="flex-row justify-between mb-2">
        <Text className="text-white font-bold text-sm">{goal.name}</Text>
        <Text className="text-primary font-black text-xs">
          {Math.round(progress)}%
        </Text>
      </View>
      <View className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <View
          style={{ width: `${Math.min(100, progress)}%` }}
          className="h-full bg-primary"
        />
      </View>
    </View>
  );
};

const GoalProgressGlimpse = withObservables(['goal'], ({ goal }) => ({
  goal: goal.observe()
}))(GoalProgressGlimpseComp);

const Dashboard = ({ incomes, expenses, goals, budgets }: MissionControlProps) => {
  const [activeType, setActiveType] = useState<'income' | 'expense' | null>(null);

  // Safely handle loading/empty states
  if (!incomes || !expenses || !goals || !budgets) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#10b981" />
      </SafeAreaView>
    );
  }

  const totalIncome = (incomes || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalExpenses = (expenses || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const netFlow = totalIncome - totalExpenses;

  // Group expenses by category for the chart
  const categoryMap = (expenses || []).reduce((acc, curr) => {
    if (curr.category) {
      acc[curr.category] = (acc[curr.category] || 0) + (curr.amount || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const COLORS = ['#10b981', '#059669', '#34d399', '#064e3b', '#1f2937'];
  const chartData = Object.entries(categoryMap)
    .map(([label, value], index) => ({
      label,
      value: value as number,
      color: COLORS[index % COLORS.length]
    }))
    .sort((a, b) => (b.value as number) - (a.value as number));

  const recentTransactions = [...incomes, ...expenses]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row justify-between items-end">
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[4px] text-primary/60 mb-1">Mission Control</Text>
            <Text className="text-3xl font-black text-white">Dashboard</Text>
          </View>
        </View>

        {/* 1. Monthly Pulse Card */}
        <View className="overflow-hidden rounded-[32px] bg-[#0A0A0A] border border-white/5 mb-6">
          <LinearGradient
            colors={['#10b98115', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="p-6">
              <Text className="text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground/50 mb-2 pl-0.5">
                Monthly Pulse
              </Text>
              <Text className="text-4xl font-black tracking-tighter text-white mb-1">
                ${netFlow.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </Text>
              <View className="flex-row items-center gap-x-3 mt-5">
                <View className="flex-1 rounded-2xl bg-white/5 px-4 py-3 border border-white/5">
                  <Text className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Income</Text>
                  <Text className="text-base font-bold text-primary" numberOfLines={1} adjustsFontSizeToFit>+${totalIncome.toLocaleString()}</Text>
                </View>
                <View className="flex-1 rounded-2xl bg-white/5 px-4 py-3 border border-white/5">
                  <Text className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Expenses</Text>
                  <Text className="text-base font-bold text-destructive" numberOfLines={1} adjustsFontSizeToFit>-${totalExpenses.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View className="flex-row gap-4 mb-6">
          {/* 2. Monitoring Glimpse */}
          <TouchableOpacity
            onPress={() => router.push('/monitoring')}
            className="flex-1 rounded-[32px] bg-card/40 border border-white/5 p-5 items-center justify-center overflow-hidden"
          >
            <View style={{ opacity: 0.12, position: 'absolute', bottom: -20, right: -20 }}>
              <BudgetChart data={chartData.slice(0, 3)} size={200} />
            </View>
            <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center mb-1.5">Monitoring</Text>
            <Text className="text-white font-bold text-center text-sm">Spending Habits</Text>
          </TouchableOpacity>

          {/* 3. Budget Glimpse */}
          <TouchableOpacity
            onPress={() => router.push('/budget')}
            className="flex-1 rounded-[32px] bg-card/40 border border-white/5 p-5 items-center justify-center"
          >
            <IconSymbol name="dollarsign.circle" size={24} color="#10b981" style={{ marginBottom: 8 }} />
            <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center mb-1">Budget</Text>
            <Text className="text-white font-bold text-center">View Targets</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Recent Activity (Glimpse of History) */}
        <View className="mb-6 rounded-[32px] bg-card/40 border border-white/5 p-6">
          <View className="flex-row justify-between items-center mb-4 px-1">
            <Text className="text-sm font-black uppercase tracking-widest text-white">Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/activity')}>
              <Text className="text-[10px] font-bold text-primary uppercase">View All</Text>
            </TouchableOpacity>
          </View>
          <View className="gap-y-3">
            {recentTransactions.map((tx, idx) => (
              <View key={idx} className="flex-row justify-between items-center bg-white/[0.03] p-3 rounded-2xl">
                <View>
                  <Text className="text-white font-bold text-sm">{tx.source || tx.category}</Text>
                  <Text className="text-[10px] text-muted-foreground uppercase">{new Date(tx.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text className={tx.source ? "text-primary font-black" : "text-destructive font-black"}>
                  {tx.source ? '+' : '-'}${tx.amount.toLocaleString()}
                </Text>
              </View>
            ))}
            {recentTransactions.length === 0 && (
              <Text className="text-muted-foreground text-xs italic text-center py-4">No recent history.</Text>
            )}
          </View>
        </View>

        {/* 5. Goals Glimpse */}
        <TouchableOpacity
          onPress={() => router.push('/goals')}
          className="mb-10 rounded-[32px] bg-card/40 border border-white/5 p-6"
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-sm font-black uppercase tracking-widest text-white">Goal Progress</Text>
            <IconSymbol name="target" size={16} color="rgba(255,255,255,0.2)" />
          </View>
          {goals[0] ? (
            <GoalProgressGlimpse goal={goals[0]} />
          ) : (
            <Text className="text-muted-foreground text-xs italic">Set a goal to track progress.</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Transaction Sheet (Replacing native Modal to fix navigation context) */}
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
              <BlurView intensity={20} className="rounded-t-[40px] overflow-hidden border-t border-white/10">
                <View className="bg-card/90 p-8 pt-4 pb-12">
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

const enhance = withObservables([], () => ({
  incomes: database.get('incomes').query().observe(),
  expenses: database.get('expenses').query().observe(),
  goals: database.get('goals').query().observe(),
  budgets: database.get('budgets').query().observe(),
}));

export default enhance(Dashboard);
