import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
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
    <View className="flex-1 justify-center px-6 bg-slate-50">
      <View className="mb-8 items-center">
        <Text className="text-4xl font-bold text-slate-900">FinanceApp</Text>
        <Text className="text-slate-500 mt-2">Sign in to track your wealth</Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-sm font-medium text-slate-700 mb-1 ml-1">Email</Text>
          <TextInput
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
            placeholder="email@address.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-slate-700 mb-1 ml-1">Password</Text>
          <TextInput
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
          />
        </View>
      </View>

      <View className="mt-8 space-y-3">
        <TouchableOpacity
          className="bg-blue-600 rounded-xl py-4 items-center shadow-sm"
          onPress={signInWithEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-blue-600 rounded-xl py-4 items-center"
          onPress={signUpWithEmail}
          disabled={loading}
        >
          <Text className="text-blue-600 font-semibold text-lg">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
