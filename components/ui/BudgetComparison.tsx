import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Canvas, RoundedRect, Rect } from '@shopify/react-native-skia';

interface BudgetComparisonProps {
  category: string;
  budgetLimit: number;
  actualSpent: number;
  isDark?: boolean;
  onEdit?: () => void;
}

export const BudgetComparison: React.FC<BudgetComparisonProps> = ({
  category,
  budgetLimit,
  actualSpent,
  isDark = true,
  onEdit,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const barWidth = screenWidth - 80; // Account for padding
  const barHeight = 10;

  const percentage = budgetLimit > 0 ? (actualSpent / budgetLimit) : 0;
  const fillWidth = Math.min(barWidth, barWidth * percentage);
  const isOver = actualSpent > budgetLimit;
  const remaining = Math.max(0, budgetLimit - actualSpent);

  // Dynamic color based on percentage
  const getBarColor = () => {
    if (percentage >= 1) return '#ef4444';    // Red — over budget
    if (percentage >= 0.75) return '#f59e0b';  // Amber — warning
    return '#10b981';                          // Green — healthy
  };

  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <View className={`${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]'} rounded-[28px] border ${isDark ? 'border-white/5' : 'border-black/5'} p-5`}>
      <View className="flex-row justify-between items-center mb-3">
        <Text className={`${textClass} font-bold text-sm`}>{category}</Text>
        <Text className={`text-[10px] font-black uppercase ${isOver ? 'text-destructive' : 'text-primary'}`}>
          {Math.round(percentage * 100)}%
        </Text>
      </View>

      {/* Skia Progress Bar */}
      <View style={{ width: barWidth, height: barHeight }} className="mb-4">
        <Canvas style={{ width: barWidth, height: barHeight }}>
          {/* Background */}
          <RoundedRect
            x={0} y={0}
            width={barWidth} height={barHeight}
            r={barHeight / 2}
            color={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
          />
          {/* Fill */}
          <RoundedRect
            x={0} y={0}
            width={Math.max(fillWidth, barHeight)}
            height={barHeight}
            r={barHeight / 2}
            color={getBarColor()}
          />
        </Canvas>
      </View>

      {/* Financial Details Row */}
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-[9px] font-black text-muted-foreground uppercase">Spent</Text>
          <Text className={`${textClass} font-bold text-sm`}>${actualSpent.toLocaleString()}</Text>
        </View>
        <View className="items-center">
          <Text className="text-[9px] font-black text-muted-foreground uppercase">Limit</Text>
          <Text className={`${subTextClass} font-bold text-sm`}>${(budgetLimit || 0).toLocaleString()}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[9px] font-black text-muted-foreground uppercase">
            {isOver ? 'Over By' : 'Remaining'}
          </Text>
          <Text className={`font-bold text-sm ${isOver ? 'text-destructive' : 'text-primary'}`}>
            ${isOver ? (actualSpent - budgetLimit).toLocaleString() : remaining.toLocaleString()}
          </Text>
        </View>
      </View>

      {isOver && (
        <View className="mt-3 bg-destructive/10 px-4 py-2 rounded-xl border border-destructive/20">
          <Text className="text-[9px] text-destructive font-black uppercase tracking-widest text-center">
            ⚠ Budget Exceeded
          </Text>
        </View>
      )}
    </View>
  );
};
