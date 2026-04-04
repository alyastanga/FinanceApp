import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Canvas, Path, Skia, LinearGradient, vec } from '@shopify/react-native-skia';

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
}

export const TrendChart: React.FC<TrendChartProps> = ({ incomes = [], expenses = [], height = 180, isDark = true }) => {
  const width = Dimensions.get('window').width - 64;
  const paddingVertical = 20;
  const paddingHorizontal = 10;
  
  // Calculate trend data from raw records
  const data = useMemo(() => {
    const points: TrendPoint[] = [];
    if (!incomes || !expenses) return points;
    
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
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
  }, [incomes, expenses]);

  const { maxValue, isAllZero } = useMemo(() => {
    if (!data || data.length === 0) return { maxValue: 1000, isAllZero: true };
    const allValues = data.flatMap(d => [d.income, d.expense]);
    const max = Math.max(...allValues, 0);
    return {
      maxValue: Math.max(max, 1000),
      isAllZero: max === 0
    };
  }, [data]);

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
  }, [data, maxValue]);

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
  }, [data, maxValue]);

  const incomeArea = useMemo(() => {
    if (data.length < 2) return Skia.Path.Make();
    const path = incomePath.copy();
    path.lineTo(getX(data.length - 1), height);
    path.lineTo(getX(0), height);
    path.close();
    return path;
  }, [incomePath, data]);

  const expenseArea = useMemo(() => {
    if (data.length < 2) return Skia.Path.Make();
    const path = expensePath.copy();
    path.lineTo(getX(data.length - 1), height);
    path.lineTo(getX(0), height);
    path.close();
    return path;
  }, [expensePath, data]);

  const textOpacity = isDark ? '0.4' : '0.6';

  return (
    <View className="items-center">
      <View style={{ width, height }}>
        <Canvas style={{ flex: 1 }}>
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
                strokeWidth={3} 
                strokeCap="round" 
                strokeJoin="round"
              />
              <Path 
                path={expensePath} 
                color="#ef4444" 
                style="stroke" 
                strokeWidth={3} 
                strokeCap="round" 
                strokeJoin="round"
              />
            </>
          )}
        </Canvas>
        
        {isAllZero && (
          <View className="absolute inset-0 items-center justify-center">
            <Text className={`text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30 mt-10 ${isDark ? 'text-white' : 'text-black'}`}>
              No activity this period
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row justify-between mt-4 px-2" style={{ width }}>
         {data.map((point, i) => (
           <Text key={i} className={`text-[10px] font-black text-muted-foreground uppercase`} style={{ opacity: parseFloat(textOpacity) }}>
             {point.label}
           </Text>
         ))}
      </View>
    </View>
  );
};
