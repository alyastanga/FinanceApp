import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import database from '../../database';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BudgetComparison } from '@/components/ui/BudgetComparison';
import { BudgetChart } from '@/components/ui/BudgetChart';
import { BudgetForm } from '@/components/BudgetForm';
import { generateSuggestedBudget } from '@/lib/ai-service';

interface BudgetScreenProps {
  budgets: any[];
  expenses: any[];
  incomes: any[];
  goals: any[];
}

const BudgetScreen = ({ budgets, expenses, incomes, goals }: BudgetScreenProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<any>(null);

  // Aggregate expenses by category
  const expenseMap = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  // Totals
  const totalBudget = budgets.reduce((acc, b) => acc + (b.amountLimit || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (expenseMap[b.category] || 0), 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const globalPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Pie chart data
  const COLORS = ['#10b981', '#059669', '#34d399', '#064e3b', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const pieData = budgets.map((b, i) => ({
    label: b.category,
    value: b.amountLimit,
    color: COLORS[i % COLORS.length],
  }));

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const suggested = await generateSuggestedBudget();
      if (suggested && Array.isArray(suggested)) {
        Alert.alert(
          'AI Budget Recommendation',
          `Generated ${suggested.length} budget categories based on your income & goals. Apply them?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Apply All',
              onPress: async () => {
                await database.write(async () => {
                  const allBudgets = await database.get('budgets').query().fetch();
                  await Promise.all(allBudgets.map(b => b.markAsDeleted()));

                  for (const item of suggested) {
                    await database.get('budgets').create((b: any) => {
                      b.category = item.category;
                      b.amountLimit = item.amount_limit;
                    });
                  }
                });
                Alert.alert('Applied', 'Your AI-generated budget is now active.');
              },
            },
          ]
        );
      } else {
        Alert.alert('AI Error', 'Could not generate a budget. Check your API key in .env.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteBudget = (budget: any) => {
    Alert.alert(
      'Delete Budget',
      `Remove the "${budget.category}" budget category?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await database.write(async () => {
              await budget.markAsDeleted();
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={['top']}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="pt-6 mb-8 flex-row justify-between items-end">
          <View>
            <Text className="text-3xl font-black text-white mb-2">Budgeting</Text>
            <Text className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
              Target vs. Actual
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { setEditBudget(null); setShowForm(true); }}
            className="bg-primary px-4 py-2 rounded-full"
          >
            <Text className="text-[10px] font-black text-primary-foreground uppercase tracking-widest">+ Budget</Text>
          </TouchableOpacity>
        </View>

        {/* Global Target vs Actual Summary */}
        {budgets.length > 0 && (
          <View className="overflow-hidden rounded-[40px] bg-[#0A0A0A] border border-white/5 mb-8">
            <LinearGradient
              colors={globalPercentage > 100 ? ['#ef444425', 'transparent'] : ['#10b98115', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="p-6"
            >
              <Text className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground mb-1">
                Budget Health
              </Text>
              <View className="flex-row items-baseline gap-x-2 mb-6">
                <Text className={`text-5xl font-black tracking-tighter ${globalPercentage > 100 ? 'text-destructive' : 'text-white'}`}>
                  {globalPercentage}%
                </Text>
                <Text className="text-xs font-bold text-muted-foreground uppercase opacity-40">Used</Text>
              </View>

              <View className="flex-row items-center gap-x-4">
                <View className="flex-1 rounded-3xl bg-white/5 p-4 border border-white/5">
                  <Text className="text-[9px] font-black uppercase text-muted-foreground mb-1">Total Budget</Text>
                  <Text className="text-lg font-bold text-white">${totalBudget.toLocaleString()}</Text>
                </View>
                <View className="flex-1 rounded-3xl bg-white/5 p-4 border border-white/5">
                  <Text className="text-[9px] font-black uppercase text-muted-foreground mb-1">Spent</Text>
                  <Text className="text-lg font-bold text-destructive">${totalSpent.toLocaleString()}</Text>
                </View>
                <View className="flex-1 rounded-3xl bg-white/5 p-4 border border-white/5">
                  <Text className="text-[9px] font-black uppercase text-muted-foreground mb-1">Left</Text>
                  <Text className="text-lg font-bold text-primary">${totalRemaining.toLocaleString()}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Budget Allocation Pie Chart */}
        {pieData.length > 0 && (
          <View className="rounded-[40px] bg-card/40 border border-white/5 p-8 mb-8">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-lg font-black text-white">Allocation</Text>
                <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">By Category</Text>
              </View>
              <View className="bg-primary/10 px-3 py-1 rounded-full">
                <Text className="text-[10px] font-black text-primary">{pieData.length} Categories</Text>
              </View>
            </View>
            <BudgetChart data={pieData} size={200} />
          </View>
        )}

        {/* Action Buttons: Create & AI Generate */}
        <View className="flex-row gap-x-3 mb-8">
          <TouchableOpacity
            onPress={() => { setEditBudget(null); setShowForm(true); }}
            className="flex-1 overflow-hidden rounded-3xl"
          >
            <LinearGradient
              colors={['#ffffff10', '#ffffff05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="px-5 pt-5 pb-6 flex-row items-center gap-x-3 border border-white/5 rounded-3xl"
            >
              <View className="bg-white/10 p-2.5 rounded-xl">
                <IconSymbol name="plus" size={18} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Create Manual</Text>
                <Text className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Your own limits</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAIGenerate}
            disabled={isGenerating}
            className="flex-1 overflow-hidden rounded-3xl"
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="px-5 pt-5 pb-6 flex-row items-center gap-x-3 rounded-3xl"
            >
              <View className="bg-white/20 p-2.5 rounded-xl">
                {isGenerating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <IconSymbol name="sparkles" size={18} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">
                  {isGenerating ? 'Generating...' : 'Generate Budget'}
                </Text>
                <Text className="text-white/70 text-[9px] font-black uppercase tracking-widest">AI Powered</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Budget Categories List */}
        <View className="gap-y-4 mb-20">
          <Text className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-2 mb-2">
            Category Breakdown
          </Text>
          {budgets.length > 0 ? (
            budgets.map((budget) => (
              <TouchableOpacity
                key={budget.id}
                onPress={() => { setEditBudget(budget); setShowForm(true); }}
                onLongPress={() => handleDeleteBudget(budget)}
                activeOpacity={0.8}
              >
                <BudgetComparison
                  category={budget.category}
                  budgetLimit={budget.amountLimit}
                  actualSpent={expenseMap[budget.category] || 0}
                />
              </TouchableOpacity>
            ))
          ) : (
            <View className="p-12 items-center justify-center bg-white/[0.02] rounded-[40px] border border-dashed border-white/10">
              <Text className="text-primary font-black text-[12px] uppercase tracking-widest mb-2">No Budget Set</Text>
              <Text className="text-muted-foreground text-xs text-center px-6">
                Tap "Create Manual" or "Generate Budget" to get started.
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Budget Creation/Edit Modal */}
      <BudgetForm
        visible={showForm}
        onClose={() => { setShowForm(false); setEditBudget(null); }}
        editBudget={editBudget}
      />
    </SafeAreaView>
  );
};

const enhance = withObservables([], () => ({
  budgets: database.get('budgets').query().observe(),
  expenses: database.get('expenses').query().observe(),
  incomes: database.get('incomes').query().observe(),
  goals: database.get('goals').query().observe(),
}));

export default enhance(BudgetScreen);
