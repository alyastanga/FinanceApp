import React, { useState, memo } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Skia } from '@shopify/react-native-skia';

interface SavingsRateViewProps {
  currentRate: number;
  trendData: { label: string; rate: number }[];
}

/**
 * SavingsRateView component featuring a dual-mode visualization.
 * Wrapped in memo to prevent unnecessary re-renders that might
 * trigger context-sensitive hooks in children/polyfilled components.
 */
export const SavingsRateView = memo(({ currentRate, trendData }: SavingsRateViewProps) => {
  const [viewMode, setViewMode] = useState<'month' | 'trend'>('month');
  const size = Dimensions.get('window').width - 80;
  const chartHeight = 120;

  // Monthly Gauge View
  const renderGauge = () => {
    const isPositive = currentRate >= 0;
    return (
      <View className="items-center py-4">
        <View className="relative items-center justify-center h-32 w-32 rounded-full border-[10px] border-white/5">
          <View 
            style={{ 
              position: 'absolute', 
              top: -10, left: -10, right: -10, bottom: -10,
              borderRadius: 100,
              borderWidth: 10,
              borderColor: isPositive ? '#10b981' : '#ef4444',
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              transform: [{ rotate: `${Math.min(180, (currentRate / 100) * 180)}deg` }]
            }} 
          />
          <Text className="text-4xl font-black text-white">{Math.round(currentRate)}%</Text>
          <Text className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">Efficiency</Text>
        </View>
        <Text className="mt-6 text-center text-muted-foreground text-xs px-4">
          You are currently saving {Math.round(currentRate)}% of your total income.
          {currentRate > 20 ? ' Excellent discipline!' : currentRate > 0 ? ' Good start, keep it up.' : ' Warning: Outgoing exceeds incoming.'}
        </Text>
      </View>
    );
  };

  // 6-Month Trend View
  const renderTrend = () => {
    if (!trendData || trendData.length === 0) {
      return (
        <View className="h-[120px] items-center justify-center">
          <Text className="text-muted-foreground text-xs italic">Awaiting trend data...</Text>
        </View>
      );
    }

    const padding = 20;
    const graphWidth = size - padding * 2;
    const maxRate = Math.max(...trendData.map(d => d.rate), 20);
    const minRate = Math.min(...trendData.map(d => d.rate), 0);
    const range = maxRate - minRate || 1;

    const points = trendData.map((d, i) => ({
      x: padding + (i * (graphWidth / (trendData.length - 1))),
      y: chartHeight - padding - ((d.rate - minRate) / range) * (chartHeight - padding * 2)
    }));

    const path = Skia.Path.Make();
    path.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      path.cubicTo(midX, prev.y, midX, curr.y, curr.x, curr.y);
    }

    return (
      <View className="py-4">
        <Canvas style={{ width: size, height: chartHeight }}>
          <Path
            path={path}
            strokeWidth={3}
            style="stroke"
            strokeJoin="round"
            strokeCap="round"
            color="#10b981"
          />
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, chartHeight)}
            colors={['#10b98120', 'transparent']}
          />
        </Canvas>
        <View className="flex-row justify-between px-2 mt-2">
          {trendData.map((d, i) => (
            <Text key={i} className="text-[8px] font-black text-muted-foreground uppercase">{d.label}</Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View className="w-full">
      {/* View Toggle */}
      <View className="flex-row bg-white/5 p-1 rounded-2xl self-center mb-6 border border-white/5">
        <Pressable 
          onPress={() => setViewMode('month')}
          className={`px-6 py-2 rounded-xl ${viewMode === 'month' ? 'bg-primary shadow-sm' : ''}`}
        >
          <Text className={`text-[10px] font-black uppercase tracking-widest ${viewMode === 'month' ? 'text-[#050505]' : 'text-white/40'}`}>
            Month
          </Text>
        </Pressable>
        <Pressable 
          onPress={() => setViewMode('trend')}
          className={`px-6 py-2 rounded-xl ${viewMode === 'trend' ? 'bg-primary shadow-sm' : ''}`}
        >
          <Text className={`text-[10px] font-black uppercase tracking-widest ${viewMode === 'trend' ? 'text-[#050505]' : 'text-white/40'}`}>
            6M Trend
          </Text>
        </Pressable>
      </View>

      {viewMode === 'month' ? renderGauge() : renderTrend()}
    </View>
  );
});
