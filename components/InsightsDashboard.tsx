import React from 'react';
import { View, Text, Platform } from 'react-native';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import { LinearGradient } from 'expo-linear-gradient';
import database from '../database';
import { BudgetChart } from './ui/BudgetChart';

interface InsightsDashboardProps {
  incomes: any[];
  expenses: any[];
  goals: any[];
}

const InsightsDashboard = ({ incomes, expenses, goals }: InsightsDashboardProps) => {
  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netFlow = totalIncome - totalExpenses;

  // Group expenses by category for the chart
  const categoryMap = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  // Predefined color palette for categories
  const COLORS = ['#10b981', '#059669', '#34d399', '#064e3b', '#1f2937'];
  const chartData = Object.entries(categoryMap)
    .map(([label, value], index) => ({
      label,
      value: value as number,
      color: COLORS[index % COLORS.length]
    }))
    .sort((a, b) => (b.value as number) - (a.value as number));

  return (
    <View className="gap-y-6">
      {/* 1. Net Flow Summary Card */}
      <View className="overflow-hidden rounded-[32px] bg-[#0A0A0A] border border-white/5">
        <LinearGradient
          colors={['#10b98115', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-6"
        >
          <View className="mb-6">
            <Text className="text-[10px] font-black uppercase tracking-[3px] text-primary/60 mb-1">
              Monthly Pulse
            </Text>
            <View className="flex-row items-baseline gap-x-2">
              <Text className="text-4xl font-black tracking-tighter text-white">
                ${(netFlow ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </Text>
              <Text className="text-xs font-bold text-muted-foreground uppercase opacity-40">Net Flow</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-x-4">
             <View className="flex-1 rounded-2xl bg-white/5 p-4 border border-white/5">
                <Text className="text-[9px] font-black uppercase text-muted-foreground mb-1">Incoming</Text>
                <Text className="text-lg font-bold text-primary">+${(totalIncome ?? 0).toLocaleString()}</Text>
             </View>
             <View className="flex-1 rounded-2xl bg-white/5 p-4 border border-white/5">
                <Text className="text-[9px] font-black uppercase text-muted-foreground mb-1">Outgoing</Text>
                <Text className="text-lg font-bold text-destructive">-${(totalExpenses ?? 0).toLocaleString()}</Text>
             </View>
          </View>
        </LinearGradient>
      </View>

      {/* 2. Categorical Spending Breakdown (Skia) */}
      <View className="rounded-[32px] bg-card/40 border border-white/5 p-6">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-lg font-bold text-white">Spending Mix</Text>
            <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">By Category</Text>
          </View>
          <View className="bg-primary/10 px-3 py-1 rounded-full">
             <Text className="text-[10px] font-bold text-primary">{chartData.length} Categories</Text>
          </View>
        </View>

        <View className="items-center py-4">
          {chartData.length > 0 ? (
            <BudgetChart data={chartData} size={200} />
          ) : (
            <View className="h-[200px] w-full items-center justify-center bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
               <Text className="text-muted-foreground text-xs italic">No data to monitor yet.</Text>
            </View>
          )}
        </View>

        {/* Legend */}
        <View className="mt-4 flex-row flex-wrap gap-2">
          {chartData.slice(0, 3).map((item, idx) => (
            <View key={idx} className="flex-row items-center gap-x-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
              <View style={{ backgroundColor: item.color }} className="h-2 w-2 rounded-full" />
              <Text className="text-[10px] font-bold text-white/70">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 3. Goal Progress Monitoring */}
      <View className="gap-y-4">
        <Text className="text-sm font-black uppercase tracking-[3px] text-muted-foreground ml-2">Goal Monitoring</Text>
        {goals.map((goal, idx) => {
          const saved = goal.saved_amount ?? 0;
          const target = goal.target_amount ?? 1; // Avoid div by zero
          const progress = (saved / target) * 100;
          
          return (
            <View key={idx} className="bg-card/40 border border-white/5 p-5 rounded-[28px]">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="font-bold text-white text-base">{goal.title}</Text>
                <Text className="text-xs font-black text-primary">{Math.round(progress)}%</Text>
              </View>
              
              <View className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <View 
                  style={{ width: `${Math.min(100, progress)}%` }}
                  className="h-full bg-primary" 
                />
              </View>

              <View className="flex-row justify-between mt-3">
                <View>
                   <Text className="text-[9px] font-black text-muted-foreground uppercase">Saved</Text>
                   <Text className="text-white font-bold">${saved.toLocaleString()}</Text>
                </View>
                <View className="items-end">
                   <Text className="text-[9px] font-black text-muted-foreground uppercase">Target</Text>
                   <Text className="text-white/40 font-bold">${(goal.target_amount ?? 0).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          );
        })}
        {goals.length === 0 && (
          <View className="p-10 items-center justify-center bg-white/[0.02] rounded-[32px] border border-dashed border-white/10">
             <Text className="text-muted-foreground text-xs italic">Set a goal to start monitoring.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const enhance = withObservables([], () => ({
  incomes: database.get('incomes').query().observe(),
  expenses: database.get('expenses').query().observe(),
  goals: database.get('goals').query().observe(),
}));

export default enhance(InsightsDashboard);
