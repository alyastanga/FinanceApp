import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { seedDatabase } from '../_tests_dev/seed';
import { CurrencyCode, useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const router = useRouter();
  const { currency, setCurrency, loading, symbol } = useCurrency();
  const { isDark } = useTheme();
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
    <View className={`flex-1 items-center p-6 pt-20 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <Text className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>Settings</Text>
      <Text className={`mt-2 text-[10px] font-black uppercase tracking-[2px] ${isDark ? 'text-white/40' : 'text-black/40'}`}>
        App Infrastructure & Debug
      </Text>

      <View className="mt-12 w-full gap-y-4">
        {/* Financial Context */}
        <View className="mb-4">
          <Text className={`text-[10px] font-black uppercase tracking-[3px] ml-6 mb-4 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Financial Context</Text>
          <TouchableOpacity
            onPress={() => setShowPicker(!showPicker)}
            className={`w-full rounded-[24px] p-6 border flex-row items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}
          >
            <View className="flex-row items-center gap-x-4">
              <View className="h-8 w-8 bg-blue-500/20 rounded-xl items-center justify-center">
                <Text className="text-blue-500 font-black text-xs">{symbol}</Text>
              </View>
              <View>
                <Text className={`font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-white' : 'text-black'}`}>
                  Primary Currency
                </Text>
                <Text className={`font-bold text-[10px] mt-0.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  {currency} (Displaying converted rates)
                </Text>
              </View>
            </View>
            <IconSymbol name={showPicker ? "chevron.up" : "chevron.down"} size={14} color={isDark ? "white" : "black"} style={{ opacity: 0.4 }} />
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
                    className={`px-6 py-4 rounded-[20px] border ${currency === item.code ? 'bg-primary/20 border-primary/40' : (isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5')}`}
                  >
                    <Text className={`font-black text-[10px] uppercase tracking-widest ${currency === item.code ? 'text-primary' : (isDark ? 'text-white/40' : 'text-black/40')}`}>
                      {item.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Infrastructure */}
        <Text className={`text-[10px] font-black uppercase tracking-[3px] ml-6 mb-2 ${isDark ? 'text-white/30' : 'text-black/30'}`}>Infrastructure</Text>

        <TouchableOpacity
          onPress={() => router.push('/model-settings')}
          className={`w-full rounded-[24px] p-6 border flex-row items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}
        >
          <View className="flex-row items-center gap-x-4">
            <View className="h-8 w-8 bg-[#10b981]/20 rounded-xl items-center justify-center">
              <IconSymbol name="cpu.fill" size={16} color="#10b981" />
            </View>
            <Text className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              AI Local Engine
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color="#10b981" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSeed}
          className={`w-full rounded-[24px] p-6 border flex-row items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}
        >
          <View className="flex-row items-center gap-x-4 opacity-40">
            <View className={`h-8 w-8 rounded-xl items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
              <IconSymbol name="bolt.fill" size={16} color={isDark ? "white" : "black"} />
            </View>
            <Text className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-white' : 'text-black'}`}>
              Seed Database
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color={isDark ? "white" : "black"} style={{ opacity: 0.2 }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className={`mt-6 w-full rounded-[24px] p-6 items-center border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
        >
          <Text className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-white' : 'text-black'}`}>
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
