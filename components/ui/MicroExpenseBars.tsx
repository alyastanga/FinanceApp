import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

interface ExpenseBarData {
  label: string;
  value: number;
  max: number;
  amountFormatted: string;
  color: string;
}

interface MicroExpenseBarsProps {
  data: ExpenseBarData[];
  isDark?: boolean;
}

export const MicroExpenseBars = ({ data, isDark = true }: MicroExpenseBarsProps) => {
  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <View className="flex-1 w-full justify-center space-y-2">
      {data.map((item, index) => {
        const percentage = item.max > 0 ? Math.min(100, (item.value / item.max) * 100) : 0;
        
        return (
          <View key={`${item.label}-${index}`} className="w-full mb-2">
            <View className="flex-row justify-between items-end mb-1 px-0.5">
              <Text className={`${textClass} font-black text-[10px] tracking-wide uppercase`} numberOfLines={1}>
                {item.label}
              </Text>
              <Text className={`${subTextClass} font-bold text-[9px]`}>
                {item.amountFormatted}
              </Text>
            </View>
            <View className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/5'} border ${isDark ? 'border-white/5' : 'border-black/5'}`}>
              <AnimatedBar percentage={percentage} color={item.color} />
            </View>
          </View>
        );
      })}
      {data.length === 0 && (
         <View className="flex-1 items-center justify-center">
            <Text className={`${subTextClass} text-[10px] uppercase font-black tracking-widest`}>No recent expenses</Text>
         </View>
      )}
    </View>
  );
};

const AnimatedBar = ({ percentage, color }: { percentage: number, color: string }) => {
  const widthVal = useSharedValue(0);

  useEffect(() => {
    widthVal.value = withTiming(percentage, {
      duration: 1000,
      easing: Easing.out(Easing.cubic)
    });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${widthVal.value}%`
    };
  });

  return (
    <Animated.View
      style={[{ height: '100%', backgroundColor: color }, animatedStyle]}
      className="rounded-full"
    />
  );
};
