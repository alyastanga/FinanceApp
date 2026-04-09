import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { seedDatabase } from '../_tests_dev/seed';
import { CurrencyCode, useCurrency } from '../context/CurrencyContext';

export default function Settings() {
  const router = useRouter();
  const { currency, setCurrency, loading, symbol } = useCurrency();
  const [showPicker, setShowPicker] = useState(false);

  const SUPPORTED: { code: CurrencyCode, label: string }[] = [
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'GBP', label: 'British Pound (£)' },
    { code: 'JPY', label: 'Japanese Yen (¥)' },
    { code: 'PHP', label: 'Philippine Peso (₱)' },
    { code: 'CAD', label: 'Canadian Dollar (C$)' },
    { code: 'AUD', label: 'Australian Dollar (A$)' },
  ];

  const handleSeed = async () => {
    const success = await seedDatabase();
    if (success) {
      Alert.alert("Success", "Database seeded with mock financial data.");
    } else {
      Alert.alert("Error", "Seeding failed. Check console for details.");
    }
  };

  return (
    <View className="flex-1 items-center bg-[#050505] p-6 pt-20">
      <Text className="text-3xl font-black text-white tracking-tighter">Settings</Text>
      <Text className="mt-2 text-[10px] text-white/40 font-black uppercase tracking-[2px]">
        App Infrastructure & Debug
      </Text>

      <View className="mt-12 w-full gap-y-4">
        {/* Financial Context */}
        <View className="mb-4">
          <Text className="text-[10px] font-black text-white/30 uppercase tracking-[3px] ml-6 mb-4">Financial Context</Text>
          <TouchableOpacity
            onPress={() => setShowPicker(!showPicker)}
            className="w-full rounded-[24px] bg-white/[0.03] p-6 border border-white/5 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-x-4">
              <View className="h-8 w-8 bg-blue-500/20 rounded-xl items-center justify-center">
                <Text className="text-blue-500 font-black text-xs">{symbol}</Text>
              </View>
              <View>
                <Text className="text-white font-black uppercase tracking-widest text-[10px]">
                  Primary Currency
                </Text>
                <Text className="text-white/40 font-bold text-[10px] mt-0.5">
                  {currency} (Displaying converted rates)
                </Text>
              </View>
            </View>
            <IconSymbol name={showPicker ? "chevron.up" : "chevron.down"} size={14} color="white" style={{ opacity: 0.4 }} />
          </TouchableOpacity>

          {showPicker && (
            <View className="mt-4 gap-y-2 px-2">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {SUPPORTED.map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    onPress={() => {
                      setCurrency(item.code);
                      setShowPicker(false);
                    }}
                    className={`px-6 py-4 rounded-[20px] border ${currency === item.code ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/5'}`}
                  >
                    <Text className={`font-black text-[10px] uppercase tracking-widest ${currency === item.code ? 'text-primary' : 'text-white/40'}`}>
                      {item.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Infrastructure */}
        <Text className="text-[10px] font-black text-white/30 uppercase tracking-[3px] ml-6 mb-2">Infrastructure</Text>

        <TouchableOpacity
          onPress={() => router.push('/model-settings')}
          className="w-full rounded-[24px] bg-white/[0.03] p-6 border border-white/5 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-x-4">
            <View className="h-8 w-8 bg-[#10b981]/20 rounded-xl items-center justify-center">
              <IconSymbol name="cpu.fill" size={16} color="#10b981" />
            </View>
            <Text className="text-white/60 font-black uppercase tracking-widest text-xs">
              AI Local Engine
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color="#10b981" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSeed}
          className="w-full rounded-[24px] bg-white/[0.03] p-6 border border-white/5 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-x-4 opacity-40">
            <View className="h-8 w-8 bg-white/10 rounded-xl items-center justify-center">
              <IconSymbol name="bolt.fill" size={16} color="white" />
            </View>
            <Text className="text-white font-black uppercase tracking-widest text-xs">
              Seed Database
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color="white" style={{ opacity: 0.2 }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 w-full rounded-[24px] bg-white/5 p-6 items-center border border-white/10"
        >
          <Text className="text-white font-black uppercase tracking-widest text-xs">
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
