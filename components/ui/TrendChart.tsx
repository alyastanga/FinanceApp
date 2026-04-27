import { Canvas, LinearGradient, Path, Shadow, Skia, vec } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { useCurrency } from '../../context/CurrencyContext';
import { normalizeDate } from '../../lib/date-utils';
import { useTheme } from '../../context/ThemeContext';

interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

interface TrendChartProps {
  incomes: any[];
  expenses: any[];
  height?: number;
  isDark?: boolean;
  simple?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({ incomes = [], expenses = [], height = 180, isDark: isDarkProp, simple = false }) => {
  const { isDark: themeIsDark } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : themeIsDark;
  const { format } = useCurrency();
  const [range, setRange] = React.useState(6);
  const width = simple ? Dimensions.get('window').width / 2 : Dimensions.get('window').width - 120; // Adjusted for sparkline or full view
  const paddingVertical = simple ? 5 : 20;
  const paddingHorizontal = 0;

  // Calculate trend data from raw records
  const data = useMemo(() => {
    const points: TrendPoint[] = [];
    if (!incomes || !expenses) return points;

    const now = new Date();

    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthStart = new Date(y, m, 1).getTime();
      const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();

      const mIncomes = (incomes || []).filter(inc => {
        const t = normalizeDate(inc);
        return t >= monthStart && t <= monthEnd;
      }).reduce((sum, inc) => sum + (inc.amount || 0), 0);

      const mExpenses = (expenses || []).filter(exp => {
        const t = normalizeDate(exp);
        return t >= monthStart && t <= monthEnd;
      }).reduce((sum, exp) => sum + Math.abs(exp.amount || 0), 0);

      points.push({
        label: d.toLocaleString('default', { month: 'short' }),
        income: mIncomes,
        expense: mExpenses
      });
    }
    return points;
  }, [incomes, expenses, range]);

  const { maxValue, isAllZero, formattedMax } = useMemo(() => {
    if (!data || data.length === 0) return { maxValue: 1000, isAllZero: true, formattedMax: format(1000) };
    const allValues = data.flatMap(d => [d.income, d.expense]);
    const highPoint = Math.max(...allValues, 0);

    // Applying 15% margin buffer above peak
    const bufferedMax = (highPoint || 1000) * 1.15;

    // Snap to "nice" round numbers (mag / 2)
    const magnitude = Math.pow(10, Math.floor(Math.log10(bufferedMax || 1)));
    const roundedMax = Math.ceil(bufferedMax / (magnitude / 2)) * (magnitude / 2);

    return {
      maxValue: roundedMax,
      isAllZero: highPoint === 0,
      formattedMax: format(roundedMax)
    };
  }, [data, format]);

  const getY = (val: number) => {
    return height - paddingVertical - (val / maxValue) * (height - paddingVertical * 2);
  };

  const getX = (index: number) => {
    return paddingHorizontal + (index / (data.length - 1)) * (width - paddingHorizontal * 2);
  };

  const incomePath = useMemo(() => {
    if (data.length < 2) return Skia.Path.Make();
    const path = Skia.Path.Make();
    path.moveTo(getX(0), getY(data[0].income));
    for (let i = 1; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i].income);
      const prevX = getX(i - 1);
      const prevY = getY(data[i - 1].income);

      // Soften quadTo by adjusting control point toward current point
      // Using a smoother organic midpoint approach
      const cpX = (prevX + x) / 2;
      path.quadTo(cpX, prevY, x, y);
    }
    return path;
  }, [data, maxValue, width]);

  const expensePath = useMemo(() => {
    if (data.length < 2) return Skia.Path.Make();
    const path = Skia.Path.Make();
    path.moveTo(getX(0), getY(data[0].expense));
    for (let i = 1; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i].expense);
      const prevX = getX(i - 1);
      const prevY = getY(data[i - 1].expense);

      const cpX = (prevX + x) / 2;
      path.quadTo(cpX, prevY, x, y);
    }
    return path;
  }, [data, maxValue, width]);

  const incomeArea = useMemo(() => {
    if (data.length < 2) return Skia.Path.Make();
    const path = incomePath.copy();
    path.lineTo(getX(data.length - 1), height);
    path.lineTo(getX(0), height);
    path.close();
    return path;
  }, [incomePath, data, height, width]);

  const expenseArea = useMemo(() => {
    if (data.length < 2) return Skia.Path.Make();
    const path = expensePath.copy();
    path.lineTo(getX(data.length - 1), height);
    path.lineTo(getX(0), height);
    path.close();
    return path;
  }, [expensePath, data, height, width]);

  const textOpacity = isDark ? '0.4' : '0.6';

  return (
    <View className={`items-center w-full ${simple ? '' : 'px-4'}`}>
      {/* Legend & Range Selector */}
      {!simple && (
        <View className="flex-row justify-between items-center mb-8 w-full px-2">
          <View className="flex-row gap-x-4">
            <View className="flex-row items-center gap-x-2">
              <View className="h-1.5 w-1.5 rounded-full bg-[#10b981] shadow-sm shadow-primary" />
              <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[9px] font-black uppercase tracking-[1px]`}>Income</Text>
            </View>
            <View className="flex-row items-center gap-x-2">
              <View className="h-1.5 w-1.5 rounded-full bg-[#ef4444] shadow-sm shadow-destructive" />
              <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[9px] font-black uppercase tracking-[1px]`}>Expenses</Text>
            </View>
          </View>

          <View className="flex-row bg-white/5 rounded-xl p-1 border border-white/5">
            {[3, 6, 12].map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setRange(m)}
                className={`px-3 py-1.5 rounded-lg ${range === m ? 'bg-primary' : ''}`}
              >
                <Text className={`text-[8px] font-black uppercase ${range === m ? 'text-primary-foreground' : (isDark ? 'text-white/40' : 'text-black/40')}`}>
                  {m === 12 ? '1Y' : `${m}M`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={{ width, height }}>
        {/* Y-Axis Labels */}
        {!simple && (
          <View 
            className="absolute right-0 top-0 bottom-0 justify-between z-10 items-end pr-1"
            style={{ paddingVertical: paddingVertical }}
          >
            <View className="items-end">
              <Text className={`${isDark ? 'text-white/10' : 'text-black/10'} text-[7px] font-black uppercase tracking-widest`}>Peak</Text>
              <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[8px] font-black uppercase tracking-widest`}>{formattedMax}</Text>
            </View>
            <View className="items-end">
              <Text className={`${isDark ? 'text-white/10' : 'text-black/10'} text-[7px] font-black uppercase tracking-widest`}>Mid</Text>
              <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[8px] font-black uppercase tracking-widest`}>
                {format(maxValue / 2)}
              </Text>
            </View>
            <View className="items-end">
              <Text className={`${isDark ? 'text-white/10' : 'text-black/10'} text-[7px] font-black uppercase tracking-widest`}>Base</Text>
              <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[8px] font-black uppercase tracking-widest`}>{format(0)}</Text>
            </View>
          </View>
        )}

        <Canvas style={{ flex: 1 }}>
          {/* Grid Lines */}
          {!simple && (
            <>
              <Path
                path={`M ${paddingHorizontal} ${getY(maxValue)} L ${width} ${getY(maxValue)}`}
                color={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
                style="stroke"
                strokeWidth={1}
              />
              <Path
                path={`M ${paddingHorizontal} ${getY(maxValue / 2)} L ${width} ${getY(maxValue / 2)}`}
                color={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
                style="stroke"
                strokeWidth={1}
              />
              <Path
                path={`M ${paddingHorizontal} ${getY(0)} L ${width} ${getY(0)}`}
                color={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
                style="stroke"
                strokeWidth={1}
              />
            </>
          )}

          {!isAllZero && (
            <>
              <Path path={incomeArea}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, height)}
                  colors={[isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0)']}
                />
              </Path>
              <Path path={expenseArea}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, height)}
                  colors={[isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)', 'rgba(239, 68, 68, 0)']}
                />
              </Path>

              {/* Main Paths with Glow Effects */}
              <Path
                path={incomePath}
                color="#10b981"
                style="stroke"
                strokeWidth={simple ? 2 : 3}
                strokeCap="round"
                strokeJoin="round"
              >
                {!simple && <Shadow dx={0} dy={0} blur={10} color="rgba(16, 185, 129, 0.5)" />}
              </Path>

              <Path
                path={expensePath}
                color="#ef4444"
                style="stroke"
                strokeWidth={simple ? 2 : 3}
                strokeCap="round"
                strokeJoin="round"
              >
                {!simple && <Shadow dx={0} dy={0} blur={10} color="rgba(239, 68, 68, 0.4)" />}
              </Path>
            </>
          )}
        </Canvas>

        {isAllZero && (
          <View className="absolute inset-0 items-center justify-center">
            <Text className={`text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30 ${simple ? '' : 'mt-10'} ${isDark ? 'text-white' : 'text-black'}`}>
              No activity
            </Text>
          </View>
        )}
      </View>

      {!simple && (
        <View className="flex-row justify-between mt-6 px-1" style={{ width }}>
          {data.map((point, i) => {
            // Label Staggering: Hide labels on 12M view if they overlap
            const isHidden = range === 12 && i % 2 !== 0;
            if (isHidden) {
              return <View key={i} className="w-4" />;
            }
            return (
              <Text
                key={i}
                className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}
              >
                {point.label}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
};
