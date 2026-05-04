import { PasswordInput } from '@/components/ui/PasswordInput';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

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

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check your email', 'We have sent a password reset link to your email.');
    }
    setLoading(false);
  }

  return (
    <View className={`flex-1 justify-center px-6 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <View className="mb-12 items-center">
        <View className={`h-16 w-16 rounded-[24px] items-center justify-center mb-6 ${isDark ? 'bg-[#10b98110]' : 'bg-[#10b98105]'} border ${isDark ? 'border-[#10b98120]' : 'border-[#10b98110]'}`}>
          <Image
            source={require('../../assets/images/logo.png')}
            className="w-10 h-10"
            style={{ resizeMode: 'contain' }}
          />
        </View>
        <Text className={`text-4xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Penance</Text>
        <Text className={`mt-2 font-medium ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Sign in to track your wealth</Text>
      </View>

      <View className="space-y-6">
        <View>
          <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Email</Text>
          <TextInput
            className={`border rounded-xl px-4 py-3.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            placeholder="email@address.com"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "#94a3b8"}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>

        <View>
          <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Password</Text>
          <PasswordInput
            className="flex-1 text-base"
            containerClass={`border rounded-xl px-4 py-1.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            placeholder="••••••••"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "#94a3b8"}
            value={password}
            onChangeText={setPassword}
            isDark={isDark}
            style={{ color: isDark ? 'white' : '#0f172a' }}
          />
          <TouchableOpacity onPress={handleForgotPassword} className="mt-2 self-end">
            <Text className="text-primary/60 text-[9px] font-black uppercase tracking-widest">Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="mt-12 gap-y-6">
        <TouchableOpacity
          className="bg-primary rounded-xl py-4 items-center shadow-lg shadow-primary/20"
          onPress={signInWithEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={isDark ? "#050505" : "white"} />
          ) : (
            <Text className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-[#050505]' : 'text-white'}`}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-primary/20 rounded-xl py-4 items-center"
          onPress={() => router.push('/signup')}
          disabled={loading}
        >
          <Text className="text-primary font-black uppercase tracking-widest text-xs">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
