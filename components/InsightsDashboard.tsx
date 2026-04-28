import withObservables from '@nozbe/watermelondb/react/withObservables';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import database from '../database';

// UI Components
import { IconSymbol } from '@/components/ui/icon-symbol';
import PortfolioSnapshot from '@/components/ui/PortfolioSnapshot';
import SafeToSpendView from '@/components/ui/SafeToSpendView';
import ScenarioSimulator from '@/components/ui/ScenarioSimulator';
import { BudgetChart } from './ui/BudgetChart';
import { SavingsRateView } from './ui/SavingsRateView';
import { TrendChart } from './ui/TrendChart';

// Context
import { useAI } from '../context/AIContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Services
import { useCurrency } from '@/context/CurrencyContext';
import { explainFinancialGraph } from '@/lib/ai-service';
import { calculateBudgetInsights, calculateRunway } from '@/lib/budget-engine';
import { normalizeDate } from '@/lib/date-utils';

interface InsightsDashboardProps {
  incomes: any[];
  expenses: any[];
  goals: any[];
  portfolio: any[];
  useLocal?: boolean;
}

// Sub-component for Goal Progress
import { GoalProgressCard } from './ui/GoalProgressCard';

// Sub-component for Goal Progress
const GoalMonitoringItem = ({ goal, isDark }: { goal: any, isDark: boolean }) => {
  return <GoalProgressCard goal={goal} isDark={isDark} />;
};

const InsightsDashboardBase = ({ incomes, expenses, goals, portfolio, useLocal = false }: InsightsDashboardProps) => {
  const { session, loading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const { format, convertFrom, currency } = useCurrency();
  const { aiMode } = useAI();
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplains, setLoadingExplains] = useState<Record<string, boolean>>({});
  const [showTrendDetail, setShowTrendDetail] = useState(false);
  const [spendingMode, setSpendingMode] = useState<'current' | 'overall' | 'history'>('current');
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null);



  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach(exp => {
      const t = normalizeDate(exp);
      if (t === 0) return;
      const d = new Date(t);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const incs = incomes.filter(inc => {
      const t = normalizeDate(inc);
      return t >= start && t <= end;
    });
    const exps = expenses.filter(exp => {
      const t = normalizeDate(exp);
      return t >= start && t <= end;
    });

    return {
      currentMonthIncome: incs.reduce((acc, curr) => acc + convertFrom(curr.amount, curr.currency || currency), 0),
      currentMonthExpenses: exps.reduce((acc, curr) => acc + convertFrom(curr.amount, curr.currency || currency), 0)
    };
  }, [incomes, expenses, convertFrom, currency]);

  const { trendData } = useMemo(() => {
    const trend = [];
    const now = new Date();



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
        .reduce((acc, curr) => acc + convertFrom(curr.amount, curr.currency || currency), 0);

      const expenseValue = expenses
        .filter(exp => {
          const t = normalizeDate(exp);
          return t >= monthStart && t <= monthEnd;
        })
        .reduce((acc, curr) => acc + convertFrom(curr.amount, curr.currency || currency), 0);

      trend.push({ label, income: incomeValue, expense: expenseValue });
    }

    return { trendData: trend };
  }, [incomes, expenses, convertFrom, currency]);

  const categorySpending = useMemo(() => {
    let filtered = expenses;
    const now = new Date();

    if (spendingMode === 'current') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      filtered = expenses.filter(e => {
        const t = normalizeDate(e);
        return t >= start && t <= end;
      });
    } else if (spendingMode === 'history' && selectedHistoryMonth) {
      const [year, month] = selectedHistoryMonth.split('-').map(Number);
      const start = new Date(year, month - 1, 1).getTime();
      const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
      filtered = expenses.filter(e => {
        const t = normalizeDate(e);
        return t >= start && t <= end;
      });
    }

    const categoryMap = filtered.reduce((acc, curr) => {
      const category = curr.category || 'Other';
      acc[category] = (acc[category] || 0) + (Math.abs(curr.amount) || 0);
      return acc;
    }, {} as Record<string, number>);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
    return Object.entries(categoryMap)
      .map(([label, value], index) => ({
        label,
        value: value as number,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => (b.value as number) - (a.value as number));
  }, [expenses, spendingMode, selectedHistoryMonth]);

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

  const renderAIInsight = (id: string, chatPrompt?: string) => {
    const text = explanations[id];
    const isLoading = loadingExplains[id];
    if (!text && !isLoading) return null;

    return (
      <View
        className={`mt-4 p-5 rounded-[32px] border ${isDark ? 'bg-primary/5 border-primary/20' : 'bg-primary/10 border-primary/30'} overflow-hidden shadow-sm shadow-primary/10`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-x-2">
            <IconSymbol name="sparkles" size={12} color="#10b981" />
            <Text className="text-[10px] font-black text-primary uppercase tracking-widest">AI Financial Insight</Text>
          </View>
          {/* Dismiss button */}
          {!isLoading && text && (
            <TouchableOpacity
              onPress={() => setExplanations(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
              })}
              className="h-6 w-6 rounded-full bg-white/5 items-center justify-center"
            >
              <IconSymbol name="xmark" size={10} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View className="py-3 items-center">
            <ActivityIndicator size="small" color="#10b981" />
            <Text className={`${isDark ? 'text-white/30' : 'text-black/30'} text-[9px] font-black uppercase tracking-widest mt-2`}>Analyzing...</Text>
          </View>
        ) : (
          <>
            <Text className={`${isDark ? 'text-white/80' : 'text-black/80'} text-xs leading-5 mb-4`}>{text}</Text>
            {/* Continue with Chat button */}
            {chatPrompt && (
              <TouchableOpacity
                onPress={() => router.push(`/ai?agent=consultant&prompt=${encodeURIComponent(chatPrompt)}&_t=${Date.now()}`)}
                className="flex-row items-center self-start gap-x-2 px-4 py-2.5 rounded-full bg-primary/20 border border-primary/30"
              >
                <IconSymbol name="bubble.left.fill" size={12} color="#10b981" />
                <Text className="text-primary text-[9px] font-black uppercase tracking-widest">Continue with Chat</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };


  const insights = calculateBudgetInsights(incomes, expenses, goals, convertFrom, currency);
  const runway = calculateRunway(portfolio, expenses, convertFrom, currency);
  const totalPortfolioValue = portfolio.reduce((sum, p) => sum + convertFrom(p.value || 0, p.currency || p._currency || currency), 0);
  const netFlowValue = insights.monthlyIncome - insights.monthlyFixedExpenses - (insights.variableSpent || 0);
  const netWorthValue = totalPortfolioValue + (netFlowValue > 0 ? netFlowValue : 0);

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-6 px-8 pb-12 overflow-hidden">
          <LinearGradient
            colors={[isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.05)', 'transparent']}
            className="absolute top-0 left-0 right-0 h-96"
          />
          <Text className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-black'}`}>Monitoring</Text>
          <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[10px] font-black uppercase tracking-[4px] mb-4`}>
            Real-time financial analytics
          </Text>

          <View className="mb-8">
            <Text className={`${isDark ? 'text-white/60' : 'text-black/60'} text-xs font-bold uppercase tracking-widest mb-1`}>Total Net Worth</Text>
            <View className="flex-row items-baseline gap-x-3 flex-wrap">
              <Text className={`${isDark ? 'text-white' : 'text-black'} text-6xl font-black tracking-tighter`}>
                {format(netWorthValue)}
              </Text>
              <View className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                <Text className="text-primary font-black text-[10px] uppercase tracking-widest">
                  {runway.runwayDays > 365 ? `${(runway.runwayDays / 365).toFixed(1)}YR` : `${runway.runwayDays} Days`} Freedom
                </Text>
              </View>
            </View>
            <Text className={`${isDark ? 'text-white/20' : 'text-black/20'} text-[9px] font-black uppercase tracking-[2px] mt-2`}>
              Survival Capacity at {format(runway.dailyBurnRate)}/day burn
            </Text>
          </View>

          <View className="flex-row gap-x-4">
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`flex-1 rounded-[32px] border ${isDark ? 'border-white/5' : 'border-black/5'} overflow-hidden p-5`}>
              <View className="flex-row justify-between items-center mb-1">
                <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[8px] font-black uppercase tracking-widest`}>
                  {insights.actualIncome > 0 ? 'Actual Income' : 'Income Goal'}
                </Text>
                {insights.monthlyIncome > insights.actualIncome && (
                  <View className="bg-primary/20 px-1.5 py-0.5 rounded-full">
                    <Text className="text-primary text-[6px] font-black uppercase">Strategy</Text>
                  </View>
                )}
              </View>
              <Text className={`${isDark ? 'text-white' : 'text-black'} text-xl font-black`}>
                {format(insights.actualIncome > 0 ? insights.actualIncome : insights.monthlyIncome)}
              </Text>
            </BlurView>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`flex-1 rounded-[32px] border ${isDark ? 'border-white/5' : 'border-black/5'} overflow-hidden p-5`}>
              <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[8px] font-black uppercase tracking-widest mb-1`}>Fixed Expenses</Text>
              <Text className="text-destructive text-xl font-black">-{format(insights.monthlyFixedExpenses)}</Text>
            </BlurView>
          </View>
        </View>

        <View className="px-6 gap-y-10">
          {/* Main Financial Gauges */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-black'} uppercase tracking-[3px] opacity-50`}>Budget Intelligence</Text>
              <TouchableOpacity
                onPress={() => handleExplain('budget', 'Daily Budget Health & Safe-to-Spend', { dailySafeToSpend: insights.dailySafeToSpend, monthlyIncome: insights.monthlyIncome, fixedExpenses: insights.monthlyFixedExpenses })}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center"
              >
                {loadingExplains['budget'] ? <ActivityIndicator size="small" color="#10b981" /> : <IconSymbol name="sparkles" size={14} color="#10b981" />}
              </TouchableOpacity>
            </View>
            <BlurView intensity={15} tint={isDark ? "dark" : "light"} className={`rounded-[44px] border ${isDark ? 'border-white/10' : 'border-black/10'} overflow-hidden`}>
              <SafeToSpendView
                amount={insights.dailySafeToSpend}
                totalMonthlyIncome={insights.monthlyIncome}
                isDark={isDark}
              />
              <View className={`mx-6 my-4 h-[1px] ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
              <SavingsRateView incomes={incomes} expenses={expenses} isDark={isDark} />
            </BlurView>
            {renderAIInsight('budget', 'Explain the Daily Budget Health and Safe-to-Spend limit based on my current month in more detail.')}
          </View>

          {/* Performance & Trends */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-black'} uppercase tracking-[3px] opacity-50`}>Performance</Text>
              <TouchableOpacity
                onPress={() => handleExplain('performance', '6-Month Performance Trends', trendData)}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center"
              >
                {loadingExplains['performance'] ? <ActivityIndicator size="small" color="#10b981" /> : <IconSymbol name="sparkles" size={14} color="#10b981" />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setShowTrendDetail(true)}
              activeOpacity={0.8}
            >
              <BlurView intensity={15} tint={isDark ? "dark" : "light"} className={`rounded-[44px] border ${isDark ? 'border-white/10' : 'border-black/10'} overflow-hidden p-5`}>
                <TrendChart incomes={incomes} expenses={expenses} isDark={isDark} />
              </BlurView>
            </TouchableOpacity>
            {renderAIInsight('performance', 'Analyze my 6-month wealth velocity and performance trends in more detail.')}
          </View>

          {/* Spending Habits */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <View>
                <Text className={`text-[10px] font-black uppercase ${isDark ? 'text-white/40' : 'text-black/40'} tracking-[3px]`}>Spending Habits</Text>
                <Text className={`text-[9px] font-black uppercase tracking-[1px] mt-1 ${isDark ? 'text-white/20' : 'text-black/20'}`}>
                  {spendingMode === 'current' ? 'Insights for current month' : spendingMode === 'overall' ? 'Lifetime distribution' : 'In-depth archive'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleExplain('spending', 'Categorical Spending Habits', categorySpending)}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center shadow-sm shadow-primary/20"
              >
                {loadingExplains['spending'] ? <ActivityIndicator size="small" color="#10b981" /> : <IconSymbol name="sparkles" size={14} color="#10b981" />}
              </TouchableOpacity>
            </View>

            {/* Mode Selector */}
            <View className={`flex-row rounded-2xl p-1 border mx-2 ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
              {[
                { id: 'current', label: 'Current' },
                { id: 'overall', label: 'Overall' },
                { id: 'history', label: 'History' }
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setSpendingMode(m.id as any)}
                  className={`flex-1 py-2.5 rounded-xl items-center ${spendingMode === m.id ? 'bg-primary' : ''}`}
                >
                  <Text className={`text-[9px] font-black uppercase tracking-widest ${spendingMode === m.id ? 'text-[#050505]' : (isDark ? 'text-white/40' : 'text-black/40')}`}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Month Browser (History Mode) */}
            {spendingMode === 'history' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-2"
                contentContainerStyle={{ paddingHorizontal: 12, columnGap: 8 }}
              >
                {availableMonths.map((mString) => {
                  const [y, m] = mString.split('-');
                  const date = new Date(Number(y), Number(m) - 1);
                  const isSelected = selectedHistoryMonth === mString;

                  return (
                    <TouchableOpacity
                      key={mString}
                      onPress={() => setSelectedHistoryMonth(mString)}
                      className={`px-4 py-3 rounded-2xl border ${isSelected ? (isDark ? 'bg-primary/20 border-primary/40' : 'bg-primary/20 border-primary/40') : (isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5')}`}
                    >
                      <Text className={`text-[10px] font-black uppercase tracking-[1.5px] ${isSelected ? 'text-primary' : (isDark ? 'text-white/60' : 'text-black/60')}`}>
                        {date.toLocaleString('default', { month: 'short', year: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <BlurView intensity={15} tint={isDark ? "dark" : "light"} className={`rounded-[44px] border ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <View className="p-8">
                <BudgetChart
                  data={categorySpending}
                  isDark={isDark}
                  size={260}
                  title={spendingMode === 'current' ? "MONTHLY" : spendingMode === 'overall' ? "LIFETIME" : (selectedHistoryMonth ? selectedHistoryMonth.replace('-', ' ') : 'ARCHIVE')}
                />
              </View>
            </BlurView>
            {renderAIInsight('spending', 'Provide a detailed breakdown of my categorical spending habits with actionable advice.')}
          </View>

          {/* Wealth Management */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-black'} uppercase tracking-[3px] opacity-50`}>Wealth Management</Text>
              <TouchableOpacity
                onPress={() => handleExplain('wealth', 'Asset Allocation & Wealth Management', portfolio)}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center"
              >
                {loadingExplains['wealth'] ? <ActivityIndicator size="small" color="#10b981" /> : <IconSymbol name="sparkles" size={14} color="#10b981" />}
              </TouchableOpacity>
            </View>
            <PortfolioSnapshot portfolio={portfolio} isDark={isDark} />
            {renderAIInsight('wealth', 'Evaluate my current Asset Allocation diversity and Wealth Management strategy in more detail.')}
          </View>

          {/* Strategy */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-black'} uppercase tracking-[3px] opacity-50`}>Strategy</Text>
              <TouchableOpacity
                onPress={() => handleExplain('strategy', 'Financial Strategy & Projections', { incomes: incomes.length, expenses: expenses.length, goals: goals.map((g: any) => ({ name: g.name, target: g.targetAmount, current: g.currentAmount })) })}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center"
              >
                {loadingExplains['strategy'] ? <ActivityIndicator size="small" color="#10b981" /> : <IconSymbol name="sparkles" size={14} color="#10b981" />}
              </TouchableOpacity>
            </View>
            <ScenarioSimulator incomes={incomes} expenses={expenses} goals={goals} isDark={isDark} />
            {renderAIInsight('strategy', 'Run a scenario simulation on my current financial strategy and wealth projections in more detail.')}
          </View>

          {/* Goal Progress Monitoring */}
          <View className="gap-y-6">
            <View className="flex-row justify-between items-center px-2">
              <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-black'} uppercase tracking-[3px] opacity-50`}>Goal Monitoring</Text>
              <TouchableOpacity
                onPress={() => handleExplain('goals', 'Goal Progress & Milestones', goals.map((g: any) => ({ name: g.name, target: g.targetAmount, current: g.currentAmount })))}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center"
              >
                {loadingExplains['goals'] ? <ActivityIndicator size="small" color="#10b981" /> : <IconSymbol name="sparkles" size={14} color="#10b981" />}
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
            {renderAIInsight('goals', 'Summarize my progress across all financial goals and milestones in more detail.')}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showTrendDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTrendDetail(false)}
      >
        <View className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
          <SafeAreaView className="flex-1">
            <View className="px-6 pt-14 pb-6 flex-row justify-between items-center">
              <View>
                <Text className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>Performance Analysis</Text>
                <Text className={`text-xs font-black uppercase tracking-[3px] mt-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Full-Scale Context</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTrendDetail(false)}
                className={`h-10 w-10 rounded-full items-center justify-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
              >
                <IconSymbol name="xmark" size={18} color={isDark ? "#fff" : "#000"} />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="px-6 py-10">
                <BlurView intensity={30} tint={isDark ? "dark" : "light"} className={`rounded-[48px] border p-8 overflow-hidden ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}>
                  <TrendChart incomes={incomes} expenses={expenses} height={350} isDark={isDark} />
                </BlurView>

                {/* Detailed Analysis Card */}
                <View className="mt-10 p-8 rounded-[40px] bg-primary/5 border border-primary/20">
                  <View className="flex-row items-center gap-x-2 mb-4">
                    <IconSymbol name="chart.bar.xaxis" size={16} color="#10b981" />
                    <Text className="text-[10px] font-black uppercase text-primary tracking-widest">Monthly Breakdown</Text>
                  </View>
                  <Text className={`text-xs leading-5 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                    This expanded view allows you to see the critical intersection of your income and expenses over the last 12 months.
                    Notice the peak variances—these represent your highest opportunities for savings or investment reallocation.
                  </Text>
                </View>

                <View className={`mt-6 p-8 rounded-[40px] border ${isDark ? 'bg-[#111] border-white/5' : 'bg-white border-black/5'}`}>
                  <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-4 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Historical Extremes</Text>
                  <View className="flex-row justify-between">
                    <View>
                      <Text className={`text-[9px] font-black uppercase tracking-[1px] mb-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Max Monthly Income</Text>
                      <Text className="text-primary font-black text-xl tracking-tight">
                        +{format(Math.max(...trendData.map(d => d.income)))}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className={`text-[9px] font-black uppercase tracking-[1px] mb-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Max Monthly Expense</Text>
                      <Text className="text-destructive font-black text-xl tracking-tight">
                        -{format(Math.max(...trendData.map(d => d.expense)))}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
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
