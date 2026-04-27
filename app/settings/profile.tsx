import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { clearActiveDEK } from '../../lib/key-manager';

export default function ProfileSettingsScreen() {
  const { isDark } = useTheme();
  const [user, setUser] = useState<any>(null);

  const textClass = isDark ? 'text-white' : 'text-neutral-900';
  const subTextClass = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const bgClass = isDark ? 'bg-[#050505]' : 'bg-neutral-50';
  const cardBgClass = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const borderClass = isDark ? 'border-white/5' : 'border-neutral-200';

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out? This will also lock your encryption vault for security.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Clear session key from memory
              clearActiveDEK();
              
              // 2. Sign out from Supabase
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              
              // 3. Redirect to login
              router.replace('/login');
            } catch (error: any) {
              Alert.alert("Logout Failed", error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`} edges={['top']}>
      <View className="px-6 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className={`p-2 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
          <IconSymbol name="chevron.left" size={24} color={isDark ? "white" : "black"} />
        </TouchableOpacity>
        <Text className={`text-xl font-bold ${textClass}`}>Profile Settings</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-6 mt-8">
        <View className="items-center mb-10">
          <View className={`w-24 h-24 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500/10'} items-center justify-center border-4 ${borderClass}`}>
            <IconSymbol name="person.fill" size={48} color="#10b981" />
          </View>
          <Text className={`text-2xl font-bold mt-4 ${textClass}`}>
            {user?.email?.split('@')[0] || 'User'}
          </Text>
          <Text className={`${subTextClass} text-sm`}>{user?.email}</Text>
        </View>

        <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden mb-8`}>
          <View className={`p-5 border-b ${borderClass}`}>
            <Text className={`${subTextClass} text-xs uppercase tracking-widest font-black mb-1`}>User ID</Text>
            <Text className={`${textClass} font-mono text-xs`}>{user?.id}</Text>
          </View>
          
          <View className={`p-5 border-b ${borderClass}`}>
            <Text className={`${subTextClass} text-xs uppercase tracking-widest font-black mb-1`}>Login Method</Text>
            <Text className={`${textClass} font-medium`}>Email & Password</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500/10 py-5 rounded-[32px] border border-red-500/20 items-center flex-row justify-center gap-x-3"
        >
          <IconSymbol name="arrow.left.square.fill" size={20} color="#f87171" />
          <Text className="text-red-400 font-bold text-base">Logout</Text>
        </TouchableOpacity>
        
        <Text className={`text-center mt-6 ${subTextClass} text-[10px] uppercase tracking-[2px] font-black`}>
          Zero-Knowledge Finance v1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
