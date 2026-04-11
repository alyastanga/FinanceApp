import React, { useState, useMemo } from 'react';
import { View, Text, Dimensions, TouchableOpacity } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Skia } from '@shopify/react-native-skia';

interface SavingsRateViewProps {
  incomes: any[];
  expenses: any[];
  isDark?: boolean;
}

/**
 * SavingsRateView component featuring a dual-mode visualization.
 * Now handles internal calculation of the savings rate from raw records.
 */
export const SavingsRateView = ({ incomes, expenses, isDark = true }: SavingsRateViewProps) => {
  const [viewMode, setViewMode] = useState<'month' | 'trend'>('month');
  const size = Dimensions.get('window').width - 80;
  const chartHeight = 120;

  // Calculate stats
  const { currentRate, trendData } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getMonthStats = (month: number, year: number) => {
      const monthIncomes = incomes.filter(i => {
        const d = new Date(i.createdAt);
        return d.getMonth() === month && d.getFullYear() === year;
      }).reduce((sum, i) => sum + i.amount, 0);

      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.createdAt);
        return d.getMonth() === month && d.getFullYear() === year;
      }).reduce((sum, e) => sum + Math.abs(e.amount), 0);

      const rate = monthIncomes > 0 ? ((monthIncomes - monthExpenses) / monthIncomes) * 100 : 0;
      return { income: monthIncomes, expense: monthExpenses, rate };
    };

    // Current Rate
    const current = getMonthStats(currentMonth, currentYear);

    // 6 Month Trend
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const stats = getMonthStats(d.getMonth(), d.getFullYear());
      trends.push({
        label: d.toLocaleString('default', { month: 'short' }),
        rate: stats.rate
      });
    }

    return { currentRate: current.rate, trendData: trends };
  }, [incomes, expenses]);

  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  // Monthly Gauge View
  const renderGauge = () => {
    const isPositive = currentRate >= 0;
    return (
      <View className="items-center py-4">
        <View className={`relative items-center justify-center h-32 w-32 rounded-full border-[10px] ${isDark ? 'border-white/5' : 'border-black/5'}`}>
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
          <Text className={`text-4xl font-black ${textClass}`}>{Math.round(currentRate)}%</Text>
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
    const padding = 20;
    const effectiveWidth = size || 300;
    const graphWidth = effectiveWidth - padding * 2;
    const maxRate = Math.max(...trendData.map(d => d.rate), 20);
    const minRate = Math.min(...trendData.map(d => d.rate), 0);
    const range = maxRate - minRate || 1;

    const points = trendData.map((d, i) => ({
      x: padding + (i * (graphWidth / (trendData.length - 1))),
      y: chartHeight - padding - ((d.rate - minRate) / range) * (chartHeight - padding * 2)
    }));

    const strokePath = Skia.Path.Make();
    if (points.length > 0) {
      strokePath.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const midX = (prev.x + curr.x) / 2;
        strokePath.cubicTo(midX, prev.y, midX, curr.y, curr.x, curr.y);
      }
    }

    const fillPath = strokePath.copy();
    if (points.length > 0) {
      fillPath.lineTo(points[points.length - 1].x, chartHeight);
      fillPath.lineTo(points[0].x, chartHeight);
      fillPath.close();
    }

    const hasData = trendData.some(d => d.rate !== 0);

    return (
      <View className="py-4">
        {hasData ? (
          <Canvas style={{ width: effectiveWidth, height: chartHeight }}>
            <Path path={fillPath}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, chartHeight)}
                colors={['#10b98130', 'transparent']}
              />
            </Path>
            <Path
              path={strokePath}
              strokeWidth={3}
              style="stroke"
              strokeJoin="round"
              strokeCap="round"
              color="#10b981"
            />
          </Canvas>
        ) : (
          <View style={{ width: effectiveWidth, height: chartHeight, alignItems: 'center', justifyContent: 'center' }}>
            <Text className={`${subTextClass} text-[9px] font-black uppercase tracking-widest opacity-30`}>Insufficient data for trend</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 8 }}>
          {trendData.map((d, i) => (
            <Text key={i} style={{ fontSize: 8, fontWeight: '900', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase' }}>
              {d.label}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View className="w-full">
      <View className={`flex-row ${isDark ? 'bg-white/5' : 'bg-black/5'} p-1 rounded-2xl self-center mb-6 border ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <TouchableOpacity 
          onPress={() => setViewMode('month')}
          activeOpacity={0.7}
          style={{ paddingHorizontal: 24, paddingVertical: 8, borderRadius: 12, backgroundColor: viewMode === 'month' ? '#10b981' : 'transparent' }}
        >
          <Text style={{ fontSize: 10, fontWeight: '900', color: viewMode === 'month' ? '#050505' : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setViewMode('trend')}
          activeOpacity={0.7}
          style={{ paddingHorizontal: 24, paddingVertical: 8, borderRadius: 12, backgroundColor: viewMode === 'trend' ? '#10b981' : 'transparent' }}
        >
          <Text style={{ fontSize: 10, fontWeight: '900', color: viewMode === 'trend' ? '#050505' : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), textTransform: 'uppercase', letterSpacing: 1.5 }}>
            6M Trend
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'month' ? renderGauge() : renderTrend()}
    </View>
  );
};
