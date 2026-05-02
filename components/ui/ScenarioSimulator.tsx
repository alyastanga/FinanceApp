import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { simulatePurchaseImpact, SimulationResult } from '@/lib/simulation-engine';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';

interface ScenarioSimulatorProps {
  incomes: any[];
  expenses: any[];
  goals: any[];
  isDark?: boolean;
}

export default function ScenarioSimulator({ incomes, expenses, goals, isDark: isDarkProp }: ScenarioSimulatorProps) {
  const { isDark: themeIsDark } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : themeIsDark;
  const { currency, symbolFor, convertFrom } = useCurrency();
  const [amount, setAmount] = useState('');
  const [results, setResults] = useState<SimulationResult[]>([]);
  const currentSymbol = symbolFor(currency);

  const handleSimulate = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    
    const impacts = simulatePurchaseImpact(val, incomes, expenses, goals, [], convertFrom, currency);
    setResults(impacts);
  };

  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <View className={`${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]'} border ${isDark ? 'border-white/5' : 'border-black/5'} rounded-[40px] p-8 mt-6`}>
      <View className="flex-row items-center gap-x-3 mb-6">
        <View className="h-8 w-8 bg-primary/20 rounded-xl items-center justify-center">
          <IconSymbol name="sparkles" size={16} color="#10b981" />
        </View>
        <Text className={`${textClass} font-black text-sm uppercase tracking-widest`}>Scenario Simulator</Text>
      </View>

      <Text className={`${subTextClass} text-[10px] mb-4 uppercase font-bold tracking-widest`}>
        What if I purchase this?
      </Text>

      <View className="flex-row gap-x-3 mb-8">
        <View className={`flex-1 ${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-2xl border ${isDark ? 'border-white/5' : 'border-black/5'} px-4 py-1 flex-row items-center`}>
          <Text className={`${subTextClass} mr-2`}>{currentSymbol}</Text>
          <TextInput
            style={{ includeFontPadding: false }}
            className={`flex-1 h-14 py-2 ${textClass} font-black text-lg`}
            placeholder="2500.00"
            placeholderTextColor={isDark ? "#666" : "#999"}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <TouchableOpacity 
          onPress={handleSimulate}
          className="bg-primary px-6 rounded-2xl items-center justify-center shadow-lg shadow-primary/20"
        >
          <Text className="text-white font-black uppercase text-[10px] tracking-widest">Run</Text>
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <View className="gap-y-4">
          <Text className={`${isDark ? 'text-white/20' : 'text-black/20'} text-[9px] font-black uppercase tracking-[3px] mb-2 self-center`}>Predicted Impact</Text>
          {results.map((res, idx) => (
            <View key={idx} className={`flex-row items-center justify-between py-3 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
              <View className="flex-1 mr-4">
                <Text className={`${textClass} font-bold text-xs`}>{res.goalName}</Text>
                <Text className={`${subTextClass} text-[9px] uppercase font-black tracking-widest mt-0.5`}>
                  Delay: {res.daysDelayed} days
                </Text>
              </View>
              <View className={`px-3 py-1 rounded-full border ${
                res.impactScore === 'high' ? 'border-destructive/30 bg-destructive/10' :
                res.impactScore === 'medium' ? 'border-amber-500/30 bg-amber-500/10' :
                'border-primary/30 bg-primary/10'
              }`}>
                <Text className={`text-[8px] font-black uppercase tracking-widest ${
                  res.impactScore === 'high' ? 'text-destructive' :
                  res.impactScore === 'medium' ? 'text-amber-500' :
                  'text-primary'
                }`}>
                  {res.impactScore} impact
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {results.length === 0 && (
        <View className={`items-center py-4 ${isDark ? 'bg-white/[0.01]' : 'bg-black/[0.01]'} rounded-2xl border border-dashed ${isDark ? 'border-white/10' : 'border-black/10'} opacity-30`}>
          <Text className={`${subTextClass} text-[9px] uppercase font-black`}>Enter amount to analyze risk</Text>
        </View>
      )}
    </View>
  );
}
