import { PasswordInput } from '@/components/ui/PasswordInput';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { CustomAlert } from '../../components/ui/CustomAlert';

export default function SignUpScreen() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUpWithEmail() {
    if (password !== confirmPassword) {
      CustomAlert.alert('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      CustomAlert.alert('Error', error.message);
    } else {
      CustomAlert.alert('Check your email', 'We have sent a confirmation link to your email address.');
      router.back();
    }
    setLoading(false);
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 40 }}
      >
        <View className="mb-12 items-center">
          <View className={`h-16 w-16 rounded-[24px] items-center justify-center mb-6 ${isDark ? 'bg-[#10b98110]' : 'bg-[#10b98105]'} border ${isDark ? 'border-[#10b98120]' : 'border-[#10b98110]'}`}>
            <Image
              source={require('../../assets/images/logo.png')}
              className="w-10 h-10"
              style={{ resizeMode: 'contain' }}
            />
          </View>
          <Text className={`text-4xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Penance</Text>
          <Text className={`mt-2 font-medium ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Start your journey to wealth</Text>
        </View>

        <View className="space-y-6">
          <View>
            <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Email Address</Text>
            <TextInput
              className={`border rounded-xl px-4 py-3.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              placeholder="email@address.com"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "#94a3b8"}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View>
            <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Create Password</Text>
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
          </View>

          <View>
            <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Confirm Password</Text>
            <PasswordInput
              className="flex-1 text-base"
              containerClass={`border rounded-xl px-4 py-1.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              placeholder="••••••••"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "#94a3b8"}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isDark={isDark}
              style={{ color: isDark ? 'white' : '#0f172a' }}
            />
          </View>
        </View>

        <View className="mt-12 gap-y-4">
          <TouchableOpacity
            className="bg-primary rounded-xl py-4 items-center shadow-lg shadow-primary/20"
            onPress={signUpWithEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={isDark ? "#050505" : "white"} />
            ) : (
              <Text className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-[#050505]' : 'text-white'}`}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="py-2 items-center"
            onPress={() => router.back()}
          >
            <Text className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-black/40'}`}>
              Already have an account? <Text className="text-primary">Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
