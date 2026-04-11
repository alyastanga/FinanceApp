import React, { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Canvas, Path, Skia, Shadow } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming, Easing } from 'react-native-reanimated';

interface MicroBudgetGaugeProps {
  progress: number; // 0 to 1
  size?: number;
  isDark?: boolean;
}

export const MicroBudgetGauge = ({ progress, size = 110, isDark = true }: MicroBudgetGaugeProps) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const canvasPadding = 16;
  
  // Cap at 1.0 (100%) for visual rendering, but we can change color if over 1
  const safeProgress = Math.min(1, Math.max(0, progress));
  
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(safeProgress, {
      duration: 1200,
      easing: Easing.out(Easing.cubic)
    });
  }, [safeProgress]);

  // Health color logic
  const getStatusColor = (p: number) => {
    if (p > 0.9) return '#ef4444'; // Red (Danger)
    if (p > 0.75) return '#f59e0b'; // Amber (Warning)
    return '#10b981'; // Green (Safe)
  };

  const statusColor = getStatusColor(progress);

  const backgroundPath = useMemo(() => {
    const p = Skia.Path.Make();
    const rect = Skia.XYWHRect(
      strokeWidth / 2 + canvasPadding/2,
      strokeWidth / 2 + canvasPadding,
      size - strokeWidth - canvasPadding,
      size - strokeWidth - canvasPadding
    );
    p.addArc(rect, 180, 180);
    return p;
  }, [size, canvasPadding, strokeWidth]);

  const progressPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const sweep = animatedProgress.value * 180;
    const rect = Skia.XYWHRect(
      strokeWidth / 2 + canvasPadding/2,
      strokeWidth / 2 + canvasPadding,
      size - strokeWidth - canvasPadding,
      size - strokeWidth - canvasPadding
    );
    p.addArc(rect, 180, sweep);
    return p;
  });

  return (
    <View style={{ width: size, height: (size / 2) + canvasPadding }} className="items-center justify-end relative">
      <Canvas style={{ width: size, height: (size / 2) + canvasPadding }} className="absolute z-0">
        {/* Track */}
        <Path
          path={backgroundPath}
          color={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
        />
        
        {/* Fill */}
        <Path
          path={progressPath}
          color={statusColor}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
        >
          <Shadow dx={0} dy={0} blur={8} color={statusColor + '80'} />
        </Path>
      </Canvas>
      
      {/* Center Label */}
      <View className="absolute bottom-1 items-center">
        <Text className={`${isDark ? 'text-white' : 'text-black'} text-xl font-black tracking-tighter`}>
          {Math.round(progress * 100)}%
        </Text>
        <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[8px] font-black uppercase tracking-widest`}>
          Allocated
        </Text>
      </View>
    </View>
  );
};
