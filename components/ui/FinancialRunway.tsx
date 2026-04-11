import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Canvas, Path, Skia, LinearGradient, vec, RoundedRect, Rect, Shadow } from '@shopify/react-native-skia';
import { useCurrency } from '@/context/CurrencyContext';

interface FinancialRunwayProps {
  runwayDays: number;
  totalLiquidCash: number;
  dailyBurnRate: number;
  isDark?: boolean;
}

export const FinancialRunway: React.FC<FinancialRunwayProps> = ({ 
  runwayDays, 
  totalLiquidCash, 
  dailyBurnRate,
  isDark = true 
}) => {
  const { format } = useCurrency();
  
  // Benchmark: 180 days (6 months) is the safety target
  const SAFETY_TARGET = 180;
  const progress = Math.min(runwayDays / SAFETY_TARGET, 1);
  
  const width = 300;
  const height = 120;
  const barHeight = 8;

  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <View className={`rounded-[44px] border ${isDark ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-black/5'} p-8 shadow-2xl`}>
      <View className="flex-row justify-between items-start mb-6">
        <View>
          <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-[3px] mb-1`}>Survival Capacity</Text>
          <Text className={`${textClass} text-5xl font-black tracking-tighter`}>
            {runwayDays > 365 ? `${(runwayDays/365).toFixed(1)}Y` : runwayDays} 
            <Text className="text-xl font-bold tracking-tight"> {runwayDays === 1 ? 'Day' : 'Days'}</Text>
          </Text>
        </View>
        <View className={`px-4 py-2 rounded-2xl ${progress >= 1 ? 'bg-primary/20' : 'bg-destructive/20'}`}>
          <Text className={`font-black text-[10px] uppercase tracking-widest ${progress >= 1 ? 'text-primary' : 'text-destructive'}`}>
            {progress >= 1 ? 'Stable' : 'Vulnerable'}
          </Text>
        </View>
      </View>

      <View className="mb-6">
        <Canvas style={{ width: '100%', height: barHeight + 20 }}>
          {/* Track */}
          <RoundedRect 
            x={0} y={10} width={width} height={barHeight} 
            r={4} 
            color={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 
          />
          
          {/* Progress Bar */}
          <RoundedRect 
            x={0} y={10} width={width * progress} height={barHeight} 
            r={4} 
            color={progress >= 1 ? '#10b981' : '#ef4444'} 
          >
            <Shadow dx={0} dy={0} blur={10} color={progress >= 1 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'} />
          </RoundedRect>

          {/* Safety Target Marker */}
          <Rect 
            x={width * 0.5} y={5} width={2} height={barHeight + 10} 
            color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} 
          />
        </Canvas>
        <View className="flex-row justify-between mt-1 px-1">
          <Text className={`${subTextClass} text-[8px] font-black uppercase`}>0D</Text>
          <Text className={`${subTextClass} text-[8px] font-black uppercase`}>Safety Target (180D)</Text>
        </View>
      </View>

      <View className={`flex-row justify-between p-5 rounded-[24px] ${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.03]'} border ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <View>
          <Text className={`${subTextClass} text-[8px] font-black uppercase tracking-widest mb-1`}>Liquid Reserve</Text>
          <Text className={`${textClass} font-black text-sm`}>{format(totalLiquidCash)}</Text>
        </View>
        <View className="items-end">
          <Text className={`${subTextClass} text-[8px] font-black uppercase tracking-widest mb-1`}>Avg Burn Rate</Text>
          <Text className={`${textClass} font-black text-sm`}>{format(dailyBurnRate)}/day</Text>
        </View>
      </View>
    </View>
  );
};
