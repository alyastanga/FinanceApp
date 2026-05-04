import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { seedDatabase } from '../_tests_dev/seed';
import { CurrencyCode, useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { CustomAlert } from '../components/ui/CustomAlert';

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
      CustomAlert.alert("Success", "Database seeded with mock financial data.");
    } else {
      CustomAlert.alert("Error", "Seeding failed. Check console for details.");
    }
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      {/* Navigation Bar */}
      <View className="pt-20 px-gsd-lg pb-gsd-lg flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className={`z-10 h-gsd-huge w-gsd-huge rounded-gsd-md items-center justify-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
        >
          <IconSymbol name="chevron.left" size={18} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-black'} tracking-tighter`}>Settings</Text>
        </View>
        <View className="w-gsd-huge" />
      </View>

      <ScrollView className="flex-1 w-full" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>

        {/* Financial Context */}
        <View className="mb-gsd-md">
          <Text className={`text-[10px] font-black uppercase tracking-[3px] ml-gsd-sm mb-gsd-sm ${isDark ? 'text-white/30' : 'text-black/30'}`}>Financial Context</Text>
          <TouchableOpacity
            onPress={() => setShowPicker(!showPicker)}
            className={`w-full rounded-gsd-md p-gsd-lg border flex-row items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}
          >
            <View className="flex-row items-center gap-x-gsd-md">
              <View className="h-gsd-huge w-gsd-huge bg-blue-500/20 rounded-gsd-sm items-center justify-center">
                <Text className="text-blue-500 font-black text-xs">{symbol}</Text>
              </View>
              <View>
                <Text className={`font-black uppercase tracking-widest text-[9px] ${isDark ? 'text-white' : 'text-black'}`}>
                  Primary Currency
                </Text>
                <Text className={`font-bold text-[9px] mt-0.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
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
        <Text className={`text-[10px] font-black uppercase tracking-[3px] ml-gsd-sm mb-gsd-xs ${isDark ? 'text-white/30' : 'text-black/30'}`}>Infrastructure</Text>

        <TouchableOpacity
          onPress={() => router.push('/model-settings')}
          className={`w-full rounded-gsd-md p-gsd-lg border flex-row items-center justify-between mb-gsd-sm ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}
        >
          <View className="flex-row items-center gap-x-gsd-md">
            <View className="h-gsd-huge w-gsd-huge bg-[#10b981]/20 rounded-gsd-sm items-center justify-center">
              <IconSymbol name="cpu.fill" size={16} color="#10b981" />
            </View>
            <Text className={`font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              AI Local Engine
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color="#10b981" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSeed}
          className={`w-full rounded-gsd-md p-gsd-lg border flex-row items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}
        >
          <View className="flex-row items-center gap-x-gsd-md opacity-40">
            <View className={`h-gsd-huge w-gsd-huge rounded-gsd-sm items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
              <IconSymbol name="bolt.fill" size={16} color={isDark ? "white" : "black"} />
            </View>
            <Text className={`font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-white' : 'text-black'}`}>
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
      </ScrollView>
    </View>
  );
}
