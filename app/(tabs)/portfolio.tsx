import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/watermelondb/react/withObservables';
import { BlurView } from 'expo-blur';
import database from '../../database';
import Portfolio from '../../database/models/Portfolio';
import { PortfolioForm } from '../../components/PortfolioForm';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { useCurrency } from '../../context/CurrencyContext';

// @ts-ignore
import { fetchMultipleQuotes } from '../../lib/market-service';

interface PortfolioScreenProps {
  portfolio: Portfolio[];
}

const PortfolioCard = ({ asset, onPress }: { asset: Portfolio, onPress: () => void }) => {
  const { format } = useCurrency();
  const isPositive = asset.change24h >= 0;
  const gains = asset.value - asset.investedAmount;
  const gainsPercent = asset.investedAmount > 0 ? (gains / asset.investedAmount) * 100 : 0;
  const isGainsPositive = gains >= 0;
  
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-[#111111] border border-white/5 rounded-[32px] p-6 mb-4 flex-row items-center justify-between"
    >
      <View className="flex-row items-center gap-x-4">
        <View className={`h-12 w-12 rounded-2xl items-center justify-center bg-white/5 border border-white/5`}>
           <IconSymbol 
             name={
               asset.assetType === 'crypto' ? 'bitcoinsign.circle' : 
               asset.assetType === 'stock' ? 'chart.line.uptrend.xyaxis' : 
               asset.assetType === 'realestate' ? 'house.fill' : 'banknote'
             } 
             size={20} 
             color="#fff" 
           />
        </View>
        <View>
          <Text className="text-white font-black text-base">{asset.name || asset.symbol}</Text>
          <Text className="text-white/40 text-[10px] font-black uppercase tracking-widest">
            {asset.quantity} {asset.symbol}
          </Text>
        </View>
      </View>

      <View className="items-end">
        <Text className="text-white font-black text-lg">{format(asset.value)}</Text>
        <View className="flex-row items-center gap-x-2">
           <Text className={`text-[10px] font-black ${isGainsPositive ? 'text-primary' : 'text-destructive'}`}>
             {isGainsPositive ? '+' : '-'} {format(Math.abs(gains))} ({gainsPercent.toFixed(1)}%)
           </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const PortfolioScreenBase = ({ portfolio }: PortfolioScreenProps) => {
  const { format } = useCurrency();
  const [activeAsset, setActiveAsset] = useState<Portfolio | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const totalValue = useMemo(() => portfolio.reduce((acc, curr) => acc + curr.value, 0), [portfolio]);
  const totalInvested = useMemo(() => portfolio.reduce((acc, curr) => acc + curr.investedAmount, 0), [portfolio]);
  const totalGains = totalValue - totalInvested;
  const totalGainsPercent = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;
  
  const filteredPortfolio = useMemo(() => {
    return portfolio.filter(p => 
      (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || 
      (p.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || 
      (p.assetType?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
    );
  }, [portfolio, searchQuery]);

  const refreshPrices = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const symbols = portfolio.map(p => p.symbol).filter(Boolean);
      if (symbols.length === 0) return;

      const quotes = await fetchMultipleQuotes(symbols);
      
      await database.write(async () => {
        for (const asset of portfolio) {
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
  };

  React.useEffect(() => {
    refreshPrices();
  }, []);

  const handleAddAsset = () => {
    setActiveAsset(null);
    setIsFormVisible(true);
  };

  const handleEditAsset = (asset: Portfolio) => {
    setActiveAsset(asset);
    setIsFormVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={['top']}>
      <ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header Section */}
        <View className="pt-8 pb-10">
          <View className="flex-row justify-between items-center mb-10">
            <View>
              <Text className="text-[10px] font-black text-primary uppercase tracking-[4px] mb-1">Asset Management</Text>
              <Text className="text-4xl font-black text-white tracking-tighter">Net Worth</Text>
            </View>
            <View className="flex-row gap-x-3">
              <TouchableOpacity 
                onPress={refreshPrices}
                disabled={isRefreshing}
                className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 items-center justify-center"
              >
                 {isRefreshing ? (
                   <ActivityIndicator size="small" color="#10b981" />
                 ) : (
                   <IconSymbol name="arrow.clockwise" size={20} color="#fff" />
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

          <View className="bg-[#111111] rounded-[48px] border border-white/5 p-10 overflow-hidden shadow-2xl">
             <LinearGradient
               colors={['#10b98115', 'transparent']}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 1 }}
               className="absolute inset-0"
             />
             <Text className="text-white/40 text-[10px] font-black uppercase tracking-[3px] mb-2 text-center">Cumulative Assets</Text>
             <Text className="text-6xl font-black text-white tracking-tighter text-center">
               {format(totalValue)}
             </Text>
             <View className="mt-8 flex-row justify-center gap-x-2">
                <View className={`px-4 py-1.5 rounded-full border ${totalGains >= 0 ? 'bg-primary/20 border-primary/20' : 'bg-destructive/20 border-destructive/20'}`}>
                   <Text className={`${totalGains >= 0 ? 'text-primary' : 'text-destructive'} font-black text-[10px] uppercase tracking-widest`}>
                     {totalGains >= 0 ? '+' : '-'} {format(Math.abs(totalGains))} ({totalGainsPercent.toFixed(1)}%)
                   </Text>
                </View>
             </View>
          </View>
        </View>

        {/* Search Bar */}
        <View className="mb-8 flex-row items-center bg-[#111111] rounded-[24px] border border-white/5 px-6 py-4">
           <IconSymbol name="magnifyingglass" size={16} color="rgba(255,255,255,0.2)" />
           <TextInput
             value={searchQuery}
             onChangeText={setSearchQuery}
             placeholder="Search assets or tickers..."
             placeholderTextColor="rgba(255,255,255,0.2)"
             className="flex-1 ml-3 text-white font-bold"
           />
        </View>

        {/* Asset List */}
        <View className="gap-y-2">
          <Text className="text-[10px] font-black text-white/40 uppercase tracking-[3px] mb-4 pl-2">Asset Inventory</Text>
          {filteredPortfolio.map((asset) => (
            <PortfolioCard key={asset.id} asset={asset} onPress={() => handleEditAsset(asset)} />
          ))}
          {filteredPortfolio.length === 0 && (
             <View className="py-20 items-center">
               <View className="h-20 w-20 bg-white/5 rounded-[32px] items-center justify-center mb-4">
                  <IconSymbol name="plus.circle.fill" size={32} color="rgba(255,255,255,0.1)" />
               </View>
               <Text className="text-white/20 text-sm font-black uppercase tracking-widest">No assets found</Text>
             </View>
          )}
        </View>
      </ScrollView>

      {/* CRUD Sheet */}
      {isFormVisible && (
        <View className="absolute inset-0 z-50">
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setIsFormVisible(false)}
            className="absolute inset-0 bg-black/80"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 justify-end"
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
              className="w-full"
            >
              <BlurView intensity={30} tint="dark" className="rounded-t-[48px] overflow-hidden border-t border-white/10">
                <View className="bg-black/90 p-8 pt-4 pb-12">
                   <View className="w-12 h-1.5 bg-white/10 rounded-full self-center mb-8" />
                   <PortfolioForm 
                     asset={activeAsset} 
                     onSuccess={() => setIsFormVisible(false)} 
                     onCancel={() => setIsFormVisible(false)} 
                   />
                </View>
              </BlurView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      )}
    </SafeAreaView>
  );
};

const enhance = withObservables([], () => ({
  portfolio: database.get('portfolio').query().observe() as any,
}));

export default enhance(PortfolioScreenBase);
