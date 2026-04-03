import React, { useState, useMemo } from 'react';
import { View, Text, Platform, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import database from '../database';

// UI Components
import { BudgetChart } from './ui/BudgetChart';
import { TrendChart } from './ui/TrendChart';
import { SavingsRateView } from './ui/SavingsRateView';
import { CollapsibleCard } from './ui/CollapsibleCard';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Services
import { explainFinancialGraph } from '@/lib/ai-service';

interface InsightsDashboardProps {
  incomes: any[];
  expenses: any[];
  goals: any[];
}

/**
 * InsightsDashboard component (Base)
 */
const InsightsDashboardBase = ({ incomes, expenses, goals }: InsightsDashboardProps) => {
  const { session, loading } = useAuth();
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

  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netFlow = totalIncome - totalExpenses;
  const currentSavingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;

  // 1. Trend Data for Momentum Chart & Savings Rate
  const { trendData, savingsTrend } = useMemo(() => {
    const trend = [];
    const savings = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

      const incomeValue = incomes
        .filter(inc => {
          const t = inc.createdAt instanceof Date ? inc.createdAt.getTime() : inc.createdAt;
          return t >= monthStart && t <= monthEnd;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

      const expenseValue = expenses
        .filter(exp => {
          const t = exp.createdAt instanceof Date ? exp.createdAt.getTime() : exp.createdAt;
          return t >= monthStart && t <= monthEnd;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

      trend.push({ label, income: incomeValue, expense: expenseValue });
      savings.push({ 
        label, 
        rate: incomeValue > 0 ? ((incomeValue - expenseValue) / incomeValue) * 100 : 0 
      });
    }
    return { trendData: trend, savingsTrend: savings };
  }, [incomes, expenses]);

  // 2. Spending Categories
  const categoryMap = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const COLORS = ['#10b981', '#05966 green', '#34d399', '#064e3b', '#1f2937'];
  const chartData = Object.entries(categoryMap)
    .map(([label, value], index) => ({
      label,
      value: value as number,
      color: COLORS[index % COLORS.length]
    }))
    .sort((a, b) => (b.value as number) - (a.value as number));

  const handleExplain = async (id: string, data: any, context: string) => {
    setLoadingExplains(prev => ({ ...prev, [id]: true }));
    const result = await explainFinancialGraph(data, context);
    setExplanations(prev => ({ ...prev, [id]: result }));
    setLoadingExplains(prev => ({ ...prev, [id]: false }));
  };

  const renderAIAnalysis = (id: string) => {
    if (loadingExplains[id]) return null;
    if (!explanations[id]) return null;
    return (
      <View className="mt-4 bg-primary/10 p-4 rounded-2xl border border-primary/20">
        <Text className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">AI Intelligence</Text>
        <Text className="text-white/80 text-sm leading-5">{explanations[id]}</Text>
      </View>
    );
  };

  return (
    <View className="gap-y-6 pb-20">
      {/* 1. Monthly Savings Pulse - Collapsible */}
      <CollapsibleCard 
        title="Savings Rate" 
        subtitle="Efficiency Gauge"
        onExplain={() => handleExplain('savings', savingsTrend, '6-Month Savings Rate Trend')}
        isExplaining={loadingExplains['savings']}
      >
        <SavingsRateView currentRate={currentSavingsRate} trendData={savingsTrend} />
        {renderAIAnalysis('savings')}
      </CollapsibleCard>

      {/* 2. Financial Momentum - Collapsible */}
      <CollapsibleCard 
        title="Momentum" 
        subtitle="Income vs Outgoing Trend"
        initialCollapsed={true}
        onExplain={() => handleExplain('momentum', trendData, '6-Month Financial Momentum')}
        isExplaining={loadingExplains['momentum']}
      >
        <View className="flex-row gap-x-4 mb-6 self-end">
          <View className="flex-row items-center gap-x-2">
            <View className="h-2 w-2 rounded-full bg-primary" />
            <Text className="text-[9px] font-black text-muted-foreground uppercase">Incoming</Text>
          </View>
          <View className="flex-row items-center gap-x-2">
            <View className="h-2 w-2 rounded-full bg-destructive" />
            <Text className="text-[9px] font-black text-muted-foreground uppercase">Outgoing</Text>
          </View>
        </View>
        <TrendChart data={trendData} />
        {renderAIAnalysis('momentum')}
      </CollapsibleCard>

      {/* 3. Spending Mix - Collapsible */}
      <CollapsibleCard 
        title="Spending Mix" 
        subtitle="Categorical Breakdown"
        initialCollapsed={true}
        onExplain={() => handleExplain('mix', chartData, 'Spending Mix by Category')}
        isExplaining={loadingExplains['mix']}
      >
        <View className="items-center py-4">
          {chartData.length > 0 ? (
            <BudgetChart data={chartData} size={200} />
          ) : (
            <Text className="text-muted-foreground text-xs italic">No categorical data available.</Text>
          )}
        </View>
        
        {/* Legend */}
        <View className="mt-4 flex-row flex-wrap gap-2">
          {chartData.slice(0, 5).map((item, idx) => (
            <View key={idx} className="flex-row items-center gap-x-2 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
              <View style={{ backgroundColor: item.color }} className="h-2 w-2 rounded-full" />
              <Text className="text-[9px] font-bold text-white/50">{item.label}</Text>
            </View>
          ))}
        </View>
        {renderAIAnalysis('mix')}
      </CollapsibleCard>

      {/* 4. Goal Progress Monitoring */}
      <View className="gap-y-4 px-1">
        <Text className="text-sm font-black uppercase tracking-[3px] text-muted-foreground ml-3">Goal Monitoring</Text>
        {goals.map((goal) => (
          <GoalMonitoringItem key={goal.id} goal={goal} />
        ))}
        {goals.length === 0 && (
          <View className="p-10 items-center justify-center bg-white/[0.02] rounded-[32px] border border-dashed border-white/10">
             <Text className="text-muted-foreground text-xs italic">Set a goal to start monitoring.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * Goal Monitoring item (Base)
 */
const GoalMonitoringItemBase = ({ goal }: { goal: any }) => {
  const saved = goal.currentAmount ?? 0;
  const target = goal.targetAmount ?? 1;
  const progress = (saved / target) * 100;
  
  return (
    <View className="bg-[#0A0A0A] border border-white/5 p-6 rounded-[32px] mb-2">
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-1 mr-4">
          <Text className="font-black text-white text-lg tracking-tight">{goal.name}</Text>
          <Text className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 opacity-60">Status Tracking</Text>
        </View>
        <View className="bg-primary/20 px-3 py-1 rounded-full border border-primary/20">
          <Text className="text-[10px] font-black text-primary">{Math.round(progress)}%</Text>
        </View>
      </View>
      
      <View className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <View 
          style={{ width: `${Math.min(100, progress)}%` }}
          className="h-full bg-primary" 
        />
      </View>

      <View className="flex-row justify-between mt-4">
        <View>
           <Text className="text-[9px] font-black text-muted-foreground uppercase opacity-40 mb-0.5 tracking-widest">Saved</Text>
           <Text className="text-white font-black text-base">${saved.toLocaleString()}</Text>
        </View>
        <View className="items-end">
           <Text className="text-[9px] font-black text-muted-foreground uppercase opacity-40 mb-0.5 tracking-widest">Target</Text>
           <Text className="text-white/40 font-black text-base">${(goal.targetAmount ?? 0).toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
};

// Enhancement wrappers at the bottom to avoid TDZ (Temporal Dead Zone)
const GoalMonitoringItem = withObservables(['goal'], ({ goal }) => ({
  goal: goal.observe()
}))(GoalMonitoringItemBase);

const enhance = withObservables([], () => ({
  incomes: database.get('incomes').query().observe(),
  expenses: database.get('expenses').query().observe(),
  goals: database.get('goals').query().observe(),
}));

export default enhance(InsightsDashboardBase);
