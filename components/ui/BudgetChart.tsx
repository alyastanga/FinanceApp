import React, { useMemo, useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { 
  Canvas, 
  Path, 
  Skia, 
  Group
} from '@shopify/react-native-skia';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';

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
  hideLegend?: boolean;
  hideTitle?: boolean;
  showCenterLabel?: boolean;
  emptyMessage?: string;
}

export const BudgetChart: React.FC<BudgetChartProps> = ({ 
  data, 
  title, 
  size = 200, 
  isDark: isDarkProp,
  hideLegend = false,
  hideTitle = false,
  showCenterLabel = true,
  emptyMessage = "No data"
}) => {
  const { isDark: themeIsDark } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : themeIsDark;
  const { format } = useCurrency();
  const radius = size / 2;
  const strokeWidth = 28;
  const innerRadius = radius - strokeWidth;
  // Animation value for the "sweep" entrance using Reanimated
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.exp),
    });
  }, [data]);

  const total = useMemo(() => {
    if (!data || !Array.isArray(data)) return 0;
    return data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [data]);

  const segments = useMemo(() => {
    if (total === 0) return [];
    let startAngle = 0;
    
    return data.map((item) => {
      const percentage = item.value / total;
      const angle = percentage >= 1 ? 359.99 : percentage * 360;
      const endAngle = startAngle + angle;
      
      const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
        return {
          x: centerX + r * Math.cos(angleInRadians),
          y: centerY + r * Math.sin(angleInRadians),
        };
      };

      const start = polarToCartesian(radius, radius, innerRadius + strokeWidth / 2, startAngle);
      const end = polarToCartesian(radius, radius, innerRadius + strokeWidth / 2, endAngle);
      const largeArcFlag = angle <= 180 ? '0' : '1';

      const pathString = `M ${start.x} ${start.y} A ${radius - strokeWidth / 2} ${radius - strokeWidth / 2} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;

      const result = {
        path: pathString,
        color: item.color,
        label: item.label,
        value: item.value,
        percentage: (percentage * 100).toFixed(0)
      };

      startAngle = endAngle;
      return result;
    });
  }, [data, size, total]);

  return (
    <View className={`items-center w-full ${hideLegend ? 'py-0' : 'py-2'}`}>
      {title && !hideTitle && (
        <View className="mb-6 flex-row items-center">
            <View className="h-[1px] w-4 bg-emerald-500/30 mr-3" />
            <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[10px] font-black uppercase tracking-[3px]`}>
            {title}
            </Text>
            <View className="h-[1px] w-4 bg-emerald-500/30 ml-3" />
        </View>
      )}
      
      <View style={{ width: size, height: size }}>
        {total > 0 ? (
          <Canvas 
            style={{ width: size, height: size }}
            // @ts-ignore - Web-only property to prevent WebGL context collision/overload (err 0)
            __destroyWebGLContextAfterRender={true}
          >
            {/* Background Track (Recessed Path) */}
            <Path
              path={`M ${radius} ${strokeWidth / 2} A ${radius - strokeWidth / 2} ${radius - strokeWidth / 2} 0 1 1 ${radius - 0.01} ${strokeWidth / 2}`}
              color={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}
              style="stroke"
              strokeWidth={strokeWidth + 4}
            />

            <Group>
              {segments.map((p, i) => (
                <Path
                  key={i}
                  path={p.path}
                  color={p.color}
                  style="stroke"
                  strokeWidth={strokeWidth}
                  strokeCap="butt"
                  end={progress}
                />
              ))}
            </Group>
          </Canvas>
        ) : (
          <View className="flex-1 items-center justify-center">
             <View 
               style={{ 
                 width: size - strokeWidth, 
                 height: size - strokeWidth, 
                 borderRadius: radius, 
                 borderWidth: strokeWidth, 
                 borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' 
               }} 
             />
          </View>
        )}
        
        {showCenterLabel && (
          <View 
            className="absolute items-center justify-center p-4" 
            style={{ 
              top: strokeWidth, 
              left: strokeWidth, 
              width: size - (strokeWidth * 2), 
              height: size - (strokeWidth * 2),
              borderRadius: radius
            }}
          >
            {total === 0 ? (
              <Text 
                className={`${isDark ? 'text-white/40' : 'text-black/40'} font-black uppercase text-center tracking-widest leading-tight`}
                style={{ fontSize: size < 150 ? 6 : 8 }}
              >
                {emptyMessage}
              </Text>
            ) : (
              <View className="items-center">
                <Text 
                  className="text-emerald-500 font-black uppercase tracking-[4px] mb-1 opacity-60"
                  style={{ fontSize: size < 150 ? 5 : 8 }}
                >
                  TOTAL
                </Text>
                <Text 
                  className={`${isDark ? 'text-white' : 'text-black'} font-black tracking-tighter`}
                  style={{ fontSize: size < 150 ? 14 : 22 }}
                >
                  {format(total)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Modern High-End Legend */}
      {!hideLegend && (
        <View className="w-full mt-10 px-2">
          {segments.map((item, index) => (
            <View 
              key={index} 
              className={`flex-row items-center justify-between py-2.5 border-b mb-1 ${isDark ? 'border-white/5' : 'border-black/5'}`}
            >
              <View className="flex-row items-center flex-1">
                <View 
                  className="h-2.5 w-2.5 rounded-full mr-3 shadow-lg" 
                  style={{ 
                    backgroundColor: item.color,
                    shadowColor: item.color,
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                    elevation: 4
                  }} 
                />
                <View>
                    <Text className={`${isDark ? 'text-white/90' : 'text-black/90'} text-[11px] font-bold uppercase tracking-widest`}>
                    {item.label}
                    </Text>
                    <Text className={`text-[8px] font-black uppercase tracking-[1px] mt-0.5 ${isDark ? 'text-white/20' : 'text-black/20'}`}>
                        Categorical Insight
                    </Text>
                </View>
              </View>
              
              <View className="items-end">
                <Text className={`${isDark ? 'text-white' : 'text-black'} text-[11px] font-black tracking-tighter`}>
                  {format(item.value)}
                </Text>
                <Text 
                    className="text-[9px] font-black uppercase mt-0.5"
                    style={{ color: item.color }}
                >
                  {item.percentage}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

