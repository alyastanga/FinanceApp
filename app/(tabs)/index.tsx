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
import { TrendChart } from '../../components/ui/TrendChart';
import { useCurrency } from '../../context/CurrencyContext';
import database from '../../database';

interface MissionControlProps {
  incomes: any[];
  expenses: any[];
  goals: any[];
  budgets: any[];
  portfolio: any[];
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

const Dashboard = ({ incomes, expenses, goals, budgets, portfolio }: MissionControlProps) => {
  const { format } = useCurrency();
  const [activeType, setActiveType] = useState<'income' | 'expense' | undefined>(undefined);

  // Safely handle loading/empty states
  if (!incomes || !expenses || !goals || !budgets) {
    return (
      <SafeAreaView className="flex-1 bg-[#050505] items-center justify-center">
        <ActivityIndicator color="#10b981" />
      </SafeAreaView>
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const currentMonthIncomes = (incomes || []).filter(i => i.createdAt >= startOfMonth);
  const currentMonthExpenses = (expenses || []).filter(e => e.createdAt >= startOfMonth);

  const totalIncome = currentMonthIncomes.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalExpenses = currentMonthExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const netFlow = totalIncome - totalExpenses;

  // Budget calculations
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + (b.amountLimit || 0), 0);
  const budgetProgress = totalBudgetLimit > 0 ? (totalExpenses / totalBudgetLimit) * 100 : 0;

  // Group expenses by category for monitoring mini-chart
  const categoryMap = currentMonthExpenses.reduce((acc, curr) => {
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

  const allocationChartData = budgets
    .map((b, index) => ({
      label: b.category,
      value: b.amountLimit as number,
      color: COLORS[index % COLORS.length]
    }))
    .sort((a, b) => b.value - a.value);

  // Calculate unallocated income to show true "Allocation"
  const unallocated = Math.max(0, totalIncome - totalBudgetLimit);
  if (unallocated > 0 && totalIncome > 0) {
    allocationChartData.push({
      label: 'Savings / Surplus',
      value: unallocated,
      color: '#10b981'
    });
  }

  const recentTransactions = [...incomes, ...expenses]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={['top']}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}>
        <View className="mb-8 flex-row justify-between items-end">
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[4px] text-primary/60 mb-1">Mission Control</Text>
            <Text className="text-4xl font-black text-white tracking-tighter">Dashboard</Text>
          </View>
        </View>

        {/* 1. Monthly Pulse Card */}
        <View className="overflow-hidden rounded-[40px] bg-[#0A0A0A] border border-white/5 mb-8 shadow-2xl shadow-primary/5">
          <LinearGradient
            colors={['#10b98115', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="p-8">
              <Text className="text-[10px] font-black uppercase tracking-[2px] text-white/30 mb-2">
                Available Liquidity
              </Text>
              <Text className="text-5xl font-black tracking-tighter text-white mb-2">
                {format(netFlow)}
              </Text>
              <View className="flex-row items-center gap-x-4 mt-6">
                <View className="flex-1 rounded-[24px] bg-white/[0.03] px-5 py-4 border border-white/5">
                  <Text className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Income</Text>
                  <Text className="text-lg font-bold text-primary" numberOfLines={1} adjustsFontSizeToFit>+{format(totalIncome)}</Text>
                </View>
                <View className="flex-1 rounded-[24px] bg-white/[0.03] px-5 py-4 border border-white/5">
                  <Text className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Expenses</Text>
                  <Text className="text-lg font-bold text-destructive" numberOfLines={1} adjustsFontSizeToFit>-{format(totalExpenses)}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions Panel */}
        <View className="flex-row gap-x-4 mb-8">
           <TouchableOpacity 
             onPress={() => setActiveType('income')}
             className="flex-1 bg-[#10b98115] rounded-[32px] border border-[#10b98130] p-6 flex-row items-center justify-center gap-x-3 shadow-lg shadow-emerald-500/5"
           >
              <View className="h-10 w-10 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/20">
                 <IconSymbol name="plus" size={20} color="#050505" />
              </View>
              <Text className="text-primary font-black text-sm uppercase tracking-widest">Income</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             onPress={() => setActiveType('expense')}
             className="flex-1 bg-[#ef444415] rounded-[32px] border border-[#ef444430] p-6 flex-row items-center justify-center gap-x-3 shadow-lg shadow-rose-500/5"
           >
              <View className="h-10 w-10 rounded-2xl bg-destructive items-center justify-center shadow-lg shadow-destructive/20">
                 <IconSymbol name="minus" size={20} color="#fff" />
              </View>
              <Text className="text-destructive font-black text-sm uppercase tracking-widest">Expense</Text>
           </TouchableOpacity>
        </View>

        {/* Navigation Panels Grid */}
        <View className="gap-y-6">
             {/* Portfolio Panel */}
             <TouchableOpacity
               onPress={() => router.push('/portfolio')}
               className="rounded-[36px] bg-[#0C0C0C] border border-white/5 p-8 shadow-2xl"
             >
               <View className="flex-row justify-between items-center mb-6">
                 <View className="flex-row items-center gap-x-3">
                   <View className="h-10 w-10 rounded-2xl bg-[#10b98115] items-center justify-center">
                     <IconSymbol name="chart.pie.fill" size={18} color="#10b981" />
                   </View>
                   <Text className="text-sm font-black uppercase tracking-widest text-white">Full Portfolio</Text>
                 </View>
                 <IconSymbol name="chevron.right" size={16} color="rgba(255,255,255,0.2)" />
               </View>

               <View className="flex-row items-baseline justify-between">
                  <View>
                    <Text className="text-4xl font-black text-white tracking-tighter">
                      {format(portfolio.reduce((acc, curr) => acc + curr.value, 0))}
                    </Text>
                    {portfolio.length > 0 && (
                      <Text className={`text-[10px] font-black uppercase tracking-widest mt-1 ${
                        (portfolio.reduce((acc, curr) => acc + curr.value, 0) - portfolio.reduce((acc, curr) => acc + curr.investedAmount, 0)) >= 0 
                        ? 'text-primary' : 'text-destructive'
                      }`}>
                        { (portfolio.reduce((acc, curr) => acc + curr.value, 0) - portfolio.reduce((acc, curr) => acc + curr.investedAmount, 0)) >= 0 ? '+' : '-' }
                        {format(Math.abs(portfolio.reduce((acc, curr) => acc + curr.value, 0) - portfolio.reduce((acc, curr) => acc + curr.investedAmount, 0)))} Total Gain
                      </Text>
                    )}
                  </View>
                  <View className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                     <Text className="text-primary font-black text-[10px] uppercase tracking-widest">Manage Assets</Text>
                  </View>
               </View>
             </TouchableOpacity>

             <View className="flex-row gap-x-4">
                {/* Performance Panel */}
                <TouchableOpacity
                  onPress={() => router.push('/monitoring')}
                  className="flex-1 rounded-[36px] bg-[#0C0C0C] border border-white/5 p-6 h-48 justify-between overflow-hidden"
                >
                  <View style={{ opacity: 0.25, position: 'absolute', bottom: -15, right: -15 }}>
                    <BudgetChart data={chartData.slice(0, 3)} size={140} />
                  </View>
                  <View className="h-10 w-10 rounded-2xl bg-white/5 items-center justify-center">
                    <IconSymbol name="chart.pie.fill" size={18} color="#999" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Monitoring</Text>
                    <Text className="text-white font-bold text-base leading-tight mb-2">Spending Habits</Text>
                    {chartData.slice(0, 2).map((item, id) => (
                      <View key={id} className="flex-row items-center gap-x-1.5 mb-1 opacity-60">
                        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <Text className="text-[9px] font-black uppercase tracking-widest text-white">{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>

                {/* Budget Panel */}
                <TouchableOpacity
                  onPress={() => router.push('/budget')}
                  className="flex-1 rounded-[36px] bg-[#0C0C0C] border border-white/5 p-6 h-48 justify-between overflow-hidden"
                >
                  <View style={{ opacity: 0.25, position: 'absolute', top: -15, left: -15 }}>
                    <BudgetChart data={allocationChartData.slice(0, 3)} size={140} />
                  </View>
                  <View className="h-10 w-10 rounded-2xl bg-primary/10 items-center justify-center">
                    <IconSymbol name="dollarsign.circle.fill" size={18} color="#10b981" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Budget</Text>
                    <Text className="text-white font-bold text-lg mb-2">{Math.round(budgetProgress)}% Used</Text>
                    <View className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <View style={{ width: `${Math.min(100, budgetProgress)}%` }} className="h-full bg-primary" />
                    </View>
                  </View>
                </TouchableOpacity>
             </View>

          {/* Activity Panel */}
          <TouchableOpacity
            onPress={() => router.push('/activity')}
            className="rounded-[40px] bg-[#0C0C0C] border border-white/5 p-8"
          >
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center gap-x-3">
                <View className="h-10 w-10 rounded-2xl bg-white/5 items-center justify-center">
                  <IconSymbol name="list.bullet" size={18} color="#999" />
                </View>
                <Text className="text-sm font-black uppercase tracking-widest text-white">Recent Activity</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color="rgba(255,255,255,0.2)" />
            </View>
            <View className="gap-y-3">
              {recentTransactions.map((tx, idx) => (
                <View key={idx} className="flex-row justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                  <View>
                    <Text className="text-white font-bold text-sm">{tx.source || tx.category}</Text>
                    <Text className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-0.5">{new Date(tx.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text className={tx.source ? "text-primary font-black" : "text-destructive font-black"}>
                    {tx.source ? '+' : '-'} {format(tx.amount)}
                  </Text>
                </View>
              ))}
              {recentTransactions.length === 0 && (
                <Text className="text-white/20 text-xs italic text-center py-4">No recent history.</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Goals Panel */}
          <TouchableOpacity
            onPress={() => router.push('/goals')}
            className="rounded-[40px] bg-[#0C0C0C] border border-white/5 p-8 mb-4 shadow-xl"
          >
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center gap-x-3">
                <View className="h-10 w-10 rounded-2xl bg-[#8b5cf615] items-center justify-center">
                  <IconSymbol name="target" size={18} color="#8b5cf6" />
                </View>
                <Text className="text-sm font-black uppercase tracking-widest text-white">Goal Progress</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color="rgba(255,255,255,0.2)" />
            </View>
            {goals[0] ? (
              <GoalProgressGlimpse goal={goals[0]} />
            ) : (
              <View className="flex-row items-center gap-x-4 opacity-50">
                 <View className="h-1 w-full bg-white/5 flex-1 rounded-full" />
                 <Text className="text-white/40 text-[10px] font-black uppercase tracking-widest">No Active Goals</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Transaction Sheet */}
      {activeType && (
        <View className="absolute inset-0 z-50">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setActiveType(undefined)}
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
              <BlurView intensity={30} tint="dark" className="rounded-t-[48px] overflow-hidden border-t border-white/10">
                <View className="bg-black/90 p-8 pt-4 pb-12">
                  <View className="w-12 h-1.5 bg-white/10 rounded-full self-center mb-8" />
                  <TransactionForm
                    initialType={activeType}
                    onSuccess={() => setActiveType(undefined)}
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
  portfolio: database.get('portfolio').query().observe(),
}));

export default enhance(Dashboard);
