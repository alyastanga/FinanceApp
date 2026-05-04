import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { Stack, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import 'react-native-get-random-values';
import { AIProvider } from '../context/AIContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import database from '../database';
import '../global.css';

// Polyfills
if (typeof (global as any).setImmediate === 'undefined') {
  (global as any).setImmediate = (fn: any) => setTimeout(fn, 0);
}

if (typeof (global as any).process.nextTick === 'undefined') {
  (global as any).process.nextTick = (global as any).setImmediate;
}

// ── Global Network Debugger ──
const originalFetch = global.fetch;
global.fetch = async (...args) => {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
  console.log(`[Network Debug] 🛫 Dispatching fetch to: ${url}`);
  try {
    const result = await originalFetch(...args);
    console.log(`[Network Debug] ✅ Success (${result.status}) from: ${url}`);
    return result;
  } catch (err: any) {
    console.error(`[Network Debug] ❌ FAILED FETC H to: ${url} | Error: ${err.message}`);
    throw err;
  }
};

import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TouchableOpacity } from 'react-native';
import { SecurityProvider, useSecurity } from '../context/SecurityContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SecurityProvider>
        <AuthProvider>
          <AIProvider>
            <CurrencyProvider>
              <DatabaseProvider database={database}>
                <RootLayoutNav />
              </DatabaseProvider>
            </CurrencyProvider>
          </AIProvider>
        </AuthProvider>
      </SecurityProvider>
    </ThemeProvider>
  );
}

function GlassLockScreen() {
  const { authenticate } = useSecurity();
  const { isDark } = useTheme();
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-[#050505]">
      <LinearGradient
        colors={isDark ? ['#050505', '#10b98110', '#050505'] : ['#F5F5F5', '#10b98105', '#F5F5F5']}
        className="absolute inset-0"
      />

      <View className="items-center">
        <View className="h-24 w-24 rounded-[40px] bg-primary/10 items-center justify-center border border-primary/20 mb-8">
          <IconSymbol name="lock.fill" size={40} color="#10b981" />
        </View>

        <Text className={`text-3xl font-black ${isDark ? 'text-white' : 'text-black'} tracking-tighter mb-2`}>
          Secure Entry
        </Text>
        <Text className="text-muted-foreground text-center px-12 mb-10 font-medium">
          Finance Intelligence is locked to protect your data.
        </Text>

        <TouchableOpacity
          onPress={() => authenticate()}
          className="bg-primary px-10 py-4 rounded-[24px] shadow-lg shadow-primary/20 mb-6"
        >
          <Text className="text-[#050505] font-black uppercase tracking-widest text-xs">
            Unlock App
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/onboarding/e2ee-recovery')}
          className="py-2"
        >
          <Text className="text-primary/60 font-black text-[10px] uppercase tracking-[2px]">
            Forgot Passphrase? Recover Vault
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const { isLocked, isBiometricsEnabled } = useSecurity();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  // Handle Auth Redirection
  React.useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    console.log(`[RootLayoutNav] State - Session: ${!!session}, Loading: ${loading}, Segments: ${segments.join('/')}`);

    if (!session && !inAuthGroup) {
      console.log('[RootLayoutNav] Redirecting to /login');
      router.replace('/login');
    } else if (session && inAuthGroup) {
      console.log('[RootLayoutNav] Redirecting to /');
      router.replace('/');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#050505' : '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // Show Lock Screen if app is locked and biometrics are enabled
  // We render this OVER or INSTEAD of the stack to ensure the navigator is mounted
  if (session && isLocked && isBiometricsEnabled) {
    return <GlassLockScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'Settings' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'System Info' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
