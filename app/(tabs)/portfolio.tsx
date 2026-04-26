import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import { BlurView } from 'expo-blur';
import database from '../../database';
import Portfolio from '../../database/models/Portfolio';
import { PortfolioForm } from '../../components/PortfolioForm';
import { SwipeableSheet } from '../../components/ui/SwipeableSheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';

// @ts-ignore
import { fetchMultipleQuotes } from '../../lib/market-service';

interface PortfolioScreenProps {
  portfolio: Portfolio[];
}

const PortfolioCard = ({ asset, onPress, isDark }: { asset: Portfolio, onPress: () => void, isDark: boolean }) => {
  const { formatRaw, convertFrom, currency, symbolFor } = useCurrency();
  const assetCurrency = asset.currency || currency;
  const displayValue = convertFrom(asset.value, assetCurrency);
  const displayInvested = convertFrom(asset.investedAmount, assetCurrency);
  const gains = displayValue - displayInvested;
  const gainsPercent = displayInvested > 0 ? (gains / displayInvested) * 100 : 0;
  const isGainsPositive = gains >= 0;
  const showCurrencyBadge = assetCurrency !== currency;
  
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${isDark ? 'bg-[#111111] border-white/5' : 'bg-white border-black/5'} border rounded-[32px] p-6 mb-4 flex-row items-center justify-between shadow-sm`}
    >
      <View className="flex-row items-center gap-x-4">
        <View className={`h-12 w-12 rounded-2xl items-center justify-center ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'} border`}>
           <IconSymbol 
             name={
               asset.assetType === 'crypto' ? 'bitcoinsign.circle' : 
               asset.assetType === 'stock' ? 'chart.line.uptrend.xyaxis' : 
               asset.assetType === 'realestate' ? 'house.fill' : 'banknote'
             } 
             size={20} 
             color={isDark ? "#fff" : "#000"} 
           />
        </View>
        <View>
          <View className="flex-row items-center gap-x-2">
            <Text className={`${isDark ? 'text-white' : 'text-black'} font-black text-base`}>{asset.name || asset.symbol}</Text>
            {showCurrencyBadge && (
              <View className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                <Text className={`text-[8px] font-black ${isDark ? 'text-white/60' : 'text-black/60'}`}>{symbolFor(assetCurrency)} {assetCurrency}</Text>
              </View>
            )}
          </View>
          <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[10px] font-black uppercase tracking-widest`}>
            {asset.quantity} {asset.symbol}
          </Text>
        </View>
      </View>

      <View className="items-end">
        <Text className={`${isDark ? 'text-white' : 'text-black'} font-black text-lg`}>{formatRaw(displayValue)}</Text>
        <View className="flex-row items-center gap-x-2">
           <Text className={`text-[10px] font-black ${isGainsPositive ? 'text-primary' : 'text-destructive'}`}>
             {isGainsPositive ? '+' : '-'} {formatRaw(Math.abs(gains))} ({gainsPercent.toFixed(1)}%)
           </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const PortfolioScreenBase = ({ portfolio }: PortfolioScreenProps) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { formatRaw, convertFrom, currency, refreshRates } = useCurrency();
  const [activeAsset, setActiveAsset] = useState<Portfolio | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Proactively fetch exchange rates for all asset currencies
  useEffect(() => {
    const currencies = portfolio.map(p => p.currency).filter(Boolean) as string[];
    if (currencies.length > 0) {
      refreshRates(currencies);
    }
  }, [portfolio, refreshRates]);

  // Convert all assets to the current display currency for totals
  const totalValue = useMemo(() => portfolio.reduce((acc, curr) => {
    return acc + convertFrom(curr.value, curr.currency || currency);
  }, 0), [portfolio, currency, convertFrom]);
  const totalInvested = useMemo(() => portfolio.reduce((acc, curr) => {
    return acc + convertFrom(curr.investedAmount, curr.currency || currency);
  }, 0), [portfolio, currency, convertFrom]);
  const totalGains = totalValue - totalInvested;
  const totalGainsPercent = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;
  
  const filteredPortfolio = useMemo(() => {
    return portfolio.filter(p => 
      (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || 
      (p.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || 
      (p.assetType?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
    );
  }, [portfolio, searchQuery]);

  const refreshPrices = React.useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const marketAssets = portfolio.filter(p => p.assetType === 'stock' || p.assetType === 'crypto');
      const symbols = marketAssets.map(p => p.symbol).filter(Boolean);
      if (symbols.length === 0) return;

      const quotes = await fetchMultipleQuotes(symbols);
      
      await database.write(async () => {
        for (const asset of marketAssets) {
          // Guard against trying to update a record that was just deleted
          if ((asset as any)._raw?._status === 'deleted') continue;

          const quote = quotes[asset.symbol];
          if (quote) {
            await asset.update((record: any) => {
              record.value = quote.currentPrice * record.quantity;
              record.change24h = quote.percentChange;
            });
          }
        }
      });
    } catch (error) {
      console.error('Failed to refresh market prices:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [portfolio, isRefreshing]);

  // Removed automatic effect to make market data pulls explicitly user-driven
  // React.useEffect(() => {
  //   refreshPrices();
  // }, [refreshPrices]);

  const handleAddAsset = () => {
    setActiveAsset(null);
    setIsFormVisible(true);
  };

  const handleEditAsset = (asset: Portfolio) => {
    setActiveAsset(asset);
    setIsFormVisible(true);
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>
      <ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={refreshPrices} 
            tintColor="#10b981" 
            colors={['#10b981']}
          />
        }
      >
        {/* Header Section */}
        <View className="pt-8 pb-10">
          <View className="flex-row justify-between items-center mb-10">
            <View>
              <Text className="text-[10px] font-black text-primary uppercase tracking-[4px] mb-1">Asset Management</Text>
              <Text className={`text-4xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>Net Worth</Text>
            </View>
            <View className="flex-row gap-x-3">
              <TouchableOpacity 
                onPress={refreshPrices}
                disabled={isRefreshing}
                className={`h-12 w-12 rounded-2xl border items-center justify-center ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
              >
                 {isRefreshing ? (
                   <ActivityIndicator size="small" color="#10b981" />
                 ) : (
                   <IconSymbol name="arrow.clockwise" size={20} color={isDark ? "#fff" : "#000"} />
                 )}
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleAddAsset}
                className="h-12 w-12 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/20"
              >
                 <IconSymbol name="plus" size={24} color="#050505" />
              </TouchableOpacity>
            </View>
          </View>

          <View className={`rounded-[48px] border p-10 overflow-hidden shadow-2xl ${isDark ? 'bg-[#111111] border-white/5' : 'bg-white border-black/5'}`}>
             <LinearGradient
               colors={[isDark ? '#10b98115' : '#10b98110', 'transparent']}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 1 }}
               className="absolute inset-0"
             />
             <Text className={`${isDark ? 'text-white/40' : 'text-black/40'} text-[10px] font-black uppercase tracking-[3px] mb-2 text-center`}>Cumulative Assets</Text>
             <Text className={`text-6xl font-black tracking-tighter text-center ${isDark ? 'text-white' : 'text-black'}`}>
               {formatRaw(totalValue)}
             </Text>
             <View className="mt-8 flex-row justify-center gap-x-2">
                <View className={`px-4 py-1.5 rounded-full border ${totalGains >= 0 ? 'bg-primary/20 border-primary/20' : 'bg-destructive/20 border-destructive/20'}`}>
                   <Text className={`${totalGains >= 0 ? 'text-primary' : 'text-destructive'} font-black text-[10px] uppercase tracking-widest`}>
                     {totalGains >= 0 ? '+' : '-'} {formatRaw(Math.abs(totalGains))} ({totalGainsPercent.toFixed(1)}%)
                   </Text>
                </View>
             </View>
          </View>
        </View>

        {/* Search Bar */}
        <View className={`mb-8 flex-row items-center rounded-[24px] border px-6 py-4 ${isDark ? 'bg-[#111111] border-white/5' : 'bg-white border-black/5'}`}>
           <IconSymbol name="magnifyingglass" size={16} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
           <TextInput
             value={searchQuery}
             onChangeText={setSearchQuery}
             placeholder="Search assets or tickers..."
             placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
             className={`flex-1 ml-3 font-bold ${isDark ? 'text-white' : 'text-black'}`}
           />
        </View>

        {/* Asset List */}
        <View className="gap-y-2">
          <Text className={`text-[10px] font-black uppercase tracking-[3px] mb-4 pl-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Asset Inventory</Text>
          {filteredPortfolio.map((asset) => (
            <PortfolioCard key={asset.id} asset={asset} onPress={() => handleEditAsset(asset)} isDark={isDark} />
          ))}
          {filteredPortfolio.length === 0 && (
             <View className="py-20 items-center">
               <View className={`h-20 w-20 rounded-[32px] items-center justify-center mb-4 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <IconSymbol name="plus.circle.fill" size={32} color={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
               </View>
               <Text className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-black/20'}`}>No assets found</Text>
             </View>
          )}
        </View>
      </ScrollView>

      {/* CRUD Sheet */}
      <SwipeableSheet 
        isVisible={isFormVisible} 
        onClose={() => setIsFormVisible(false)}
      >
         <PortfolioForm 
           asset={activeAsset} 
           onSuccess={() => setIsFormVisible(false)} 
           onCancel={() => setIsFormVisible(false)} 
         />
      </SwipeableSheet>
    </SafeAreaView>
  );
};

const enhance = withObservables([], () => ({
  portfolio: database.get('portfolio').query().observe() as any,
}));

export default enhance(PortfolioScreenBase);
