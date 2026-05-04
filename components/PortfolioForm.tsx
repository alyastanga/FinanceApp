import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import database from '../database';
import Portfolio from '../database/models/Portfolio';
import { IconSymbol } from './ui/icon-symbol';
import { useAuth } from '../context/AuthContext';
import { SUPPORTED_CURRENCIES, useCurrency } from '../context/CurrencyContext';
import { generateUUID } from '../lib/id-utils';
import { useTheme } from '../context/ThemeContext';
import { CustomAlert } from './ui/CustomAlert';

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
      CustomAlert.alert('Error', 'Please fill in all required fields.');
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
      CustomAlert.alert('Error', 'Failed to save asset. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!asset) return;
    
    CustomAlert.alert(
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
              CustomAlert.alert('Error', 'Failed to delete asset.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="gap-y-6" showsVerticalScrollIndicator={false}>
      <View>
        <Text className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
          {asset ? 'Manage Asset' : 'Add New Wealth'}
        </Text>
        <Text className={`text-xs font-medium mt-0.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
           Track your growing net worth
        </Text>
      </View>

      <View className="gap-y-4">
        {/* Name Input */}
        <View className={`rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
          <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
            Asset Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. My Savings, Apple Stock"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
            style={{ includeFontPadding: false }}
            className={`text-base font-bold px-1 h-10 ${isDark ? 'text-white' : 'text-black'}`}
          />
        </View>

        {(assetType === 'stock' || assetType === 'crypto') && (
          <View className="flex-row gap-x-gsd-sm">
            <View className={`flex-[0.7] rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
              <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                Ticker Symbol
              </Text>
              <TextInput
                value={symbol}
                onChangeText={setSymbol}
                placeholder="e.g. AAPL, BTC"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
                autoCapitalize="characters"
                style={{ includeFontPadding: false }}
                className={`text-base font-bold px-1 h-10 ${isDark ? 'text-white' : 'text-black'}`}
              />
            </View>
            <View className={`flex-[0.3] rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
              <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                Qty
              </Text>
              <View className="flex-row items-center justify-between">
                <TouchableOpacity 
                  onPress={() => setQuantity(prev => Math.max(0, parseFloat(prev || '0') - 1).toString())}
                  className="w-6 h-6 items-center justify-center"
                >
                  <Text className="text-primary font-bold">-</Text>
                </TouchableOpacity>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
                  keyboardType="numeric"
                  textAlign="center"
                  style={{ includeFontPadding: false }}
                  className={`flex-1 text-base font-bold h-10 ${isDark ? 'text-white' : 'text-black'}`}
                />
                <TouchableOpacity 
                  onPress={() => setQuantity(prev => (parseFloat(prev || '0') + 1).toString())}
                  className="w-6 h-6 items-center justify-center"
                >
                  <Text className="text-primary font-bold">+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View className="flex-row gap-x-gsd-sm">
          {/* Invested Amount Input - Always Show */}
          <View className={`flex-1 rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
            <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
              {`Invested (${assetCurrency})`}
            </Text>
            <TextInput
              value={investedAmount}
              onChangeText={setInvestedAmount}
              placeholder="0.00"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
              keyboardType="numeric"
              style={{ includeFontPadding: false }}
              className={`text-base font-bold px-1 h-10 ${isDark ? 'text-white' : 'text-black'}`}
            />
          </View>

          {assetType !== 'stock' && assetType !== 'crypto' && (
            <View className={`flex-1 rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
              <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                {assetType === 'cash' ? 'Current Balance' : 'Current Value'}
              </Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="0.00"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
                keyboardType="numeric"
                style={{ includeFontPadding: false }}
                className="text-base font-bold text-primary px-1 h-10"
              />
            </View>
          )}
        </View>

        {/* Change 24h Input - Only for manual assets */}
        {assetType !== 'stock' && assetType !== 'crypto' && assetType !== 'cash' && (
          <View className={`rounded-xl px-gsd-md py-gsd-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
            <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
              24h Performance (%)
            </Text>
            <TextInput
              value={change24h}
              onChangeText={setChange24h}
              placeholder="0.00"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
              keyboardType="numeric"
              style={{ includeFontPadding: false }}
              className={`text-base font-bold px-1 h-10 ${parseFloat(change24h) >= 0 ? 'text-primary' : 'text-destructive'}`}
            />
          </View>
        )}

        {/* Asset Type Selector */}
        <View className="gap-y-2">
          <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ASSET_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => setAssetType(type.id)}
                className={`flex-row items-center gap-x-2 px-3 py-2 rounded-xl border ${assetType === type.id ? 'bg-primary/10 border-primary/20' : (isDark ? 'border-white/5' : 'border-black/5')}`}
              >
                <IconSymbol name={type.icon as any} size={12} color={assetType === type.id ? '#10b981' : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')} />
                <Text className={`text-[10px] font-bold ${assetType === type.id ? 'text-primary' : (isDark ? 'text-white/40' : 'text-black/40')}`}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Asset Currency Selector */}
        <View className="gap-y-2">
          <Text className={`text-[11px] font-semibold mb-0.5 pl-1 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
            Currency
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ columnGap: 8 }}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                onPress={() => setAssetCurrency(c.code)}
                className={`px-3 py-2 rounded-xl border ${assetCurrency === c.code ? 'bg-primary/10 border-primary/20' : (isDark ? 'border-white/5' : 'border-black/5')}`}
              >
                <View className="flex-row items-center gap-x-1">
                  <Text className={`text-[10px] font-bold ${assetCurrency === c.code ? 'text-primary' : (isDark ? 'text-white/60' : 'text-black/60')}`}>{c.code}</Text>
                  <Text className={`text-[8px] font-medium ${assetCurrency === c.code ? 'text-primary/60' : (isDark ? 'text-white/30' : 'text-black/30')}`}>{c.symbol}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="flex-row gap-x-gsd-md mt-6">
           <TouchableOpacity 
             onPress={onCancel}
             className={`flex-1 rounded-xl p-gsd-md items-center border ${isDark ? 'border-white/10' : 'border-black/10'}`}
           >
              <Text className={`font-black text-[11px] uppercase tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>Discard</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             onPress={handleSubmit}
             disabled={isSaving}
             className={`flex-1 bg-primary rounded-xl p-gsd-md items-center ${isSaving ? 'opacity-70' : ''}`}
           >
              <Text className={`font-black text-[11px] uppercase tracking-widest ${isDark ? 'text-[#050505]' : 'text-white'}`}>
                {isSaving ? 'Processing...' : (asset ? 'Update' : 'Commit')}
              </Text>
           </TouchableOpacity>
        </View>

        {asset && (
           <TouchableOpacity 
             onPress={handleDelete}
             className="w-full rounded-xl p-gsd-md items-center border border-destructive/20 mt-2"
           >
              <Text className="text-destructive font-black text-[11px] uppercase tracking-widest">Terminate Track</Text>
           </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};
