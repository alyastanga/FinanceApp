import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import database from '../database';
import Portfolio from '../database/models/Portfolio';
import { IconSymbol } from './ui/icon-symbol';
import { useAuth } from '../context/AuthContext';
import { SUPPORTED_CURRENCIES, useCurrency } from '../context/CurrencyContext';
import { generateUUID } from '../lib/id-utils';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark } = useTheme();
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
  const [isSaving, setIsSaving] = useState(false);

  const currentSymbol = symbolFor(assetCurrency);

  const handleSubmit = async () => {
    const isAutomated = assetType === 'stock' || assetType === 'crypto';
    const isCash = assetType === 'cash';
    
    if (!name || (!isAutomated && !isCash && !value)) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setIsSaving(true);

    try {
      let finalValue = (isCash && value === '') ? (parseFloat(investedAmount) || 0) : (parseFloat(value) || 0);
      let finalChange = parseFloat(change24h) || 0;
      const amt = parseFloat(investedAmount) || 0;
      const qty = parseFloat(quantity) || 1;

      // Automatically fetch current market value for stocks and crypto
      if (isAutomated && symbol) {
        try {
          const { fetchMarketQuote } = require('../lib/market-service');
          const quote = await fetchMarketQuote(symbol.toUpperCase());
          if (quote) {
             finalValue = quote.currentPrice * qty;
             finalChange = quote.percentChange;
          } else {
             // Fallback if quote fails
             finalValue = amt;
          }
        } catch (e) {
          console.warn('Failed to auto-fetch quote during creation', e);
          finalValue = amt; // Fallback so it doesn't show 0
        }
      }

      await database.write(async () => {
        if (asset) {
          // Update existing asset
          await asset.update((record: any) => {
            record.name = name;
            record.assetType = assetType;
            record.symbol = symbol.toUpperCase();
            record.quantity = qty;
            record.investedAmount = amt;
            record.value = finalValue;
            record.change24h = finalChange;
            record.currency = assetCurrency;
          });
        } else {
          // Create new asset
          await database.get('portfolio').create((record: any) => {
            record._raw.id = generateUUID();
            record.name = name;
            record.assetType = assetType;
            record.symbol = symbol.toUpperCase();
            record.quantity = qty;
            record.investedAmount = amt;
            record.value = finalValue;
            record.change24h = finalChange;
            record.currency = assetCurrency;
            record.userId = session?.user?.id || 'anonymous';
          });
        }
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to save portfolio asset:', error);
      Alert.alert('Error', 'Failed to save asset. Please try again.');
    } finally {
      setIsSaving(false);
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
        <Text className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
          {asset ? 'Manage Asset' : 'Add New Wealth'}
        </Text>
        <Text className={`text-sm font-medium mt-1 uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
           Track your growing net worth
        </Text>
      </View>

      <View className="gap-y-5">
        {/* Name Input */}
        <View className={`rounded-[24px] p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
          <Text className={`text-[10px] font-black uppercase mb-1 tracking-widest pl-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
            Asset Name (e.g. My Savings, Apple Stock)
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter name..."
            placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
            style={{ includeFontPadding: false }}
            className={`text-lg font-bold px-2 h-14 py-2 ${isDark ? 'text-white' : 'text-black'}`}
          />
        </View>

        {(assetType === 'stock' || assetType === 'crypto') && (
          <View className="flex-row gap-x-4">
            <View className={`flex-[2] rounded-[24px] p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
              <Text className={`text-[10px] font-black uppercase mb-1 tracking-widest pl-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                Ticker Symbol (e.g. AAPL, BTCUSDT)
              </Text>
              <TextInput
                value={symbol}
                onChangeText={setSymbol}
                placeholder="Search symbol..."
                placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                autoCapitalize="characters"
                style={{ includeFontPadding: false }}
                className={`text-lg font-bold px-2 h-14 py-2 ${isDark ? 'text-white' : 'text-black'}`}
              />
            </View>
            <View className={`flex-1 rounded-[24px] p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
              <Text className={`text-[10px] font-black uppercase mb-1 tracking-widest pl-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                Quantity
              </Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="1"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                keyboardType="numeric"
                style={{ includeFontPadding: false }}
                className={`text-lg font-bold px-2 h-14 py-2 ${isDark ? 'text-white' : 'text-black'}`}
              />
            </View>
          </View>
        )}

        <View className="flex-row gap-x-4">
          {/* Invested Amount Input - Always Show */}
          <View className={`flex-1 rounded-[24px] p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
            <Text className={`text-[10px] font-black uppercase mb-1 tracking-widest pl-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
              {`Total Invested (${currentSymbol})`}
            </Text>
            <TextInput
              value={investedAmount}
              onChangeText={setInvestedAmount}
              placeholder="0.00"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
              keyboardType="numeric"
              style={{ includeFontPadding: false }}
              className={`text-lg font-bold px-2 h-14 py-2 ${isDark ? 'text-white' : 'text-black'}`}
            />
          </View>

          {assetType !== 'stock' && assetType !== 'crypto' && (
            <View className={`flex-1 rounded-[24px] p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
              <Text className={`text-[10px] font-black uppercase mb-1 tracking-widest pl-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                {assetType === 'cash' ? 'Current Balance' : 'Current Value'} ({currentSymbol})
              </Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="0.00"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                keyboardType="numeric"
                style={{ includeFontPadding: false }}
                className="text-lg font-bold text-primary px-2 h-14 py-2"
              />
            </View>
          )}
        </View>

        {/* Change 24h Input - Only for manual assets */}
        {assetType !== 'stock' && assetType !== 'crypto' && assetType !== 'cash' && (
          <View className={`rounded-[24px] p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
            <Text className={`text-[10px] font-black uppercase mb-1 tracking-widest pl-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
              24 Hour Performance (%)
            </Text>
            <TextInput
              value={change24h}
              onChangeText={setChange24h}
              placeholder="0.00"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
              keyboardType="numeric"
              style={{ includeFontPadding: false }}
              className={`text-lg font-bold px-2 h-14 py-2 ${parseFloat(change24h) >= 0 ? 'text-primary' : 'text-destructive'}`}
            />
          </View>
        )}

        {/* Asset Type Selector */}
        <View className="gap-y-3">
          <Text className={`text-[10px] font-black uppercase tracking-widest pl-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ASSET_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => setAssetType(type.id)}
                className={`flex-row items-center gap-x-2 px-4 py-3 rounded-2xl border ${assetType === type.id ? 'bg-primary/20 border-primary/40' : (isDark ? 'bg-white/5 border-white/5 opacity-50' : 'bg-black/5 border-black/5 opacity-50')}`}
              >
                <IconSymbol name={type.icon as any} size={14} color={assetType === type.id ? '#10b981' : (isDark ? '#fff' : '#000')} />
                <Text className={`text-[10px] font-black uppercase tracking-widest ${assetType === type.id ? 'text-primary' : (isDark ? 'text-white' : 'text-black')}`}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Asset Currency Selector */}
        <View className="gap-y-3">
          <Text className={`text-[10px] font-black uppercase tracking-widest pl-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
            Asset Currency
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ columnGap: 8 }}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                onPress={() => setAssetCurrency(c.code)}
                className={`px-4 py-3 rounded-2xl border ${assetCurrency === c.code ? 'bg-primary/20 border-primary/40' : (isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5')}`}
              >
                <Text className={`text-sm font-black ${assetCurrency === c.code ? 'text-primary' : (isDark ? 'text-white/60' : 'text-black/60')}`}>{c.symbol}</Text>
                <Text className={`text-[8px] font-black uppercase tracking-widest ${assetCurrency === c.code ? 'text-primary/60' : (isDark ? 'text-white/30' : 'text-black/30')}`}>{c.code}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="flex-row gap-x-4 mt-8">
           <TouchableOpacity 
             onPress={onCancel}
             className={`flex-1 rounded-2xl p-5 items-center border ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}
           >
              <Text className={`font-black text-[12px] uppercase tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>Discard</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             onPress={handleSubmit}
             disabled={isSaving}
             className={`flex-1 bg-primary rounded-2xl p-5 items-center shadow-lg shadow-primary/20 ${isSaving ? 'opacity-70' : ''}`}
           >
              {isSaving ? (
                <Text className="text-primary-foreground font-black text-[12px] uppercase tracking-widest">Saving...</Text>
              ) : (
                <Text className="text-primary-foreground font-black text-[12px] uppercase tracking-widest">
                  {asset ? 'Update' : 'Commit Asset'}
                </Text>
              )}
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
