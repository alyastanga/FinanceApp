import { IconSymbol } from '@/components/ui/icon-symbol';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TransactionForm from '../../components/TransactionForm';
import { MicroBudgetGauge } from '../../components/ui/MicroBudgetGauge';
import { MicroExpenseBars } from '../../components/ui/MicroExpenseBars';
import { SwipeableSheet } from '../../components/ui/SwipeableSheet';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';
import database from '../../database';
import { getE2EEState } from '../../lib/key-manager';
import { syncData } from '../../lib/sync';

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
    <View className="mt-1">
      <GoalProgressCard goal={goal} compact={true} noContainer={true} />
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const state = await getE2EEState();
      if (state.isEnabled && state.isVaultLocked) {
        Alert.alert(
          "Vault Locked",
          "Your vault is locked. Please unlock it in Settings to sync your data.",
          [{ text: "OK" }]
        );
        return;
      }
      await syncData();
    } catch (error: any) {
      console.error('[Dashboard] Sync failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const monthlyIncome = currentMonthIncomes.reduce((acc, curr) => acc + convertFrom((curr.amount || 0), curr.currency || curr._currency || currency), 0);
  const monthlyExpenses = currentMonthExpenses.reduce((acc, curr) => acc + convertFrom((curr.amount || 0), curr.currency || curr._currency || currency), 0);

  const totalLiquidity = useMemo(() => {
    const allTimeIncome = (incomes || []).reduce((acc, curr) => acc + convertFrom((curr.amount || 0), curr.currency || curr._currency || currency), 0);
    const allTimeExpenses = (expenses || []).reduce((acc, curr) => acc + convertFrom((curr.amount || 0), curr.currency || curr._currency || currency), 0);
    const transactionBalance = allTimeIncome - allTimeExpenses;

    const portfolioCash = (portfolio || []).reduce((sum, p) => {
      const type = (p.assetType || p.asset_type || '').toLowerCase();
      const symbol = (p.symbol || '').toUpperCase();
      const isCash = type === 'cash';
      const isStable = type === 'crypto' && (symbol.includes('USDT') || symbol.includes('USDC') || symbol.includes('DAI'));
      
      if (isCash || isStable) {
        return sum + convertFrom(p.value || 0, p.currency || p._currency || currency);
      }
      return sum;
    }, 0);

    return transactionBalance + portfolioCash;
  }, [incomes, expenses, portfolio, currency, convertFrom]);

  // Budget calculations
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + convertFrom((b.amountLimit || 0), b.currency || b._currency || currency), 0);
  const budgetProgress = totalBudgetLimit > 0 ? (monthlyExpenses / totalBudgetLimit) * 100 : 0;

  // Group expenses by category for analytics mini-chart
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
    max: monthlyExpenses,
    amountFormatted: format(item.value),
    color: item.color
  }));

  // Portfolio calculations
  const totalPortfolioValue = portfolio.reduce((acc, curr) => acc + convertFrom(curr.value || 0, curr.currency || curr._currency || currency), 0);
  const totalPortfolioInvested = portfolio.reduce((acc, curr) => acc + convertFrom(curr.investedAmount || 0, curr.currency || curr._currency || currency), 0);
  const portfolioTotalGain = totalPortfolioValue - totalPortfolioInvested;
  const portfolioIsPositive = portfolioTotalGain >= 0;

  const recentTransactions = [
    ...incomes.map(i => ({ id: i.id, amount: i.amount, category: i.category, createdAt: i.createdAt, isIncome: true })),
    ...expenses.map(e => ({ id: e.id, amount: e.amount, category: e.category, createdAt: e.createdAt, isIncome: false }))
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 0, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? "#10b981" : "#059669"}
            colors={["#10b981"]}
          />
        }
      >
        <View className="flex-row items-center gap-x-3 mb-gsd-md">
          <View className={`h-11 w-11 rounded-gsd-md items-center justify-center ${isDark ? 'bg-[#10b98110]' : 'bg-[#10b98105]'} border ${isDark ? 'border-[#10b98120]' : 'border-[#10b98110]'}`}>
            <Image 
              source={require('../../assets/images/logo.png')} 
              className="w-8 h-8"
              style={{ resizeMode: 'contain' }}
            />
          </View>
          <Text className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>Penance</Text>
        </View>

        {/* 1. Monthly Pulse Card */}
        <View className={`overflow-hidden rounded-gsd-lg border mb-gsd-lg shadow-sm ${isDark ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-neutral-100'}`}>
          <LinearGradient
            colors={[isDark ? '#10b98110' : '#10b98105', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="p-gsd-lg">
              <View className="flex-row justify-between items-start mb-gsd-md">
                <View>
                  <Text className={`text-[9px] font-black uppercase tracking-[2px] mb-1 ${isDark ? 'text-white/30' : 'text-black/40'}`}>
                    Liquidity
                  </Text>
                  <Text className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-black'}`} numberOfLines={1} adjustsFontSizeToFit>
                    {format(totalLiquidity)}
                  </Text>
                </View>
                <View className="items-end">
                  <View className={`px-gsd-md py-gsd-xs rounded-gsd-sm border ${isDark ? 'bg-primary/10 border-primary/20' : 'bg-primary/10 border-primary/20'} mb-1`}>
                    <Text className="text-primary font-black text-[8px] uppercase tracking-widest">Active Pulse</Text>
                  </View>
                  <Text className={`${isDark ? 'text-white/20' : 'text-black/20'} text-[6px] font-black uppercase tracking-widest`}>Includes Cash + Stables</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-x-gsd-md pt-gsd-md border-t border-black/[0.03] dark:border-white/[0.03]">
                <View className="flex-1">
                  <Text className={`text-[7px] font-black uppercase tracking-widest mb-0.5 ${isDark ? 'text-white/30' : 'text-black/40'}`}>Income</Text>
                  <Text className="text-xs font-bold text-primary" numberOfLines={1}>+{format(monthlyIncome)}</Text>
                </View>
                <View className={`w-[1px] h-4 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                <View className="flex-1">
                  <Text className={`text-[7px] font-black uppercase tracking-widest mb-0.5 ${isDark ? 'text-white/30' : 'text-black/40'}`}>Expenses</Text>
                  <Text className="text-xs font-bold text-destructive" numberOfLines={1}>-{format(monthlyExpenses)}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions Panel */}
        <View className="flex-row gap-x-gsd-sm mb-gsd-lg">
          <TouchableOpacity
            onPress={() => setActiveType('income')}
            className={`flex-1 rounded-gsd-md border p-gsd-md flex-row items-center justify-center gap-x-gsd-sm ${isDark ? 'bg-[#10b98110] border-[#10b98120]' : 'bg-[#10b98108] border-primary/10'}`}
          >
            <View className="h-gsd-huge w-gsd-huge rounded-gsd-sm bg-primary items-center justify-center">
              <IconSymbol name="plus" size={14} color="#ffffffff" />
            </View>
            <Text className="text-primary font-black text-[9px] uppercase tracking-widest">Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveType('expense')}
            className={`flex-1 rounded-gsd-md border p-gsd-md flex-row items-center justify-center gap-x-gsd-sm ${isDark ? 'bg-[#ef444410] border-[#ef444420]' : 'bg-[#ef444408] border-destructive/10'}`}
          >
            <View className="h-gsd-huge w-gsd-huge rounded-gsd-sm bg-destructive items-center justify-center">
              <IconSymbol name="minus" size={14} color="#fff" />
            </View>
            <Text className="text-destructive font-black text-[9px] uppercase tracking-widest">Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Panels Grid */}
        <View className="gap-y-gsd-md">
          {/* Portfolio Panel */}
          <TouchableOpacity
            onPress={() => router.push('/portfolio')}
            className={`rounded-gsd-lg border p-gsd-lg shadow-sm ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-white border-neutral-100'}`}
          >
            <View className="flex-row justify-between items-center mb-gsd-md">
              <View className="flex-row items-center gap-x-gsd-md">
                <View className={`h-gsd-huge w-gsd-huge rounded-gsd-sm items-center justify-center ${isDark ? 'bg-primary/10' : 'bg-primary/10'}`}>
                  <IconSymbol name="chart.pie.fill" size={14} color="#10b77fff" />
                </View>
                <Text className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>Full Portfolio</Text>
              </View>
              <IconSymbol name="chevron.right" size={12} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
            </View>

            {portfolio.length === 0 ? (
              <View className="items-center py-1">
                <Text className="text-primary font-black text-[9px] uppercase tracking-widest">Add Asset</Text>
              </View>
            ) : (
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-black'}`} numberOfLines={1}>
                    {format(totalPortfolioValue)}
                  </Text>
                  <Text className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${portfolioIsPositive ? 'text-primary' : 'text-destructive'}`}>
                    {portfolioIsPositive ? '+' : '-'} {format(Math.abs(portfolioTotalGain))} Gain
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          <View className="flex-row gap-x-4">
            {/* Performance Panel */}
            <TouchableOpacity
              onPress={() => router.push('/analytics')}
              className={`flex-1 rounded-gsd-lg border p-gsd-md h-36 justify-between overflow-hidden shadow-xl ${isDark ? 'bg-[#0C0C0C] border-white/5 shadow-black' : 'bg-white border-neutral-50 shadow-neutral-300'}`}
            >
              <View className="flex-row justify-between items-start">
                <View className={`h-gsd-huge w-gsd-huge rounded-gsd-sm items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <IconSymbol name="chart.line.uptrend.xyaxis.circle.fill" size={14} color="#10b77fff" />
                </View>
                <Text className={`text-[7px] font-black uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>Analytics</Text>
              </View>

              {currentMonthExpenses.length === 0 ? (
                <View className="items-center flex-1 justify-center">
                  <Text className={`font-black text-[7px] uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>No Data</Text>
                </View>
              ) : (
                <View className="flex-1 items-center justify-center pt-1">
                  <MicroExpenseBars data={topExpensesData} isDark={isDark} />
                </View>
              )}
            </TouchableOpacity>

            {/* Budget Panel */}
            <TouchableOpacity
              onPress={() => router.push('/budget')}
              className={`flex-1 rounded-gsd-lg border p-gsd-md h-36 justify-between overflow-hidden shadow-xl ${isDark ? 'bg-[#0C0C0C] border-white/5 shadow-black' : 'bg-white border-neutral-50 shadow-neutral-200'}`}
            >
              <View className="flex-row justify-between items-start">
                <View className={`h-gsd-huge w-gsd-huge rounded-gsd-sm items-center justify-center ${isDark ? 'bg-primary/10' : 'bg-primary/10'}`}>
                  <IconSymbol name="dollarsign.circle.fill" size={14} color="#10b981" />
                </View>
                <Text className={`text-[7px] font-black uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>Budget</Text>
              </View>

              {budgets.length === 0 ? (
                <View className="items-center flex-1 justify-center">
                  <Text className="text-primary font-black text-[7px] uppercase tracking-widest">Set</Text>
                </View>
              ) : (
                <View className="flex-1 items-center justify-center pt-1">
                  <MicroBudgetGauge progress={totalBudgetLimit > 0 ? (monthlyExpenses / totalBudgetLimit) : 0} size={120} isDark={isDark} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Activity Panel */}
          <TouchableOpacity
            onPress={() => router.push('/activity')}
            className={`rounded-gsd-lg border p-gsd-lg shadow-sm ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-white border-neutral-100'}`}
          >
            <View className="flex-row justify-between items-center mb-gsd-md">
              <View className="flex-row items-center gap-x-gsd-md">
                <View className={`h-gsd-huge w-gsd-huge rounded-gsd-sm items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <IconSymbol name="list.bullet" size={14} color="#999" />
                </View>
                <Text className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>Activity</Text>
              </View>
              <IconSymbol name="chevron.right" size={12} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
            </View>
            <View className="gap-y-gsd-xs">
              {recentTransactions.map((tx, idx) => (
                <View key={idx} className={`flex-row justify-between items-center p-gsd-md rounded-gsd-md border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-black/[0.02] border-neutral-50'}`}>
                  <View>
                    <Text className={`font-bold text-[10px] ${isDark ? 'text-white' : 'text-black'}`}>{tx.category}</Text>
                    <Text className={`text-[8px] uppercase font-black tracking-widest mt-0.5 ${isDark ? 'text-white/20' : 'text-black/30'}`}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text className={`text-[10px] ${tx.isIncome ? "text-primary font-black" : "text-destructive font-black"}`}>
                    {tx.isIncome ? '+' : '-'} {format(tx.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {/* Goals Panel */}
          <TouchableOpacity
            onPress={() => router.push('/goals')}
            className={`rounded-gsd-lg border p-gsd-lg mb-gsd-sm shadow-sm ${isDark ? 'bg-[#0C0C0C] border-white/5' : 'bg-white border-neutral-100'}`}
          >
            <View className="flex-row justify-between items-center mb-gsd-md">
              <View className="flex-row items-center gap-x-gsd-md">
                <View className={`h-gsd-huge w-gsd-huge rounded-gsd-sm items-center justify-center ${isDark ? 'bg-purple-500/10' : 'bg-purple-500/10'}`}>
                  <IconSymbol name="target" size={14} color="#8b5cf6" />
                </View>
                <Text className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>Goals</Text>
              </View>
              <IconSymbol name="chevron.right" size={12} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
            </View>
            {goals[0] ? (
              <GoalProgressGlimpse goal={goals[0]} />
            ) : (
              <View className="flex-row items-center justify-center py-1">
                <Text className="text-[#8b5cf6] font-black text-[8px] uppercase tracking-widest">Set Goal</Text>
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
