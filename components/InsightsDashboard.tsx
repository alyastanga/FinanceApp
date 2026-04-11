import withObservables from '@nozbe/watermelondb/react/withObservables';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, Modal } from 'react-native';
import database from '../database';

// UI Components
import { IconSymbol } from '@/components/ui/icon-symbol';
import PortfolioSnapshot from '@/components/ui/PortfolioSnapshot';
import SafeToSpendView from '@/components/ui/SafeToSpendView';
import ScenarioSimulator from '@/components/ui/ScenarioSimulator';
import { SavingsRateView } from './ui/SavingsRateView';
import { TrendChart } from './ui/TrendChart';
import { BudgetChart } from './ui/BudgetChart';

// Context
import { useAI } from '../context/AIContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Services
import { explainFinancialGraph } from '@/lib/ai-service';
import { calculateBudgetInsights, calculateRunway } from '@/lib/budget-engine';
import { useCurrency } from '@/context/CurrencyContext';
import { normalizeDate } from '@/lib/date-utils';

interface InsightsDashboardProps {
  incomes: any[];
  expenses: any[];
  goals: any[];
  portfolio: any[];
  useLocal?: boolean;
}

// Sub-component for Goal Progress
const GoalMonitoringItem = ({ goal, isDark }: { goal: any, isDark: boolean }) => {
  const { format } = useCurrency();
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <View className={`p-6 rounded-[32px] border ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.02] border-black/5'} mb-4`}>
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className={`${textClass} font-black text-lg tracking-tight`}>{goal.name}</Text>
          <Text className={`${subTextClass} text-[9px] font-black uppercase tracking-widest`}>
            Target: {format(goal.targetAmount, goal.currency)}
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
          Saved: {format(goal.currentAmount)}
        </Text>
        <Text className={`${subTextClass} text-[9px] font-black uppercase tracking-widest`}>
          Left: {format(goal.targetAmount - goal.currentAmount)}
        </Text>
      </View>
    </View>
  );
};

const InsightsDashboardBase = ({ incomes, expenses, goals, portfolio, useLocal = false }: InsightsDashboardProps) => {
  const { session, loading } = useAuth();
  const { isDark } = useTheme();
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
              <View className={`mx-6 my-4 h-[1px] ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
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
            <TouchableOpacity
              onPress={() => setShowTrendDetail(true)}
              activeOpacity={0.8}
            >
              <BlurView intensity={15} tint={isDark ? "dark" : "light"} className={`rounded-[44px] border ${isDark ? 'border-white/10' : 'border-black/10'} overflow-hidden p-8`}>
                <TrendChart incomes={incomes} expenses={expenses} isDark={isDark} />
              </BlurView>
            </TouchableOpacity>
            {renderAIInsight('performance')}
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
                onPress={() => handleExplain('spending', 'Categorical Spending Breakdown', { categorySpending })}
                className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center shadow-sm shadow-primary/20"
              >
                <IconSymbol name="sparkles" size={14} color="#10b981" />
              </TouchableOpacity>
            </View>

            {/* Mode Selector */}
            <View className="flex-row bg-white/5 rounded-2xl p-1 border border-white/5 mx-2">
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
                  <Text className={`text-[9px] font-black uppercase tracking-widest ${spendingMode === m.id ? 'text-[#050505]' : 'text-white/40'}`}>
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
                      className={`px-4 py-3 rounded-2xl border ${isSelected ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/5'}`}
                    >
                      <Text className={`text-[10px] font-black uppercase tracking-[1.5px] ${isSelected ? 'text-primary' : 'text-white/60'}`}>
                        {date.toLocaleString('default', { month: 'short', year: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <BlurView intensity={15} tint={isDark ? "dark" : "light"} className={`rounded-[44px] border ${isDark ? 'border-white/10' : 'border-black/10'} overflow-hidden h-[400px]`}>
              <BudgetChart 
                data={categorySpending} 
                isDark={isDark} 
                size={250} 
                title={spendingMode === 'current' ? "MONTHLY" : spendingMode === 'overall' ? "LIFETIME" : (selectedHistoryMonth ? selectedHistoryMonth.replace('-', ' ') : 'ARCHIVE')}
              />
            </BlurView>
            {renderAIInsight('spending')}
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

      {/* Trend Detail Modal */}
      <Modal
        visible={showTrendDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTrendDetail(false)}
      >
        <View className="flex-1 bg-[#050505]">
          <SafeAreaView className="flex-1">
            <View className="px-6 pt-10 pb-6 flex-row justify-between items-center">
              <View>
                <Text className="text-3xl font-black text-white tracking-tighter">Performance Analysis</Text>
                <Text className="text-xs font-black uppercase tracking-[3px] text-white/40 mt-1">Full-Scale Context</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTrendDetail(false)}
                className="h-10 w-10 rounded-full bg-white/5 items-center justify-center border border-white/5"
              >
                <IconSymbol name="xmark" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="px-6 py-10">
                <BlurView intensity={30} tint="dark" className="rounded-[48px] border border-white/10 p-8 overflow-hidden bg-white/[0.02]">
                  <TrendChart incomes={incomes} expenses={expenses} height={350} isDark={true} />
                </BlurView>

                {/* Detailed Analysis Card */}
                <View className="mt-10 p-8 rounded-[40px] bg-primary/5 border border-primary/20">
                   <View className="flex-row items-center gap-x-2 mb-4">
                      <IconSymbol name="chart.bar.xaxis" size={16} color="#10b981" />
                      <Text className="text-[10px] font-black uppercase text-primary tracking-widest">Monthly Breakdown</Text>
                   </View>
                   <Text className="text-white/60 text-xs leading-5">
                      This expanded view allows you to see the critical intersection of your income and expenses over the last 12 months. 
                      Notice the peak variances—these represent your highest opportunities for savings or investment reallocation.
                   </Text>
                </View>

                <View className="mt-6 p-8 rounded-[40px] bg-[#111] border border-white/5">
                   <Text className="text-white/40 text-[10px] font-black uppercase tracking-[2px] mb-4">Historical Extremes</Text>
                   <View className="flex-row justify-between">
                      <View>
                        <Text className="text-[9px] font-black text-white/30 uppercase tracking-[1px] mb-1">Max Monthly Income</Text>
                        <Text className="text-primary font-black text-xl tracking-tight">
                           +{format(Math.max(...trendData.map(d => d.income)))}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[9px] font-black text-white/30 uppercase tracking-[1px] mb-1">Max Monthly Expense</Text>
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
