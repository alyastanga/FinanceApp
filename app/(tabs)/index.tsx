import { IconSymbol } from '@/components/ui/icon-symbol';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TransactionForm from '../../components/TransactionForm';
import { SwipeableSheet } from '../../components/ui/SwipeableSheet';
import { MicroExpenseBars } from '../../components/ui/MicroExpenseBars';
import { MicroBudgetGauge } from '../../components/ui/MicroBudgetGauge';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';
import database from '../../database';

interface MissionControlProps {
  incomes: any[];
  expenses: any[];
  goals: any[];
  budgets: any[];
  portfolio: any[];
}

import { GoalProgressCard } from '../../components/ui/GoalProgressCard';

const GoalProgressGlimpseComp = ({ goal }: { goal: any }) => {
  return (
    <View className="mt-[-16px] mb-[-16px]">
        <GoalProgressCard goal={goal} compact={true} />
    </View>
  );
};

const GoalProgressGlimpse = withObservables(['goal'], ({ goal }) => ({
  goal: goal.observe()
}))(GoalProgressGlimpseComp);

const Dashboard = ({ incomes, expenses, goals, budgets, portfolio }: MissionControlProps) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { format, convertFrom, currency } = useCurrency();
  const [activeType, setActiveType] = useState<'income' | 'expense' | undefined>(undefined);

  // Safely handle loading/empty states
  if (!incomes || !expenses || !goals || !budgets) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'} items-center justify-center`}>
        <ActivityIndicator color="#10b981" />
      </SafeAreaView>
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const currentMonthIncomes = (incomes || []).filter(i => i.createdAt >= startOfMonth);
  const currentMonthExpenses = (expenses || []).filter(e => e.createdAt >= startOfMonth);

  const totalIncome = currentMonthIncomes.reduce((acc, curr) => acc + convertFrom((curr.amount || 0), curr.currency || curr._currency || currency), 0);
  const totalExpenses = currentMonthExpenses.reduce((acc, curr) => acc + convertFrom((curr.amount || 0), curr.currency || curr._currency || currency), 0);
  const netFlow = totalIncome - totalExpenses;

  // Budget calculations
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + convertFrom((b.amountLimit || 0), b.currency || b._currency || currency), 0);
  const budgetProgress = totalBudgetLimit > 0 ? (totalExpenses / totalBudgetLimit) * 100 : 0;

  // Group expenses by category for monitoring mini-chart
  const categoryMap = currentMonthExpenses.reduce((acc, curr) => {
    if (curr.category) {
      const amt = convertFrom((curr.amount || 0), curr.currency || curr._currency || currency);
      acc[curr.category] = (acc[curr.category] || 0) + amt;
    }
    return acc;
  }, {} as Record<string, number>);

  const COLORS = ['#10b981', '#059669', '#34d399', '#064e3b', '#1f2937'];
  const sortedExpensesData = Object.entries(categoryMap)
    .map(([label, value]) => ({
      label,
      value: value as number
    }))
    .sort((a, b) => b.value - a.value);
    
  const chartData = sortedExpensesData.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  }));

  const topExpensesData = chartData.slice(0, 3).map(item => ({
    label: item.label,
    value: item.value,
    max: totalExpenses,
    amountFormatted: format(item.value),
    color: item.color
  }));

  // Portfolio calculations
  const totalPortfolioValue = portfolio.reduce((acc, curr) => acc + convertFrom(curr.value || 0, curr.currency || curr._currency || currency), 0);
  const totalPortfolioInvested = portfolio.reduce((acc, curr) => acc + convertFrom(curr.investedAmount || 0, curr.currency || curr._currency || currency), 0);
  const portfolioTotalGain = totalPortfolioValue - totalPortfolioInvested;
  const portfolioIsPositive = portfolioTotalGain >= 0;

  const recentTransactions = [...incomes, ...expenses]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}>
        <View className="mb-8 flex-row justify-between items-end">
          <View>
            <Text className={`text-[10px] font-black uppercase tracking-[4px] mb-1 ${isDark ? 'text-primary/60' : 'text-primary'}`}>Mission Control</Text>
            <Text className={`text-4xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>Dashboard</Text>
          </View>
        </View>

        {/* 1. Monthly Pulse Card */}
        <View className={`overflow-hidden rounded-[40px] border mb-8 shadow-2xl ${isDark ? 'bg-[#0A0A0A] border-white/5 shadow-primary/5' : 'bg-white border-black/5 shadow-black/5'}`}>
          <LinearGradient
            colors={[isDark ? '#10b98115' : '#10b98110', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="p-8">
              <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                Available Liquidity
              </Text>
              <Text className={`text-5xl font-black tracking-tighter mb-2 ${isDark ? 'text-white' : 'text-black'}`} numberOfLines={1} adjustsFontSizeToFit>
                {format(netFlow)}
              </Text>
              <View className="flex-row items-center gap-x-4 mt-6">
                <View className={`flex-1 rounded-[24px] px-5 py-4 border ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}>
                  <Text className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Income</Text>
                  <Text className="text-lg font-bold text-primary" numberOfLines={1} adjustsFontSizeToFit>+{format(totalIncome)}</Text>
                </View>
                <View className={`flex-1 rounded-[24px] px-5 py-4 border ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}>
                  <Text className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Expenses</Text>
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
               className={`rounded-[36px] border p-8 shadow-2xl ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-white border-black/5'}`}
             >
               <View className="flex-row justify-between items-center mb-6">
                 <View className="flex-row items-center gap-x-3">
                   <View className={`h-10 w-10 rounded-2xl items-center justify-center ${isDark ? 'bg-[#10b98115]' : 'bg-[#10b98120]'}`}>
                     <IconSymbol name="chart.pie.fill" size={18} color="#10b981" />
                   </View>
                   <Text className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>Full Portfolio</Text>
                 </View>
                 <IconSymbol name="chevron.right" size={16} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
               </View>

               {portfolio.length === 0 ? (
                 <View className="items-center py-4">
                   <View className={`h-12 w-12 rounded-2xl items-center justify-center mb-3 ${isDark ? 'bg-primary/10' : 'bg-primary/20'}`}>
                     <IconSymbol name="plus" size={20} color="#10b981" />
                   </View>
                   <Text className="text-primary font-black text-sm uppercase tracking-widest">Add Your First Asset</Text>
                   <Text className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Tap to get started</Text>
                 </View>
               ) : (
                 <View className="flex-row items-baseline justify-between">
                    <View className="flex-1 mr-4">
                      <Text className={`text-4xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`} numberOfLines={1} adjustsFontSizeToFit>
                        {format(totalPortfolioValue)}
                      </Text>
                      <Text className={`text-[10px] font-black uppercase tracking-widest mt-1 ${
                        portfolioIsPositive ? 'text-primary' : 'text-destructive'
                      }`}>
                        {portfolioIsPositive ? '+' : '-'}
                        {format(Math.abs(portfolioTotalGain))} Total Gain
                      </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full border ${isDark ? 'bg-primary/10 border-primary/20' : 'bg-primary/20 border-primary/30'}`}>
                       <Text className="text-primary font-black text-[10px] uppercase tracking-widest">Manage Assets</Text>
                    </View>
                 </View>
               )}
             </TouchableOpacity>

             <View className="flex-row gap-x-4">
                 {/* Performance Panel */}
                 <TouchableOpacity
                   onPress={() => router.push('/monitoring')}
                   className={`flex-1 rounded-[36px] border p-6 h-48 justify-between overflow-hidden ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-white border-black/5'}`}
                 >
                   <View className={`h-10 w-10 rounded-2xl items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                     <IconSymbol name="chart.pie.fill" size={18} color="#999" />
                   </View>

                    {currentMonthExpenses.length === 0 ? (
                      <View className="items-center flex-1 justify-center">
                        <View className="flex-row items-center gap-x-2">
                          <IconSymbol name="pencil" size={14} color="#999" />
                          <Text className={`font-black text-[10px] uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>Log an Expense</Text>
                        </View>
                      </View>
                    ) : (
                      <View className="flex-1 items-center justify-center pt-4">
                        <MicroExpenseBars data={topExpensesData} isDark={isDark} />
                      </View>
                    )}

                   {currentMonthExpenses.length > 0 && (
                     <Text className={`text-[10px] font-black uppercase tracking-widest absolute top-6 right-6 ${isDark ? 'text-white/20' : 'text-black/20'}`}>
                       Monitoring
                     </Text>
                   )}
                 </TouchableOpacity>

                 {/* Budget Panel */}
                 <TouchableOpacity
                   onPress={() => router.push('/budget')}
                   className={`flex-1 rounded-[36px] border p-6 h-48 justify-between overflow-hidden ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-white border-black/5'}`}
                 >
                   <View className={`h-10 w-10 rounded-2xl items-center justify-center ${isDark ? 'bg-primary/10' : 'bg-primary/20'}`}>
                     <IconSymbol name="dollarsign.circle.fill" size={18} color="#10b981" />
                   </View>

                     {budgets.length === 0 ? (
                       <View className="items-center flex-1 justify-center">
                         <View className="flex-row items-center gap-x-2">
                           <IconSymbol name="plus" size={14} color="#10b981" />
                           <Text className="text-primary font-black text-[10px] uppercase tracking-widest">Create a Budget</Text>
                         </View>
                       </View>
                     ) : (
                       <View className="flex-1 items-center justify-center pt-2">
                         <MicroBudgetGauge progress={totalBudgetLimit > 0 ? (totalExpenses / totalBudgetLimit) : 0} size={110} isDark={isDark} />
                       </View>
                     )}

                    {budgets.length > 0 && (
                      <Text className={`text-[10px] font-black uppercase tracking-widest absolute top-6 right-6 ${isDark ? 'text-primary/40' : 'text-primary/60'}`}>
                        Budget
                      </Text>
                    )}
                  </TouchableOpacity>
              </View>

           {/* Activity Panel */}
           <TouchableOpacity
             onPress={() => router.push('/activity')}
             className={`rounded-[40px] border p-8 ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-white border-black/5'}`}
           >
             <View className="flex-row justify-between items-center mb-6">
               <View className="flex-row items-center gap-x-3">
                 <View className={`h-10 w-10 rounded-2xl items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                   <IconSymbol name="list.bullet" size={18} color="#999" />
                 </View>
                 <Text className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>Recent Activity</Text>
               </View>
               <IconSymbol name="chevron.right" size={16} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
             </View>
             <View className="gap-y-3">
               {recentTransactions.map((tx, idx) => (
                 <View key={idx} className={`flex-row justify-between items-center p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-black/[0.02] border-black/5'}`}>
                   <View>
                     <Text className={`font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>{tx.source || tx.category}</Text>
                     <Text className={`text-[10px] uppercase font-black tracking-widest mt-0.5 ${isDark ? 'text-white/30' : 'text-black/30'}`}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                   </View>
                   <Text className={tx.source ? "text-primary font-black" : "text-destructive font-black"}>
                     {tx.source ? '+' : '-'} {format(tx.amount)}
                   </Text>
                 </View>
               ))}
               {recentTransactions.length === 0 && (
                 <Text className={`text-xs italic text-center py-4 ${isDark ? 'text-white/20' : 'text-black/20'}`}>No recent history.</Text>
               )}
             </View>
           </TouchableOpacity>

           {/* Goals Panel */}
           <TouchableOpacity
             onPress={() => router.push('/goals')}
             className={`rounded-[40px] border p-8 mb-4 shadow-xl ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-white border-black/5'}`}
           >
             <View className="flex-row justify-between items-center mb-6">
               <View className="flex-row items-center gap-x-3">
                 <View className={`h-10 w-10 rounded-2xl items-center justify-center ${isDark ? 'bg-[#8b5cf615]' : 'bg-[#8b5cf620]'}`}>
                   <IconSymbol name="target" size={18} color="#8b5cf6" />
                 </View>
                 <Text className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>Goal Progress</Text>
               </View>
               <IconSymbol name="chevron.right" size={16} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
             </View>
             {goals[0] ? (
               <GoalProgressGlimpse goal={goals[0]} />
             ) : (
               <View className="flex-row items-center justify-center gap-x-2 py-2">
                  <IconSymbol name="plus" size={14} color="#8b5cf6" />
                  <Text className="text-[#8b5cf6] font-black text-[10px] uppercase tracking-widest">Set a Savings Goal</Text>
               </View>
             )}
           </TouchableOpacity>
        </View>
      </ScrollView>

      <SwipeableSheet 
        isVisible={!!activeType} 
        onClose={() => setActiveType(undefined)}
      >
        <TransactionForm
          initialType={activeType}
          onSuccess={() => setActiveType(undefined)}
        />
      </SwipeableSheet>
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
