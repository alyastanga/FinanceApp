import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import database from '../../database';

// UI Components
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BudgetChart } from '@/components/ui/BudgetChart';
import { BudgetComparison } from '@/components/ui/BudgetComparison';
import { AllocationCard } from '@/components/ui/AllocationCard';
import { TextInput } from 'react-native';

// Context & Services
import { useTheme } from '../../context/ThemeContext';
import { useAI } from '../../context/AIContext';
import { explainFinancialGraph, generateSuggestedBudget } from '@/lib/ai-service';
import { calculateBudgetInsights } from '@/lib/budget-engine';
import { upsertBudget, applyAIAllocation } from '@/lib/budget-actions';
import { useCurrency } from '../../context/CurrencyContext';

interface BudgetScreenProps {
  budgets: any[];
  expenses: any[];
  incomes: any[];
}

const BudgetScreenBase = ({ budgets, expenses, incomes }: BudgetScreenProps) => {
  const { isDark } = useTheme();
  const { format } = useCurrency();
  const { aiMode } = useAI();
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'velocity' | 'allocation'>('overview');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  
  // AI Allocation State
  const [aiSuggestions, setAiSuggestions] = useState<{category: string, amount_limit: number}[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Manual Add State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryLimit, setNewCategoryLimit] = useState('500');

  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  // 1. Data Processing Engine
  const { categoryData, totalAllocated, totalSpent, velocityData, monthlyIncomeValue } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    // Group expenses by category for current month
    const expenseMap = expenses.reduce((acc, exp) => {
      const t = exp.createdAt instanceof Date ? exp.createdAt.getTime() : Number(exp.createdAt);
      if (t >= monthStart) {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    // Map budgets to comparison data
    const comparisons = budgets.map(b => ({
      id: b.id,
      category: b.category,
      limit: b.amountLimit,
      spent: expenseMap[b.category] || 0
    })).sort((a, b) => b.limit - a.limit);

    const totalAlloc = budgets.reduce((acc, b) => acc + b.amountLimit, 0);
    const totalSpt = (Object.values(expenseMap) as number[]).reduce((acc, amt) => acc + amt, 0);

    const insights = calculateBudgetInsights(incomes, expenses, []); // temp goals check later
    const mIncome = insights.monthlyIncome;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = Math.max(now.getDate(), 1);
    const dailyLimit = totalAlloc / daysInMonth;
    const currentVelocity = totalSpt / currentDay;

    return {
      categoryData: comparisons,
      totalAllocated: totalAlloc,
      totalSpent: totalSpt,
      monthlyIncomeValue: mIncome,
      velocityData: {
        dailyLimit,
        currentVelocity,
        isSlower: currentVelocity < dailyLimit,
        variance: Math.abs(1 - (currentVelocity / dailyLimit)) * 100
      }
    };
  }, [budgets, expenses, incomes]);

  const remainingToAllocate = monthlyIncomeValue - totalAllocated;

  const handleExplain = async () => {
    if (isExplaining) return;
    setIsExplaining(true);
    try {
      const insightData = {
        totalAllocated,
        totalSpent,
        categories: categoryData,
        velocity: velocityData
      };
      const result = await explainFinancialGraph(insightData, "Budget Allocation & Spending Velocity", aiMode === 'local');
      setExplanation(result);
    } catch (err) {
      setExplanation("Failed to generate insight. Check your connection.");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setAiSuggestions(null);
    try {
      const suggestions = await generateSuggestedBudget();
      if (suggestions) {
        setAiSuggestions(suggestions);
      } else {
        Alert.alert("AI Error", "Could not generate a suggestion. Check your API key.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAI = async () => {
    if (!aiSuggestions) return;
    try {
      await applyAIAllocation(aiSuggestions);
      setAiSuggestions(null);
      Alert.alert("Success", "AI suggested budget applied successfully!");
    } catch (e) {
      Alert.alert("Error", "Failed to apply budget.");
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await upsertBudget(newCategoryName.trim(), Number(newCategoryLimit) || 0);
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (e) {
      Alert.alert("Error", "Could not add category.");
    }
  };

  const handleAdjustLimit = async (category: string, current: number, delta: number) => {
    const newVal = Math.max(0, current + delta);
    await upsertBudget(category, newVal);
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View className="pt-6 mb-8 flex-row justify-between items-end">
          <View>
            <Text className={`text-3xl font-black ${textClass} mb-1`}>Intelligence</Text>
            <Text className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
              Budget Analysis
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleExplain}
            className="h-12 w-12 rounded-2xl bg-primary/20 items-center justify-center border border-primary/20"
          >
            {isExplaining ? <ActivityIndicator size="small" color="#10b981" /> : <IconSymbol name="sparkles" size={20} color="#10b981" />}
          </TouchableOpacity>
        </View>

        {explanation && (
          <BlurView intensity={20} tint={isDark ? "dark" : "light"} className="mb-8 p-6 rounded-[32px] border border-primary/20 overflow-hidden">
             <View className="flex-row items-center gap-x-2 mb-2">
                <IconSymbol name="sparkles" size={12} color="#10b981" />
                <Text className="text-[10px] font-black text-primary uppercase tracking-widest">AI Intelligence</Text>
             </View>
             <Text className={`${isDark ? 'text-white/80' : 'text-black/80'} text-xs leading-5`}>{explanation}</Text>
          </BlurView>
        )}

        {/* Tab Switcher */}
        <View className={`${isDark ? 'bg-white/5' : 'bg-black/5'} p-1.5 rounded-[24px] flex-row mb-10`}>
          {(['overview', 'categories', 'velocity', 'allocation'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setExplanation(null);
                setActiveTab(tab);
              }}
              className={`flex-1 py-3 rounded-[18px] items-center ${activeTab === tab ? (isDark ? 'bg-white/10' : 'bg-white shadow-sm') : ''}`}
            >
              <Text className={`text-[10px] font-black uppercase tracking-widest ${activeTab === tab ? textClass : 'text-muted-foreground'}`}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content View */}
        {activeTab === 'overview' && (
          <View className="mb-10">
             <BudgetChart 
               data={categoryData.length > 0 ? categoryData.map((c, i) => ({
                 label: c.category,
                 value: c.limit,
                 color: ['#10b981', '#3b82f6', '#f59e0b', '#064e3b', '#1f2937'][i % 5]
               })) : [
                 { label: 'Unallocated', value: 1, color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
               ]} 
               size={240}
               title="Current Allocation"
               isDark={isDark}
             />
             
             <View className="flex-row gap-x-4 mt-8">
               <View className={`flex-1 p-5 rounded-[32px] border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                 <Text className={`${subTextClass} text-[8px] font-black uppercase tracking-widest mb-1`}>Total Budget</Text>
                 <Text className={`${textClass} text-xl font-black`}>{format(totalAllocated)}</Text>
               </View>
               <View className={`flex-1 p-5 rounded-[32px] border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                 <Text className={`${subTextClass} text-[8px] font-black uppercase tracking-widest mb-1`}>Total Spent</Text>
                 <Text className={`${textClass} text-xl font-black`}>{format(totalSpent)}</Text>
               </View>
             </View>
          </View>
        )}

        {activeTab === 'categories' && (
          <View className="gap-y-4 mb-10">
            {categoryData.length === 0 ? (
              <View className="py-20 items-center justify-center border border-dashed border-white/10 rounded-[32px]">
                <Text className="text-muted-foreground italic text-xs">No categories defined yet.</Text>
              </View>
            ) : (
              categoryData.map((item, index) => (
                <BudgetComparison 
                  key={index}
                  category={item.category}
                  budgetLimit={item.limit}
                  actualSpent={item.spent}
                  isDark={isDark}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'velocity' && (
          <View className="gap-y-6 mb-10">
            <View className={`p-8 rounded-[40px] border ${isDark ? 'bg-primary/5 border-primary/20' : 'bg-primary/10 border-primary/30'} items-center`}>
              <View className="h-16 w-16 bg-primary/20 rounded-full items-center justify-center mb-4">
                <IconSymbol name="bolt.fill" size={32} color="#10b981" />
              </View>
              <Text className={`${textClass} text-2xl font-black mb-1`}>
                {velocityData.variance.toFixed(1)}% {velocityData.isSlower ? 'Slower' : 'Faster'}
              </Text>
              <Text className="text-muted-foreground text-xs uppercase tracking-widest font-black">
                Spending Velocity
              </Text>
            </View>

            <View className="gap-y-4">
              <View className={`p-6 rounded-[32px] border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'} flex-row justify-between items-center`}>
                <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest`}>Daily Limit</Text>
                <Text className={`${textClass} font-black`}>{format(velocityData.dailyLimit)}</Text>
              </View>
              <View className={`p-6 rounded-[32px] border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'} flex-row justify-between items-center`}>
                <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest`}>Actual Daily Speed</Text>
                <Text className={`${velocityData.isSlower ? 'text-primary' : 'text-destructive'} font-black`}>
                  {format(velocityData.currentVelocity)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'allocation' && (
          <View className="gap-y-10 mb-10">
            {/* AI Generator Section */}
            <View className="gap-y-6">
              <Text className={`${textClass} text-xs font-black uppercase tracking-[3px] opacity-50 px-2`}>AI Allocation Engine</Text>
              <LinearGradient
                colors={isDark ? ['#10b98120', 'transparent'] : ['#10b98110', 'transparent']}
                className={`p-8 rounded-[44px] border ${isDark ? 'border-primary/20' : 'border-primary/10'} overflow-hidden items-center`}
              >
                {!aiSuggestions ? (
                  <>
                    <View className="h-16 w-16 bg-primary/20 rounded-full items-center justify-center mb-4">
                      <IconSymbol name="sparkles" size={32} color="#10b981" />
                    </View>
                    <Text className={`${textClass} text-lg font-black mb-2 text-center`}>Generate AI Budget</Text>
                    <Text className="text-muted-foreground text-xs text-center mb-6 px-4">
                      Let AI analyze your active goals and monthly income to suggest a balanced allocation.
                    </Text>
                    <TouchableOpacity 
                      onPress={handleGenerateAI}
                      className="bg-primary px-10 py-4 rounded-[20px] shadow-lg shadow-primary/20"
                    >
                      {isGenerating ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-sm uppercase tracking-widest">Generate Plan</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <View className="w-full">
                    <View className="flex-row justify-between items-center mb-6">
                      <Text className={`${textClass} font-black text-lg`}>AI Suggestion</Text>
                      <TouchableOpacity onPress={() => setAiSuggestions(null)}>
                        <Text className="text-destructive text-xs font-black uppercase">Cancel</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View className="gap-y-3 mb-8">
                      {aiSuggestions.map((s, idx) => (
                        <View key={idx} className={`flex-row justify-between p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                        <Text className={`${textClass} font-bold`}>{s.category}</Text>
                        <Text className="text-primary font-black">{format(s.amount_limit)}</Text>
                      </View>
                      ))}
                    </View>

                    <TouchableOpacity 
                      onPress={handleApplyAI}
                      className="bg-primary w-full py-4 rounded-[20px] items-center"
                    >
                      <Text className="text-white font-black text-sm uppercase tracking-widest">Apply All Allocation</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Manual List Section */}
            <View className="gap-y-6">
              <View className="flex-row justify-between items-center px-2">
                <Text className={`${textClass} text-xs font-black uppercase tracking-[3px] opacity-50`}>Manual Fine-Tuning</Text>
                <View className="flex-row items-center gap-x-2">
                  <View className="px-3 py-1 bg-primary/20 rounded-full">
                    <Text className="text-primary text-[10px] font-black uppercase">Surplus: {format(remainingToAllocate)}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setIsAddingCategory(!isAddingCategory)}
                    className="h-8 w-8 rounded-full bg-primary items-center justify-center"
                  >
                    <IconSymbol name={isAddingCategory ? "xmark" : "plus"} size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View>
                {isAddingCategory && (
                  <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`p-6 rounded-[32px] border border-primary/30 mb-6 overflow-hidden`}>
                    <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest mb-4`}>New Budget Category</Text>
                    <TextInput
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                      placeholder="Category Name (e.g. Travel)"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                      className={`text-lg font-black ${textClass} mb-4 p-2`}
                    />
                    <View className="flex-row items-center gap-x-4 mb-6">
                      <View className="flex-1">
                        <Text className={`${subTextClass} text-[9px] font-black uppercase mb-1`}>Initial Limit</Text>
                        <TextInput
                          value={newCategoryLimit}
                          onChangeText={setNewCategoryLimit}
                          keyboardType="numeric"
                          className={`text-lg font-black ${textClass} p-2 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}
                        />
                      </View>
                      <TouchableOpacity 
                        onPress={handleAddNewCategory}
                        className="bg-primary h-14 px-8 rounded-2xl items-center justify-center self-end"
                      >
                        <Text className="text-white font-black text-xs uppercase tracking-widest">Add</Text>
                      </TouchableOpacity>
                    </View>
                  </BlurView>
                )}

                {categoryData.length === 0 ? (
                  <View className="py-12 items-center justify-center border border-dashed border-white/10 rounded-[32px]">
                    <Text className="text-muted-foreground italic text-xs">No categories to adjust.</Text>
                  </View>
                ) : (
                  categoryData.map((item, index) => (
                    <AllocationCard 
                      key={index}
                      category={item.category}
                      limit={item.limit}
                      isDark={isDark}
                      onIncrease={() => handleAdjustLimit(item.category, item.limit, 100)}
                      onDecrease={() => handleAdjustLimit(item.category, item.limit, -100)}
                    />
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {/* Tactical Insights List */}
        <View className="gap-y-4 mb-4">
           <View className={`${isDark ? 'bg-white/5' : 'bg-white'} p-6 rounded-[32px] border ${isDark ? 'border-white/5' : 'border-black/5'} flex-row items-center gap-x-4 shadow-sm shadow-black/5`}>
              <View className="h-10 w-10 bg-primary/20 rounded-2xl items-center justify-center">
                 <IconSymbol name="bolt.fill" size={20} color="#10b981" />
              </View>
              <View className="flex-1">
                 <Text className={`${textClass} font-bold text-sm mb-0.5`}>Budget Velocity</Text>
                 <Text className="text-muted-foreground text-[11px]">
                   You are spending {format(Math.abs(velocityData.dailyLimit - velocityData.currentVelocity))} {velocityData.isSlower ? 'under' : 'over'} your daily theoretical limit.
                 </Text>
              </View>
           </View>

           <View className={`${isDark ? 'bg-white/5' : 'bg-white'} p-6 rounded-[32px] border ${isDark ? 'border-white/5' : 'border-black/5'} flex-row items-center gap-x-4 shadow-sm shadow-black/5`}>
              <View className="h-10 w-10 bg-accent/20 rounded-2xl items-center justify-center">
                 <IconSymbol name="target" size={20} color="#3b82f6" />
              </View>
              <View className="flex-1">
                 <Text className={`${textClass} font-bold text-sm mb-0.5`}>Category Alignment</Text>
                 <Text className="text-muted-foreground text-[11px]">
                   {categoryData.filter(c => c.spent <= c.limit).length} of {categoryData.length} categories are within budget.
                 </Text>
              </View>
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const enhance = withObservables([], () => ({
  budgets: database.get('budgets').query().observe(),
  expenses: database.get('expenses').query().observe(),
  incomes: database.get('incomes').query().observe(),
}));

export default enhance(BudgetScreenBase);
