import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { PasswordInput } from '@/components/ui/PasswordInput';

export default function LoginScreen() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    else Alert.alert('Check your email for the confirmation link!');
    setLoading(false);
  }

  return (
    <View className={`flex-1 justify-center px-6 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <View className="mb-8 items-center">
        <Text className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>FinanceApp</Text>
        <Text className={`mt-2 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Sign in to track your wealth</Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className={`text-sm font-medium mb-1 ml-1 ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Email</Text>
          <TextInput
            className={`border rounded-xl px-4 py-3 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            placeholder="email@address.com"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "#94a3b8"}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>

        <View>
          <Text className={`text-sm font-medium mb-1 ml-1 ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Password</Text>
          <PasswordInput
            className="flex-1 text-base"
            containerClass={`border rounded-xl px-4 py-1.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            placeholder="••••••••"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "#94a3b8"}
            value={password}
            onChangeText={setPassword}
            isDark={isDark}
            style={{ color: isDark ? 'white' : '#0f172a' }}
          />
        </View>
      </View>

      <View className="mt-8 space-y-3">
        <TouchableOpacity
          className="bg-primary rounded-xl py-4 items-center shadow-sm"
          onPress={signInWithEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={isDark ? "white" : "black"} />
          ) : (
            <Text className={`font-semibold text-lg ${isDark ? 'text-[#050505]' : 'text-white'}`}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-primary rounded-xl py-4 items-center"
          onPress={signUpWithEmail}
          disabled={loading}
        >
          <Text className="text-primary font-semibold text-lg">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
