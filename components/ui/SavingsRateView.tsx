import React, { useState } from 'react';
import { View, Text, Dimensions, TouchableOpacity } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Skia } from '@shopify/react-native-skia';

interface SavingsRateViewProps {
  currentRate: number;
  trendData: { label: string; rate: number }[];
}

/**
 * SavingsRateView component featuring a dual-mode visualization.
 * Using standard TouchableOpacity to avoid context conflicts seen with Pressable
 * in some NativeWind v4 environments.
 */
export const SavingsRateView = ({ currentRate, trendData }: SavingsRateViewProps) => {
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
          You {currentRate >= 0 ? 'saved' : 'spent'} {Math.abs(Math.round(currentRate))}% of your income.
          {currentRate > 20 ? ' Excellent discipline!' : currentRate > 0 ? ' Good start.' : ' Warning: Negative flow.'}
        </Text>
      </View>
    );
  };

  // 6-Month Trend View
  const renderTrend = () => {
    // Guards for mobile stability
    if (!trendData || trendData.length < 2) {
      return (
        <View style={{ height: chartHeight + 20, alignItems: 'center', justifyContent: 'center' }}>
          <Text className="text-muted-foreground text-xs italic">
            {trendData.length === 1 ? 'Accumulating historical data...' : 'No trend data available.'}
          </Text>
        </View>
      );
    }

    const padding = 20;
    const effectiveWidth = size || 300;
    const graphWidth = effectiveWidth - padding * 2;
    const maxRate = Math.max(...trendData.map(d => d.rate), 20);
    const minRate = Math.min(...trendData.map(d => d.rate), 0);
    const range = maxRate - minRate || 1;

    // 1. Calculate points
    const points = trendData.map((d, i) => ({
      x: padding + (i * (graphWidth / (trendData.length - 1))),
      y: chartHeight - padding - ((d.rate - minRate) / range) * (chartHeight - padding * 2)
    }));

    // 2. Create Stroke Path (Line)
    const strokePath = Skia.Path.Make();
    strokePath.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      strokePath.cubicTo(midX, prev.y, midX, curr.y, curr.x, curr.y);
    }

    // 3. Create Fill Path (Area under curve)
    const fillPath = strokePath.copy();
    fillPath.lineTo(points[points.length - 1].x, chartHeight);
    fillPath.lineTo(points[0].x, chartHeight);
    fillPath.close();

    return (
      <View className="py-4">
        <Canvas style={{ width: effectiveWidth, height: chartHeight }}>
          {/* Area Fill with Shader correctly nested */}
          <Path path={fillPath}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, chartHeight)}
              colors={['#10b98130', 'transparent']}
            />
          </Path>
          
          {/* Main Stroke Line */}
          <Path
            path={strokePath}
            strokeWidth={3}
            style="stroke"
            strokeJoin="round"
            strokeCap="round"
            color="#10b981"
          />
        </Canvas>
        
        {/* Labels */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 8 }}>
          {trendData.map((d, i) => (
            <Text key={i} style={{ fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
              {d.label}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View className="w-full">
      {/* View Toggle */}
      <View className="flex-row bg-white/5 p-1 rounded-2xl self-center mb-6 border border-white/5">
        <TouchableOpacity 
          onPress={() => setViewMode('month')}
          activeOpacity={0.7}
          style={{ paddingHorizontal: 24, paddingVertical: 8, borderRadius: 12, backgroundColor: viewMode === 'month' ? '#10b981' : 'transparent' }}
        >
          <Text style={{ fontSize: 10, fontWeight: '900', color: viewMode === 'month' ? '#050505' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setViewMode('trend')}
          activeOpacity={0.7}
          style={{ paddingHorizontal: 24, paddingVertical: 8, borderRadius: 12, backgroundColor: viewMode === 'trend' ? '#10b981' : 'transparent' }}
        >
          <Text style={{ fontSize: 10, fontWeight: '900', color: viewMode === 'trend' ? '#050505' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            6M Trend
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'month' ? renderGauge() : renderTrend()}
    </View>
  );
};
