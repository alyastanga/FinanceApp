import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { clearActiveDEK } from '../../lib/key-manager';
import { supabase } from '../../lib/supabase';

export default function ProfileSettingsScreen() {
  const { isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const textClass = isDark ? 'text-white' : 'text-neutral-900';
  const subTextClass = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const bgClass = isDark ? 'bg-[#050505]' : 'bg-neutral-50';
  const cardBgClass = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const borderClass = isDark ? 'border-white/5' : 'border-neutral-200';

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      const name = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
      setDisplayName(name);
      setOriginalName(name);
    }
    fetchUser();
  }, []);

  const handleUpdateProfile = async () => {
    if (displayName === originalName) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });

      if (error) throw error;

      setOriginalName(displayName);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (error: any) {
      Alert.alert("Update Failed", error.message);
    } finally {
      setIsUpdating(false);
    }
  };

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
          <View className="flex-row items-center justify-center mt-4 w-full gap-x-2">
            <View className="w-6" />
            <TextInput
              ref={inputRef}
              className={`text-2xl font-bold ${textClass} text-center ${isEditing ? 'border-b border-primary/50' : ''} pb-1`}
              value={displayName}
              onChangeText={setDisplayName}
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
              onSubmitEditing={() => {
                setIsEditing(false);
                Keyboard.dismiss();
                handleUpdateProfile();
              }}
              returnKeyType="done"
              placeholder="Username"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
              style={{ minWidth: 100, maxWidth: '80%' }}
            />
            <TouchableOpacity onPress={() => inputRef.current?.focus()}>
              <IconSymbol name="pencil" size={16} color="#10b981" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
          </View>
          <Text className={`${subTextClass} text-sm mt-1`}>{user?.email}</Text>

          {displayName !== originalName && (
            <TouchableOpacity
              onPress={handleUpdateProfile}
              disabled={isUpdating}
              className="mt-4 bg-primary px-6 py-2 rounded-full"
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#050505" />
              ) : (
                <Text className="text-[#050505] font-black text-[10px] uppercase tracking-widest">Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
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
