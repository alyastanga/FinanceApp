import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  interpolateColor
} from 'react-native-reanimated';
import { IconSymbol } from './icon-symbol';
import { useCurrency } from '../../context/CurrencyContext';

interface SafeToSpendViewProps {
  amount: number;
  totalMonthlyIncome: number;
  isDark?: boolean;
}

export default function SafeToSpendView({ amount, totalMonthlyIncome, isDark = true }: SafeToSpendViewProps) {
  const { format } = useCurrency();
  const pulse = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000 });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
      opacity: opacity.value,
    };
  });

  // Calculate health color (Green -> Yellow -> Red)
  const isHealthy = amount > 50; 
  const isRunningLow = amount > 0 && amount <= 50;
  const isOverspent = amount <= 0;

  const statusColor = isOverspent ? '#ef4444' : isRunningLow ? '#f59e0b' : '#10b981';
  const textClass = isDark ? 'text-white' : 'text-black';

  return (
    <Animated.View 
      style={[styles.container, animatedStyle]}
      className={`${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]'} rounded-[48px] p-8 overflow-hidden items-center justify-center h-80`}
    >
      {/* Background Decor */}
      <View 
        style={{ borderColor: statusColor + '20' }}
        className="absolute inset-0 border-[40px] rounded-full opacity-10 scale-[1.5]" 
      />
      
      <View className="items-center z-10">
        <View 
          style={{ backgroundColor: statusColor + '20' }}
          className="h-12 w-12 rounded-2xl items-center justify-center mb-6"
        >
          <IconSymbol name="bolt.fill" size={24} color={statusColor} />
        </View>

        <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[10px] font-black uppercase tracking-[4px] mb-4 text-center`}>
          Safe to Spend Today
        </Text>

        <View className="flex-row items-start">
          <Text 
            style={{ color: statusColor }}
            className="text-7xl font-black tracking-tighter"
          >
            {format(amount)}
          </Text>
        </View>

        <View className={`mt-8 px-6 py-2 ${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-full border ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <Text className={`${isDark ? 'text-white/60' : 'text-black/60'} text-[10px] font-bold uppercase tracking-wider`}>
            {isOverspent ? 'Budget Exhausted' : isRunningLow ? 'Caution: Slow Down' : 'Spending Power: High'}
          </Text>
        </View>
      </View>

      {/* Progress Arc (Simulated for v1) */}
      <View 
        style={{ 
          position: 'absolute', 
          bottom: -120, 
          width: 400, 
          height: 400, 
          borderRadius: 200, 
          borderWidth: 2, 
          borderColor: statusColor + '10',
          borderStyle: 'dashed'
        }} 
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 20,
  }
});
