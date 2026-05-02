import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { seedDatabase } from '../_tests_dev/seed';
import { CurrencyCode, useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const router = useRouter();
  const { currency, setCurrency, loading, symbol } = useCurrency();
  const { isDark } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

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
    <View className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <LinearGradient
        colors={isDark ? ['#10b98108', 'transparent'] : ['#10b98103', 'transparent']}
        className="absolute inset-0"
      />
      
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Navigation Bar */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className={`h-10 w-10 rounded-xl items-center justify-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
          >
            <IconSymbol name="chevron.left" size={20} color={isDark ? "white" : "black"} />
          </TouchableOpacity>
          <Text className={`text-xl font-black ${textClass} tracking-tighter`}>Settings</Text>
          <View className="w-10" />
        </View>

        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        >
          <View className="mt-4 mb-10 items-center">
            <View className={`h-16 w-16 rounded-[24px] ${isDark ? 'bg-white/5' : 'bg-black/5'} items-center justify-center border ${isDark ? 'border-white/5' : 'border-black/5'} mb-4`}>
              <IconSymbol name="gearshape.fill" size={28} color="#10b981" />
            </View>
            <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-[3px]`}>
              Infrastructure & Debug
            </Text>
          </View>

          <View className="gap-y-8">
            {/* Context Section */}
            <View>
              <Text className={`text-[10px] font-black uppercase tracking-[2px] ${isDark ? 'text-white/20' : 'text-black/30'} mb-4 ml-1`}>Financial Context</Text>
              <TouchableOpacity
                onPress={() => setShowPicker(!showPicker)}
                activeOpacity={0.7}
                className={`w-full rounded-[28px] p-5 border flex-row items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.02] border-black/5'}`}
              >
                <View className="flex-row items-center gap-x-4">
                  <View className="h-10 w-10 bg-primary/10 rounded-2xl items-center justify-center border border-primary/20">
                    <Text className="text-primary font-black text-xs">{symbol}</Text>
                  </View>
                  <View>
                    <Text className={`font-black uppercase tracking-widest text-[9px] ${textClass}`}>Primary Currency</Text>
                    <Text className={`font-bold text-[11px] mt-0.5 ${subTextClass}`}>{currency}</Text>
                  </View>
                </View>
                <IconSymbol name={showPicker ? "chevron.up" : "chevron.down"} size={14} color={isDark ? "white" : "black"} style={{ opacity: 0.3 }} />
              </TouchableOpacity>

              {showPicker && (
                <View className="mt-3">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {SUPPORTED.map((item) => (
                      <TouchableOpacity
                        key={item.code}
                        onPress={() => {
                          setCurrency(item.code);
                          setShowPicker(false);
                        }}
                        className={`px-5 py-3 rounded-2xl border ${currency === item.code ? 'bg-primary border-primary' : (isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5')}`}
                      >
                        <Text className={`font-black text-[10px] uppercase tracking-widest ${currency === item.code ? (isDark ? 'text-[#050505]' : 'text-white') : subTextClass}`}>
                          {item.code}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Engine Section */}
            <View>
              <Text className={`text-[10px] font-black uppercase tracking-[2px] ${isDark ? 'text-white/20' : 'text-black/30'} mb-4 ml-1`}>System Engines</Text>
              
              <View className="gap-y-3">
                <TouchableOpacity
                  onPress={() => router.push('/model-settings')}
                  activeOpacity={0.7}
                  className={`w-full rounded-[28px] p-5 border flex-row items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.02] border-black/5'}`}
                >
                  <View className="flex-row items-center gap-x-4">
                    <View className={`h-10 w-10 rounded-2xl items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                      <IconSymbol name="cpu.fill" size={18} color="#10b981" />
                    </View>
                    <View>
                      <Text className={`font-black uppercase tracking-widest text-[9px] ${textClass}`}>AI Intelligence</Text>
                      <Text className={`font-bold text-[11px] mt-0.5 ${subTextClass}`}>Local Inference Engine</Text>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={isDark ? "white" : "black"} style={{ opacity: 0.3 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSeed}
                  activeOpacity={0.7}
                  className={`w-full rounded-[28px] p-5 border flex-row items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.02] border-black/5'}`}
                >
                  <View className="flex-row items-center gap-x-4">
                    <View className={`h-10 w-10 rounded-2xl items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                      <IconSymbol name="bolt.fill" size={18} color={isDark ? "white" : "black"} style={{ opacity: 0.4 }} />
                    </View>
                    <View>
                      <Text className={`font-black uppercase tracking-widest text-[9px] ${textClass}`}>Data Simulation</Text>
                      <Text className={`font-bold text-[11px] mt-0.5 ${subTextClass}`}>Seed Mock Database</Text>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={isDark ? "white" : "black"} style={{ opacity: 0.3 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
