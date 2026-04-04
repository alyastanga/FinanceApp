import withObservables from '@nozbe/watermelondb/react/withObservables';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import database from '../database';

// UI Components
import { IconSymbol } from '@/components/ui/icon-symbol';
import PortfolioSnapshot from '@/components/ui/PortfolioSnapshot';
import SafeToSpendView from '@/components/ui/SafeToSpendView';
import ScenarioSimulator from '@/components/ui/ScenarioSimulator';
import { SavingsRateView } from './ui/SavingsRateView';
import { TrendChart } from './ui/TrendChart';

// Context
import { useAI } from '../context/AIContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Services
import { explainFinancialGraph } from '@/lib/ai-service';
import { calculateBudgetInsights } from '@/lib/budget-engine';

interface InsightsDashboardProps {
  incomes: any[];
  expenses: any[];
  goals: any[];
  portfolio: any[];
  useLocal?: boolean;
}

// Sub-component for Goal Progress
const GoalMonitoringItem = ({ goal, isDark }: { goal: any, isDark: boolean }) => {
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <View className={`p-6 rounded-[32px] border ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.02] border-black/5'} mb-4`}>
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className={`${textClass} font-black text-lg tracking-tight`}>{goal.name}</Text>
          <Text className={`${subTextClass} text-[9px] font-black uppercase tracking-widest`}>
            Target: ${goal.targetAmount.toLocaleString()}
          </Text>
        </View>
        <Text className="text-primary font-black text-lg">{Math.round(progress)}%</Text>
      </View>

      <View className={`h-2 w-full ${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-full overflow-hidden`}>
        <View
          className="h-full bg-primary rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>

      <View className="flex-row justify-between mt-3">
        <Text className={`${subTextClass} text-[9px] font-black uppercase tracking-widest`}>
          Saved: ${goal.currentAmount.toLocaleString()}
        </Text>
        <Text className={`${subTextClass} text-[9px] font-black uppercase tracking-widest`}>
          Left: ${(goal.targetAmount - goal.currentAmount).toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const InsightsDashboardBase = ({ incomes, expenses, goals, portfolio, useLocal = false }: InsightsDashboardProps) => {
  const { session, loading } = useAuth();
  const { isDark } = useTheme();
  const { aiMode } = useAI();
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplains, setLoadingExplains] = useState<Record<string, boolean>>({});

  // Guard: Ensure session is loaded before rendering heavy charts
  if (loading || !session) {
    return (
      <View className="py-20 items-center justify-center">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  const handleExplain = async (id: string, sectionTitle: string, data: any) => {
    if (loadingExplains[id]) return;

    setLoadingExplains(prev => ({ ...prev, [id]: true }));
    try {
      const response = await explainFinancialGraph(data, sectionTitle, aiMode === 'local');
      setExplanations(prev => ({ ...prev, [id]: response }));
    } catch (error) {
      setExplanations(prev => ({ ...prev, [id]: "Failed to generate explanation. Check your connection." }));
    } finally {
      setLoadingExplains(prev => ({ ...prev, [id]: false }));
    }
  };

  const renderAIInsight = (id: string) => {
    const text = explanations[id];
    const isLoading = loadingExplains[id];
    if (!text && !isLoading) return null;

    return (
      <View
        className={`mt-4 p-5 rounded-[32px] border ${isDark ? 'bg-primary/5 border-primary/20' : 'bg-primary/10 border-primary/30'} overflow-hidden shadow-sm shadow-primary/10`}
      >
        <View className="flex-row items-center gap-x-2 mb-2">
          <IconSymbol name="sparkles" size={12} color="#10b981" />
          <Text className="text-[10px] font-black text-primary uppercase tracking-widest">AI Financial Insight</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color="#10b981" />
        ) : (
          <Text className={`${isDark ? 'text-white/80' : 'text-black/80'} text-xs leading-5`}>{text}</Text>
        )}
      </View>
    );
  };

  const { currentMonthIncome, currentMonthExpenses } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const normalizeDate = (record: any) => {
      if (!record) return 0;
      const val = record.createdAt || record.created_at || (record._raw && record._raw.created_at);
      if (!val) return 0;
      if (val instanceof Date) return val.getTime();
      const num = Number(val);
      if (isNaN(num) || num === 0) return 0;
      return num < 30000000000 ? num * 1000 : num;
    };

    const incs = incomes.filter(inc => {
      const t = normalizeDate(inc);
      return t >= start && t <= end;
    });
    const exps = expenses.filter(exp => {
      const t = normalizeDate(exp);
      return t >= start && t <= end;
    });

    return {
      currentMonthIncome: incs.reduce((acc, curr) => acc + curr.amount, 0),
      currentMonthExpenses: exps.reduce((acc, curr) => acc + curr.amount, 0)
    };
  }, [incomes, expenses]);

  const { trendData } = useMemo(() => {
    const trend = [];
    const now = new Date();

    const normalizeDate = (record: any) => {
      if (!record) return 0;
      const val = record.createdAt || record.created_at || (record._raw && record._raw.created_at);
      if (val instanceof Date) return val.getTime();
      const num = Number(val);
      if (!val || isNaN(num) || num === 0) return 0;
      return num < 30000000000 ? num * 1000 : num;
    };

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

      const incomeValue = incomes
        .filter(inc => {
          const t = normalizeDate(inc);
          return t >= monthStart && t <= monthEnd;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

      const expenseValue = expenses
        .filter(exp => {
          const t = normalizeDate(exp);
          return t >= monthStart && t <= monthEnd;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

      trend.push({ label, income: incomeValue, expense: expenseValue });
    }

    return { trendData: trend };
  }, [incomes, expenses]);

  const insights = calculateBudgetInsights(incomes, expenses, goals);
  const totalPortfolioValue = portfolio.reduce((sum, p) => sum + (p.value || 0), 0);
  const netFlowValue = insights.monthlyIncome - insights.monthlyFixedExpenses;
  const netWorthValue = totalPortfolioValue + (netFlowValue > 0 ? netFlowValue : 0);

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-20 px-8 pb-12 overflow-hidden">
          <LinearGradient
            colors={[isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.05)', 'transparent']}
            className="absolute top-0 left-0 right-0 h-96"
          />
          <Text className="text-3xl font-black text-white mb-2">Monitoring</Text>
          <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[10px] font-black uppercase tracking-[4px] mb-4`}>
            Real-time financial analytics
          </Text>

          <View className="mb-8">
            <Text className={`${isDark ? 'text-white/60' : 'text-black/60'} text-xs font-bold uppercase tracking-widest mb-1`}>Total Net Worth</Text>
            <View className="flex-row items-baseline">
              <Text className={`${isDark ? 'text-white' : 'text-black'} text-6xl font-black tracking-tighter`}>$</Text>
              <Text className={`${isDark ? 'text-white' : 'text-black'} text-6xl font-black tracking-tighter`}>
                {netWorthValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-x-4">
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`flex-1 rounded-[32px] border ${isDark ? 'border-white/5' : 'border-black/5'} overflow-hidden p-5`}>
              <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[8px] font-black uppercase tracking-widest mb-1`}>Mth. Income</Text>
              <Text className={`${isDark ? 'text-white' : 'text-black'} text-xl font-black`}>${insights.monthlyIncome.toLocaleString()}</Text>
            </BlurView>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`flex-1 rounded-[32px] border ${isDark ? 'border-white/5' : 'border-black/5'} overflow-hidden p-5`}>
              <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[8px] font-black uppercase tracking-widest mb-1`}>Fixed Expenses</Text>
              <Text className="text-destructive text-xl font-black">-${insights.monthlyFixedExpenses.toLocaleString()}</Text>
            </BlurView>
          </View>
        </View>

        <View className="px-6 gap-y-10">
          {/* Main Financial Gauges */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-black'} uppercase tracking-[3px] opacity-50`}>Budget Intelligence</Text>
              <TouchableOpacity
                onPress={() => handleExplain('budget', 'Daily Budget Health', { amount: insights.dailySafeToSpend, income: insights.monthlyIncome })}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center"
              >
                <IconSymbol name="sparkles" size={14} color="#10b981" />
              </TouchableOpacity>
            </View>
            <BlurView intensity={15} tint={isDark ? "dark" : "light"} className={`rounded-[44px] border ${isDark ? 'border-white/10' : 'border-black/10'} overflow-hidden`}>
              <SafeToSpendView
                amount={insights.dailySafeToSpend}
                totalMonthlyIncome={insights.monthlyIncome}
                isDark={isDark}
              />
              <View className={`mx-6 h-[1px] ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
              <SavingsRateView incomes={incomes} expenses={expenses} isDark={isDark} />
            </BlurView>
            {renderAIInsight('budget')}
          </View>

          {/* Performance & Trends */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-black'} uppercase tracking-[3px] opacity-50`}>Performance</Text>
              <TouchableOpacity
                onPress={() => handleExplain('performance', '6-Month Wealth Velocity', { trendData })}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center"
              >
                <IconSymbol name="sparkles" size={14} color="#10b981" />
              </TouchableOpacity>
            </View>
            <BlurView intensity={15} tint={isDark ? "dark" : "light"} className={`rounded-[44px] border ${isDark ? 'border-white/10' : 'border-black/10'} overflow-hidden`}>
              <TrendChart incomes={incomes} expenses={expenses} isDark={isDark} />
            </BlurView>
            {renderAIInsight('performance')}
          </View>

          {/* Wealth Management */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-black'} uppercase tracking-[3px] opacity-50`}>Wealth Management</Text>
              <TouchableOpacity
                onPress={() => handleExplain('wealth', 'Asset Allocation Diversity', { portfolio })}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center"
              >
                <IconSymbol name="sparkles" size={14} color="#10b981" />
              </TouchableOpacity>
            </View>
            <BlurView intensity={15} tint={isDark ? "dark" : "light"} className={`rounded-[44px] border ${isDark ? 'border-white/10' : 'border-black/10'} overflow-hidden`}>
              <PortfolioSnapshot portfolio={portfolio} isDark={isDark} />
            </BlurView>
            {renderAIInsight('wealth')}
          </View>

          {/* Strategy */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-black'} uppercase tracking-[3px] opacity-50`}>Strategy</Text>
              <TouchableOpacity
                onPress={() => handleExplain('strategy', 'AI Wealth Projections', { incomes, expenses, goals })}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center"
              >
                <IconSymbol name="sparkles" size={14} color="#10b981" />
              </TouchableOpacity>
            </View>
            <BlurView intensity={15} tint={isDark ? "dark" : "light"} className={`rounded-[44px] border ${isDark ? 'border-white/10' : 'border-black/10'} overflow-hidden`}>
              <ScenarioSimulator incomes={incomes} expenses={expenses} goals={goals} isDark={isDark} />
            </BlurView>
            {renderAIInsight('strategy')}
          </View>

          {/* Goal Progress Monitoring */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-black'} uppercase tracking-[3px] opacity-50`}>Goal Monitoring</Text>
              <TouchableOpacity
                onPress={() => handleExplain('goals', 'Financial Milestone Progress', { goals })}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center"
              >
                <IconSymbol name="sparkles" size={14} color="#10b981" />
              </TouchableOpacity>
            </View>
            <View className="gap-y-4">
              {goals.map((goal: any) => (
                <GoalMonitoringItem key={goal.id} goal={goal} isDark={isDark} />
              ))}
              {goals.length === 0 && (
                <View className={`p-10 items-center justify-center ${isDark ? 'bg-white/[0.02]' : 'bg-black/[0.02]'} rounded-[32px] border border-dashed ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                  <Text className="text-muted-foreground text-xs italic">Set a goal to start monitoring.</Text>
                </View>
              )}
            </View>
            {renderAIInsight('goals')}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const enhance = withObservables([], () => ({
  incomes: database.get('incomes').query().observe(),
  expenses: database.get('expenses').query().observe(),
  goals: database.get('goals').query().observe(),
  portfolio: database.get('portfolio').query().observe(),
}));

export default enhance(InsightsDashboardBase);
