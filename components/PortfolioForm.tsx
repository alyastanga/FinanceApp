import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import database from '../database';
import Portfolio from '../database/models/Portfolio';
import { IconSymbol } from './ui/icon-symbol';
import { useAuth } from '../context/AuthContext';
import { SUPPORTED_CURRENCIES, useCurrency } from '../context/CurrencyContext';

interface PortfolioFormProps {
  asset?: Portfolio | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const ASSET_TYPES = [
  { id: 'stock', label: 'Stock', icon: 'chart.line.uptrend.xyaxis' },
  { id: 'crypto', label: 'Crypto', icon: 'bitcoinsign.circle' },
  { id: 'cash', label: 'Cash', icon: 'banknote' },
  { id: 'realestate', label: 'Real Estate', icon: 'house.fill' },
  { id: 'other', label: 'Other', icon: 'bag.fill' },
];

export const PortfolioForm: React.FC<PortfolioFormProps> = ({ asset, onSuccess, onCancel }) => {
  const { session } = useAuth();
  const { currency: appCurrency, symbolFor } = useCurrency();
  const [name, setName] = useState(asset?.name || '');
  const [assetType, setAssetType] = useState(asset?.assetType || 'stock');
  const [symbol, setSymbol] = useState(asset?.symbol || '');
  const [quantity, setQuantity] = useState(asset?.quantity ? asset.quantity.toString() : '1');
  const [investedAmount, setInvestedAmount] = useState(asset?.investedAmount ? asset.investedAmount.toString() : '');
  const [value, setValue] = useState(asset?.value ? asset.value.toString() : '');
  const [change24h, setChange24h] = useState(asset?.change24h ? asset.change24h.toString() : '0');
  const [assetCurrency, setAssetCurrency] = useState(asset?.currency || appCurrency);

  const currentSymbol = symbolFor(assetCurrency);

  const handleSubmit = async () => {
    const isAutomated = assetType === 'stock' || assetType === 'crypto';
    const isCash = assetType === 'cash';
    
    if (!name || (!isAutomated && !isCash && !value)) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      await database.write(async () => {
        const amt = parseFloat(investedAmount) || 0;
        const val = isCash ? amt : (parseFloat(value) || 0);

        if (asset) {
          // Update existing asset
          await asset.update((record: any) => {
            record.name = name;
            record.assetType = assetType;
            record.symbol = symbol.toUpperCase();
            record.quantity = parseFloat(quantity);
            record.investedAmount = amt;
            record.value = val;
            record.change24h = parseFloat(change24h);
            record.currency = assetCurrency;
          });
        } else {
          // Create new asset
          await database.get('portfolio').create((record: any) => {
            record.name = name;
            record.assetType = assetType;
            record.symbol = symbol.toUpperCase();
            record.quantity = parseFloat(quantity);
            record.investedAmount = amt;
            record.value = val;
            record.change24h = parseFloat(change24h);
            record.currency = assetCurrency;
            record.userId = session?.user?.id || 'anonymous';
          });
        }
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to save portfolio asset:', error);
      Alert.alert('Error', 'Failed to save asset. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!asset) return;
    
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to remove "${asset.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await asset.markAsDeleted();
                await asset.destroyPermanently();
              });
              onSuccess();
            } catch (error) {
              console.error('Failed to delete asset:', error);
              Alert.alert('Error', 'Failed to delete asset.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="gap-y-8" showsVerticalScrollIndicator={false}>
      <View>
        <Text className="text-3xl font-black text-white tracking-tighter">
          {asset ? 'Manage Asset' : 'Add New Wealth'}
        </Text>
        <Text className="text-sm font-medium text-white/40 mt-1 uppercase tracking-widest">
           Track your growing net worth
        </Text>
      </View>

      <View className="gap-y-5">
        {/* Name Input */}
        <View className="bg-white/5 rounded-[24px] p-4 border border-white/5">
          <Text className="text-[10px] font-black uppercase text-white/40 mb-1 tracking-widest pl-2">
            Asset Name (e.g. My Savings, Apple Stock)
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter name..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            className="text-lg font-bold text-white px-2 py-1"
          />
        </View>

        {(assetType === 'stock' || assetType === 'crypto') && (
          <View className="bg-white/5 rounded-[24px] p-4 border border-white/5">
            <Text className="text-[10px] font-black uppercase text-white/40 mb-1 tracking-widest pl-2">
              Ticker Symbol (e.g. AAPL, BTCUSDT)
            </Text>
            <TextInput
              value={symbol}
              onChangeText={setSymbol}
              placeholder="Search symbol..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="characters"
              className="text-lg font-bold text-white px-2 py-1"
            />
          </View>
        )}

        <View className="flex-row gap-x-4">
          {/* Invested Amount Input - Always Show */}
          <View className="flex-1 bg-white/5 rounded-[24px] p-4 border border-white/5">
            <Text className="text-[10px] font-black uppercase text-white/40 mb-1 tracking-widest pl-2">
              {assetType === 'cash' ? `Current Balance (${currentSymbol})` : `Total Invested (${currentSymbol})`}
            </Text>
            <TextInput
              value={investedAmount}
              onChangeText={setInvestedAmount}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
              className="text-lg font-bold text-white px-2 py-1"
            />
          </View>

          {/* Manual Value Input - Only for non-automated, non-cash assets */}
          {assetType !== 'stock' && assetType !== 'crypto' && assetType !== 'cash' && (
            <View className="flex-1 bg-white/5 rounded-[24px] p-4 border border-white/5">
              <Text className="text-[10px] font-black uppercase text-white/40 mb-1 tracking-widest pl-2">
                Current Value ({currentSymbol})
              </Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                className="text-lg font-bold text-primary px-2 py-1"
              />
            </View>
          )}
        </View>

        {/* Change 24h Input - Only for manual assets */}
        {assetType !== 'stock' && assetType !== 'crypto' && assetType !== 'cash' && (
          <View className="bg-white/5 rounded-[24px] p-4 border border-white/5">
            <Text className="text-[10px] font-black uppercase text-white/40 mb-1 tracking-widest pl-2">
              24 Hour Performance (%)
            </Text>
            <TextInput
              value={change24h}
              onChangeText={setChange24h}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
              className={`text-lg font-bold px-2 py-1 ${parseFloat(change24h) >= 0 ? 'text-primary' : 'text-destructive'}`}
            />
          </View>
        )}

        {/* Asset Type Selector */}
        <View className="gap-y-3">
          <Text className="text-[10px] font-black uppercase text-white/40 tracking-widest pl-2">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ASSET_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => setAssetType(type.id)}
                className={`flex-row items-center gap-x-2 px-4 py-3 rounded-2xl border ${assetType === type.id ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/5 opacity-50'}`}
              >
                <IconSymbol name={type.icon as any} size={14} color={assetType === type.id ? '#10b981' : '#fff'} />
                <Text className={`text-[10px] font-black uppercase tracking-widest ${assetType === type.id ? 'text-primary' : 'text-white'}`}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Asset Currency Selector */}
        <View className="gap-y-3">
          <Text className="text-[10px] font-black uppercase text-white/40 tracking-widest pl-2">
            Asset Currency
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ columnGap: 8 }}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                onPress={() => setAssetCurrency(c.code)}
                className={`px-4 py-3 rounded-2xl border ${assetCurrency === c.code ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/5'}`}
              >
                <Text className={`text-sm font-black ${assetCurrency === c.code ? 'text-primary' : 'text-white/60'}`}>{c.symbol}</Text>
                <Text className={`text-[8px] font-black uppercase tracking-widest ${assetCurrency === c.code ? 'text-primary/60' : 'text-white/30'}`}>{c.code}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="flex-row gap-x-4 mt-8">
           <TouchableOpacity 
             onPress={onCancel}
             className="flex-1 bg-white/[0.03] rounded-2xl p-5 items-center border border-white/5"
           >
              <Text className="text-white font-black text-[12px] uppercase tracking-widest">Discard</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             onPress={handleSubmit}
             className="flex-1 bg-primary rounded-2xl p-5 items-center shadow-lg shadow-primary/20"
           >
              <Text className="text-primary-foreground font-black text-[12px] uppercase tracking-widest">
                {asset ? 'Update' : 'Commit Asset'}
              </Text>
           </TouchableOpacity>
        </View>

        {asset && (
           <TouchableOpacity 
             onPress={handleDelete}
             className="w-full bg-destructive/10 rounded-2xl p-5 items-center border border-destructive/20 mt-2"
           >
              <Text className="text-destructive font-black text-[12px] uppercase tracking-widest">Terminate Track</Text>
           </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};
