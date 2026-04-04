import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Canvas, Path, Skia, Circle } from '@shopify/react-native-skia';
import { useCurrency } from '../../context/CurrencyContext';

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface BudgetChartProps {
  data: ChartData[];
  title?: string;
  size?: number;
  isDark?: boolean;
}

export const BudgetChart: React.FC<BudgetChartProps> = ({ data, title, size = 200, isDark = true }) => {
  const { format } = useCurrency();
  const radius = size / 2;
  const strokeWidth = 30;
  const innerRadius = radius - strokeWidth;
  const center = { x: radius, y: radius };

  const total = useMemo(() => {
    if (!data || !Array.isArray(data)) return 0;
    return data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [data]);

  const paths = useMemo(() => {
    if (total === 0) return [];
    let startAngle = 0;
    
    return data.map((item) => {
      const percentage = item.value / total;
      const angle = percentage * 360;
      const endAngle = startAngle + angle;
      
      // Calculate arc coordinates manually for SVG-style path string
      const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
        return {
          x: centerX + radius * Math.cos(angleInRadians),
          y: centerY + radius * Math.sin(angleInRadians),
        };
      };

      const start = polarToCartesian(radius, radius, innerRadius + strokeWidth / 2, startAngle);
      const end = polarToCartesian(radius, radius, innerRadius + strokeWidth / 2, endAngle);
      const largeArcFlag = angle <= 180 ? '0' : '1';

      // SVG Path: Move to start, then Draw Arc
      const pathString = `M ${start.x} ${start.y} A ${radius - strokeWidth / 2} ${radius - strokeWidth / 2} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;

      const result = {
        path: pathString,
        color: item.color,
        label: item.label,
        value: item.value
      };

      startAngle = endAngle;
      return result;
    });
  }, [data, size, total]);

  return (
    <View className="items-center py-4">
      {title && (
        <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[10px] font-black uppercase tracking-[3px] mb-6`}>
          {title}
        </Text>
      )}
      
      <View style={{ width: size, height: size }}>
        <Canvas 
          style={{ flex: 1 }}
          // @ts-ignore - Web-only property to prevent WebGL context collision/overload (err 0)
          __destroyWebGLContextAfterRender={true}
        >
          {total === 0 ? (
            <Circle
              cx={radius}
              cy={radius}
              r={radius - strokeWidth / 2}
              color={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
              style="stroke"
              strokeWidth={strokeWidth}
            />
          ) : (
            paths.map((p, i) => (
              <Path
                key={i}
                path={p.path}
                color={p.color}
                style="stroke"
                strokeWidth={strokeWidth}
                strokeCap="round"
              />
            ))
          )}
        </Canvas>
        
        {/* Center Content (Donut Hole) */}
        <View 
          className="absolute items-center justify-center" 
          style={{ 
            top: strokeWidth, 
            left: strokeWidth, 
            width: size - (strokeWidth * 2), 
            height: size - (strokeWidth * 2),
            borderRadius: radius
          }}
        >
          <Text className={`${isDark ? 'text-white/20' : 'text-black/20'} text-[10px] font-black uppercase tracking-widest`}>Total</Text>
          <Text className={`${isDark ? 'text-white' : 'text-black'} text-xl font-black`}>{format(total)}</Text>
        </View>
      </View>

      {/* Legend */}
      <View className="flex-row flex-wrap justify-center mt-8 gap-4 px-4">
        {data.map((item, index) => (
          <View key={index} className="flex-row items-center gap-x-2">
            <View 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: item.color }} 
            />
            <Text className={`${isDark ? 'text-white/60' : 'text-black/60'} text-[10px] font-bold uppercase tracking-widest leading-none`}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
