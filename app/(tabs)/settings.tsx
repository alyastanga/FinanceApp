import React from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AIToggle } from '@/components/ui/AIToggle';
import { useAI } from '../../context/AIContext';
import { seedDatabase } from '../../_tests_dev/seed';
import { clearAllUserData } from '../../lib/data-management';

export default function SettingsScreen() {
  const { aiMode, setAiMode } = useAI();
  const [isDarkMode, setIsDarkMode] = React.useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const handleSeed = async () => {
    Alert.alert(
      "Seed Database",
      "This will wipe all current local data and replace it with mock data for testing. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Seed", 
          style: "destructive",
          onPress: async () => {
            const success = await seedDatabase();
            if (success) {
              Alert.alert("Success", "Database seeded with Mission Control mock data.");
            } else {
              Alert.alert("Error", "Seeding failed. Check console for details.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={['top']}>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="pt-6 mb-8">
          <Text className="text-3xl font-black text-white mb-2">Settings</Text>
          <Text className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
            Preferences & Account
          </Text>
        </View>

        <View className="mb-8">
           <Text className="text-xs font-black text-white uppercase tracking-widest ml-2 mb-4">Preferences</Text>
           <View className="bg-[#151515] rounded-[32px] border border-white/5 overflow-hidden">
             
             <View className="flex-row items-center justify-between p-5 border-b border-white/5">
                <View className="flex-row items-center gap-x-3">
                   <IconSymbol name="moon.fill" size={20} color="rgba(255,255,255,0.7)" />
                   <Text className="text-white font-medium text-base">Dark Mode</Text>
                </View>
                <Switch 
                  value={isDarkMode} 
                  onValueChange={setIsDarkMode}
                  trackColor={{ false: "#333", true: "#10b981" }}
                />
             </View>

             <View className="p-5 border-b border-white/5">
                <View className="flex-row items-center justify-between mb-3">
                   <View className="flex-row items-center gap-x-3">
                      <IconSymbol name="sparkles" size={20} color="#8b5cf6" />
                      <Text className="text-white font-medium text-base">AI Intelligence</Text>
                   </View>
                   <AIToggle mode={aiMode} onToggle={setAiMode} />
                </View>
                <Text className="text-[10px] text-muted-foreground leading-4">
                  {aiMode === 'cloud' 
                    ? 'Cloud Mode uses high-performance models for complex budgeting analysis.' 
                    : 'Local Mode uses on-device inference for maximum privacy and offline stability.'}
                </Text>
             </View>

             <View className="flex-row items-center justify-between p-5">
                <View className="flex-row items-center gap-x-3">
                   <IconSymbol name="bell.fill" size={20} color="rgba(255,255,255,0.7)" />
                   <Text className="text-white font-medium text-base">Notifications</Text>
                </View>
                <Switch 
                  value={notificationsEnabled} 
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: "#333", true: "#10b981" }}
                />
             </View>

           </View>
        </View>

        <View className="mb-8">
           <Text className="text-xs font-black text-white uppercase tracking-widest ml-2 mb-4">Integrations</Text>
           <View className="bg-[#151515] rounded-[32px] border border-white/5 overflow-hidden">
             
             <TouchableOpacity className="flex-row items-center justify-between p-5 border-b border-white/5">
                <View className="flex-row items-center gap-x-3">
                   <IconSymbol name="calendar.badge.plus" size={20} color="#10b981" />
                   <View>
                      <Text className="text-white font-medium text-base">Connect Google Calendar</Text>
                      <Text className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Available in Pro</Text>
                   </View>
                </View>
                <IconSymbol name="chevron.right" size={20} color="rgba(255,255,255,0.3)" />
             </TouchableOpacity>

           </View>
        </View>

        <View className="mb-8">
           <Text className="text-xs font-black text-white uppercase tracking-widest ml-2 mb-4">Account</Text>
           <View className="bg-[#151515] rounded-[32px] border border-white/5 overflow-hidden">
             
             <TouchableOpacity className="flex-row items-center justify-between p-5 border-b border-white/5">
                <View className="flex-row items-center gap-x-3">
                   <IconSymbol name="person.fill" size={20} color="rgba(255,255,255,0.7)" />
                   <Text className="text-white font-medium text-base">Profile Security</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color="rgba(255,255,255,0.3)" />
             </TouchableOpacity>

             <TouchableOpacity className="flex-row items-center justify-between p-5 border-b border-white/5">
                <View className="flex-row items-center gap-x-3">
                   <IconSymbol name="arrow.down.doc.fill" size={20} color="rgba(255,255,255,0.7)" />
                   <Text className="text-white font-medium text-base">Export Data</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color="rgba(255,255,255,0.3)" />
             </TouchableOpacity>

             <TouchableOpacity 
               onPress={async () => {
                 Alert.alert(
                   "Nuclear Option",
                   "This will PERMANENTLY delete all financial data from both your local device and your Supabase cloud account. This cannot be undone. Are you absolutely sure?",
                   [
                     { text: "Cancel", style: "cancel" },
                     { 
                       text: "Wipe Everything", 
                       style: "destructive",
                       onPress: async () => {
                         const success = await clearAllUserData();
                         if (success) {
                           Alert.alert("Data Wiped", "All local and cloud financial records have been removed.");
                         } else {
                           Alert.alert("Partial Success", "Local data cleared, but some cloud records could not be reached.");
                         }
                       }
                     }
                   ]
                 );
               }}
               className="flex-row items-center justify-between p-5"
             >
                <View className="flex-row items-center gap-x-3">
                   <IconSymbol name="trash.fill" size={20} color="#ef4444" />
                   <Text className="text-destructive font-bold text-base">Clear Database</Text>
                </View>
             </TouchableOpacity>

           </View>
        </View>

        <View className="mb-20">
           <Text className="text-xs font-black text-white uppercase tracking-widest ml-2 mb-4">Developer Tools</Text>
           <View className="bg-[#151515] rounded-[32px] border border-white/5 overflow-hidden">
             <TouchableOpacity 
               onPress={handleSeed}
               className="flex-row items-center justify-between p-5"
             >
                <View className="flex-row items-center gap-x-3">
                   <IconSymbol name="hammer.fill" size={20} color="#10b981" />
                   <View>
                      <Text className="text-[#10b981] font-bold text-base">Seed Database</Text>
                      <Text className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Generate Mock Data</Text>
                   </View>
                </View>
             </TouchableOpacity>
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
