import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { IconSymbol } from './icon-symbol';
import { useCurrency } from '../../context/CurrencyContext';

interface PortfolioItem {
  id: string;
  name: string;
  assetType: string;
  value: number;
  change24h: number;
}

interface PortfolioSnapshotProps {
  portfolio: PortfolioItem[];
  isDark?: boolean;
}

export default function PortfolioSnapshot({ portfolio, isDark = true }: PortfolioSnapshotProps) {
  const { format } = useCurrency();
  const totalValue = portfolio.reduce((sum, item) => sum + (item.value || 0), 0);
  
  const getAssetIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'stock': return 'chart.bar.fill';
      case 'crypto': return 'sparkles';
      case 'cash': return 'dollarsign.circle';
      default: return 'paperplane.fill';
    }
  };

  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <View className={`overflow-hidden rounded-[44px] border ${isDark ? 'border-white/10' : 'border-black/10'}`}>
      <BlurView intensity={20} tint={isDark ? "dark" : "light"} className="p-8">
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className={`text-[10px] font-black uppercase tracking-[4px] ${isDark ? 'text-primary/60' : 'text-primary'} mb-1`}>Wealth Snapshot</Text>
            <Text className={`text-4xl font-black ${textClass} tracking-tighter`}>{format(totalValue)}</Text>
          </View>
          <View className={`h-10 w-10 ${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-2xl items-center justify-center`}>
             <IconSymbol name="eye.fill" size={20} color={isDark ? "white" : "black"} />
          </View>
        </View>

        {portfolio.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-x-4">
            {portfolio.map((item) => (
              <View key={item.id} className={`${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]'} border ${isDark ? 'border-white/10' : 'border-black/10'} p-5 rounded-[32px] w-40 mr-4`}>
                <View className="flex-row justify-between items-center mb-4">
                  <View className={`h-8 w-8 ${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-xl items-center justify-center`}>
                     <IconSymbol name={getAssetIcon(item.assetType)} size={14} color={isDark ? "#999" : "#666"} />
                  </View>
                  <Text className={`text-[10px] font-black ${item.change24h >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {item.change24h >= 0 ? '+' : ''}{item.change24h}%
                  </Text>
                </View>
                <Text className={`${subTextClass} text-[9px] font-black uppercase tracking-widest mb-1`}>{item.name}</Text>
                <Text className={`${textClass} font-black text-lg tracking-tight`}>{format(item.value)}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className={`${isDark ? 'bg-white/[0.01]' : 'bg-black/[0.01]'} border border-dashed ${isDark ? 'border-white/10' : 'border-black/10'} p-8 rounded-[32px] items-center`}>
             <Text className={`${subTextClass} text-xs italic`}>No assets tracked yet.</Text>
          </View>
        )}
      </BlurView>
    </View>
  );
}
