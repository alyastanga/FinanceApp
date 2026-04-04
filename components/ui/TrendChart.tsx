import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { useCurrency } from '../../context/CurrencyContext';

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

export const TrendChart: React.FC<TrendChartProps> = ({ incomes = [], expenses = [], height = 180, isDark = true, simple = false }) => {
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

      const mIncomes = (incomes || []).filter(inc => {
        const id = new Date(inc.createdAt);
        return id.getMonth() === m && id.getFullYear() === y;
      }).reduce((sum, inc) => sum + (inc.amount || 0), 0);

      const mExpenses = (expenses || []).filter(exp => {
        const ed = new Date(exp.createdAt);
        return ed.getMonth() === m && ed.getFullYear() === y;
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
    const max = Math.max(...allValues, 0);
    
    // Round to nearest nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(max || 1)));
    const roundedMax = Math.ceil((max || 1000) / (magnitude / 2)) * (magnitude / 2);

    return {
      maxValue: roundedMax,
      isAllZero: max === 0,
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
      const midX = (prevX + x) / 2;
      const midY = (prevY + y) / 2;
      path.quadTo(prevX, prevY, midX, midY);
      if (i === data.length - 1) path.lineTo(x, y);
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
      const midX = (prevX + x) / 2;
      const midY = (prevY + y) / 2;
      path.quadTo(prevX, prevY, midX, midY);
      if (i === data.length - 1) path.lineTo(x, y);
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
                <Text className={`text-[8px] font-black uppercase ${range === m ? 'text-[#050505]' : 'text-white/40'}`}>
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
          <View className="absolute right-0 top-0 bottom-0 justify-between py-5 z-10 items-end">
            <Text className={`${isDark ? 'text-white/20' : 'text-black/20'} text-[8px] font-black`}>{formattedMax}</Text>
            <Text className={`${isDark ? 'text-white/20' : 'text-black/20'} text-[8px] font-black`}>
              {format(maxValue / 2)}
            </Text>
            <Text className={`${isDark ? 'text-white/20' : 'text-black/20'} text-[8px] font-black`}>{format(0)}</Text>
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
                  colors={[isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0)']}
                />
              </Path>
              <Path path={expenseArea}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, height)}
                  colors={[isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', 'rgba(239, 68, 68, 0)']}
                />
              </Path>

              <Path
                path={incomePath}
                color="#10b981"
                style="stroke"
                strokeWidth={simple ? 2 : 3}
                strokeCap="round"
                strokeJoin="round"
              />
              <Path
                path={expensePath}
                color="#ef4444"
                style="stroke"
                strokeWidth={simple ? 2 : 3}
                strokeCap="round"
                strokeJoin="round"
              />
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
          {data.map((point, i) => (
            <Text key={i} className={`text-[10px] font-black text-muted-foreground uppercase`} style={{ opacity: parseFloat(textOpacity) }}>
              {point.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};
