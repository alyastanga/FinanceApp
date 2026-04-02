import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { seedDatabase } from '../../_tests_dev/seed';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SettingsScreen() {
  const handleSeed = async () => {
    const success = await seedDatabase();
    if (success) {
      Alert.alert("Success", "Database seeded with mock financial data.");
    } else {
      Alert.alert("Error", "Seeding failed. Check console for details.");
    }
  };

  return (
    <View className="flex-1 bg-[#050505]">
      {/* Premium Header */}
      <View className="pt-20 pb-8 px-8 border-b border-white/5">
        <Text className="text-4xl font-black text-foreground tracking-tighter">Settings</Text>
        <Text className="mt-2 text-sm font-black text-[#10b981] uppercase tracking-[3px] opacity-80">
          Infrastructure & Debug
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-10">
        <View className="gap-y-6">
          <View>
            <Text className="mb-4 text-xs font-black text-white/20 uppercase tracking-[2px] ml-2">Developer Tools</Text>
            
            <TouchableOpacity
              onPress={handleSeed}
              className="w-full rounded-[32px] bg-[#10b981]/10 p-8 border border-[#10b981]/20 flex-row items-center justify-between"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[#10b981] font-black uppercase tracking-widest text-sm mb-1">
                  Seed Database
                </Text>
                <Text className="text-[#10b981]/60 text-xs font-bold leading-5">
                  Populate WatermelonDB with mock transactions for AI context testing.
                </Text>
              </View>
              <View className="h-12 w-12 rounded-full bg-[#10b981]/20 items-center justify-center">
                <IconSymbol name="sparkles" size={20} color="#10b981" />
              </View>
            </TouchableOpacity>
          </View>

          <View className="mt-4 p-8 rounded-[32px] bg-[#151515] border border-white/5">
            <Text className="text-white/40 text-xs font-bold leading-6 italic">
              "This app uses a local-first architecture. Any data you seed stays securely on your device."
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
