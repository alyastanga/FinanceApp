import 'react-native-get-random-values';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AIProvider } from '../context/AIContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import database from '../database';
import '../global.css';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';

// Polyfills
if (typeof (global as any).setImmediate === 'undefined') {
  (global as any).setImmediate = (fn: any) => setTimeout(fn, 0);
}

if (typeof (global as any).process.nextTick === 'undefined') {
  (global as any).process.nextTick = (global as any).setImmediate;
}

import { ThemeProvider, useTheme } from '../context/ThemeContext';

/**
 * RootLayout is the definitive entry point.
 * AuthProvider wraps everything so useAuth() is available to RootLayoutNav.
 * DatabaseProvider makes WatermelonDB available to all screens.
 */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AIProvider>
          <CurrencyProvider>
            <DatabaseProvider database={database}>
              <RootLayoutNav />
            </DatabaseProvider>
          </CurrencyProvider>
        </AIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * RootLayoutNav gates the entire app behind auth resolution.
 * 
 * KEY INSIGHT: expo-router pre-renders ALL tab screens during mount.
 * We must gate the Stack so it doesn't even ATTEMPT to mount protected screens
 * until we know the session state.
 */
function RootLayoutNav() {
  const { session, loading } = useAuth();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [isNavReady, setIsNavReady] = React.useState(false);

  React.useLayoutEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
      setIsNavReady(false);
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
      setIsNavReady(false);
    } else {
      // If we are where we're supposed to be, signal that navigation is ready
      // Use a frame delay to ensure native navigator is fully ready
      const handle = requestAnimationFrame(() => {
        setIsNavReady(true);
      });
      return () => cancelAnimationFrame(handle);
    }
  }, [session, loading, segments, router]);

  const inAuthGroup = segments[0] === '(auth)';
  const needsRedirect = (!session && !inAuthGroup) || (session && inAuthGroup);

  // Strictly gate the navigation tree
  if (loading || needsRedirect || !isNavReady) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#050505' : '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
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
  );
}
