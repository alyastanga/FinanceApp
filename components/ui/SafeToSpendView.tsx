import {
  Canvas,
  Path,
  Shadow,
  Skia,
  vec
} from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { Dimensions, Text, View } from 'react-native';
import {
  useDerivedValue,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useCurrency } from '../../context/CurrencyContext';
import { IconSymbol } from './icon-symbol';
import { useTheme } from '../../context/ThemeContext';

interface SafeToSpendViewProps {
  amount: number;
  totalMonthlyIncome: number;
  spentToday?: number;
  isDark?: boolean;
}

export default function SafeToSpendView({ amount, totalMonthlyIncome, spentToday = 0, isDark: isDarkProp }: SafeToSpendViewProps) {
  const { isDark: themeIsDark } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : themeIsDark;
  const { format } = useCurrency();
  const width = Dimensions.get('window').width - 64;
  const size = width * 0.85;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const canvasPadding = 32; // Increased padding for shadow and arc stroke
  const center = vec(size / 2, size / 2);

  // Animated progress (0 to 1)
  const progress = useSharedValue(0);

  // Calculate SAFETY percentage (how much is LEFT)
  const dailyAllowance = amount + spentToday;
  const percentage = dailyAllowance > 0 
    ? Math.min(1, Math.max(0, amount / dailyAllowance)) 
    : (amount > 0 ? 1 : 0);

  useEffect(() => {
    // Ensure the animation actually runs by checking the percentage
    progress.value = withTiming(percentage, { duration: 1500 });
  }, [percentage]);

  // Safety color logic
  const getStatusColor = (p: number) => {
    if (p < 0.1) return '#ef4444'; // Red (Almost out of money)
    if (p < 0.3) return '#f59e0b'; // Amber (Getting low)
    return '#10b981'; // Green (Safe)
  };

  const statusColor = getStatusColor(percentage);

  // Background arc path (Semi-circle at the top)
  const backgroundPath = useMemo(() => {
    const p = Skia.Path.Make();
    const rect = Skia.XYWHRect(
      strokeWidth / 2, 
      strokeWidth / 2 + canvasPadding, 
      size - strokeWidth, 
      size - strokeWidth
    );
    p.addArc(rect, 180, 180);
    return p;
  }, [size, canvasPadding]);

  // Active progress path
  const progressPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    // Path goes from 180 to 180 + (180 * progress)
    const sweep = Math.min(180, Math.max(0.1, progress.value * 180));
    const rect = Skia.XYWHRect(
      strokeWidth / 2, 
      strokeWidth / 2 + canvasPadding, 
      size - strokeWidth, 
      size - strokeWidth
    );
    p.addArc(rect, 180, sweep);
    return p;
  });

  return (
    <View className="items-center justify-center py-8">
      <View style={{ width: size, height: (size / 2) + canvasPadding + 40 }} className="items-center justify-center relative">
        {totalMonthlyIncome > 0 ? (
          <Canvas style={{ width: size, height: (size / 2) + canvasPadding + 40 }} className="absolute z-0">
            {/* Background Track */}
            <Path
              path={backgroundPath}
              color={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeCap="round"
            />

            {/* Active Progress */}
            <Path
              path={progressPath}
              color={statusColor}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeCap="round"
            >
              <Shadow dx={0} dy={0} blur={15} color={statusColor + '60'} />
            </Path>
          </Canvas>
        ) : (
          <View 
            style={{ 
              width: size - strokeWidth, 
              height: (size / 2) - strokeWidth / 2, 
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              borderBottomWidth: 0,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }} 
          />
        )}

        {/* Center Content */}
        <View className="absolute top-[30%] items-center justify-center w-full">
          <View
            style={{ backgroundColor: statusColor + '15' }}
            className="h-10 w-10 rounded-2xl items-center justify-center mb-4"
          >
            <IconSymbol name="bolt.fill" size={20} color={statusColor} />
          </View>

          <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[9px] font-black uppercase tracking-[4px] mb-1.5 text-center`}>
            Safe to Spend Today
          </Text>

          <Text
            style={{ color: isDark ? '#fff' : '#000' }}
            className="text-5xl font-black tracking-tighter"
          >
            {format(amount)}
          </Text>

          <View className={`mt-6 px-4 py-1.5 ${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-full border ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <Text className={`${isDark ? 'text-white/60' : 'text-black/60'} text-[8px] font-black uppercase tracking-widest`}>
              {percentage < 0.1 ? 'Budget Exhausted' : percentage < 0.3 ? 'Caution: Slow Down' : 'Spending Power: High'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

