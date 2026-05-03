import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';
import { IconSymbol } from './icon-symbol';

interface GoalProgressCardProps {
  goal: any;
  isDark?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  compact?: boolean;
  noContainer?: boolean;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  goal,
  isDark: isDarkProp,
  onPress,
  children,
  compact = false,
  noContainer = false
}) => {
  const { isDark: themeIsDark } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : themeIsDark;
  const { symbol, formatValue } = useCurrency();
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  const targetDateStr = useMemo(() => {
    if (!goal.targetCompletionDate) return 'No target date';
    const d = new Date(goal.targetCompletionDate);
    return d.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [goal.targetCompletionDate]);

  const paddingClass = compact ? 'p-6' : 'p-8';
  const titleSizeClass = compact ? 'text-lg' : 'text-xl';
  const progressSizeClass = compact ? 'text-xl' : 'text-2xl';

  return (
    <View className={noContainer ? '' : `${paddingClass} rounded-[40px] border ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.01] border-black/5'} mb-4`}>
      <View className={`flex-row justify-between items-start ${compact ? 'mb-4' : 'mb-6'}`}>
        <View className="flex-1 mr-4">
          <Text className={`${textClass} font-black ${titleSizeClass} tracking-tighter mb-1`} numberOfLines={1}>{goal.name}</Text>
          <View className="flex-row items-center">
            <IconSymbol name="bolt.fill" size={compact ? 8 : 10} color="#10b981" />
            <Text className="text-emerald-500 text-[9px] font-black uppercase tracking-[2px] ml-2">
              {progress >= 100 ? 'Achieved' : 'Accelerating'}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`text-primary font-black ${progressSizeClass} tracking-tighter`}>{Math.round(progress)}%</Text>
          <Text className={`${subTextClass} text-[8px] font-black uppercase tracking-widest`}>completion</Text>
        </View>
      </View>

      <View className={compact ? 'mb-4' : 'mb-6'}>
        <View className={`h-2.5 w-full ${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-full overflow-hidden`}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: `${progress}%`, height: '100%' }}
            className="rounded-full shadow-lg shadow-emerald-500/50"
          />
        </View>
        {!compact && (
          <View
            className="h-[2px] bg-emerald-500/20 blur-md rounded-full mt-[-2px]"
            style={{ width: `${progress}%`, marginLeft: '0.5%' }}
          />
        )}
      </View>

      {!compact && (
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className={`${subTextClass} text-[8px] font-black uppercase tracking-[2px] mb-1`}>Financial Target</Text>
            <View className="flex-row items-baseline">
              <Text className={`${textClass} font-black text-[10px] opacity-20 mr-0.5`}>{symbol}</Text>
              <Text className={`${textClass} font-black text-sm`}>{formatValue(goal.currentAmount)}</Text>
              <Text className={`${isDark ? "text-white/20" : "text-black/20"} font-black text-xs mx-1`}>/</Text>
              <Text className={`${isDark ? "text-white/20" : "text-black/20"} font-black text-[9px] mr-0.5`}>{symbol}</Text>
              <Text className={`${isDark ? "text-white/20" : "text-black/20"} font-black text-xs`}>{formatValue(goal.targetAmount)}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className={`${subTextClass} text-[8px] font-black uppercase tracking-[2px] mb-1 text-right`}>Target Date</Text>
            <View className="flex-row items-center">
              <Text className={`${textClass} font-bold text-xs mr-2`}>{targetDateStr}</Text>
              <IconSymbol name="target" size={12} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
            </View>
          </View>
        </View>
      )}

      {children}
    </View>
  );
};
