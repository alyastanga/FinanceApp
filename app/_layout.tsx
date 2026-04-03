import 'react-native-get-random-values';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { AuthProvider, useAuth } from '../context/AuthContext';
import database from '../database';
import '../global.css';
import React, { useEffect } from 'react';

// Polyfills
if (typeof (global as any).setImmediate === 'undefined') {
  (global as any).setImmediate = (fn: any) => setTimeout(fn, 0);
}

if (typeof (global as any).process.nextTick === 'undefined') {
  (global as any).process.nextTick = (global as any).setImmediate;
}

/**
 * RootLayout is the definitive entry point.
 * It provides the providers and then renders the router itself.
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <DatabaseProvider database={database}>
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

        {/* This sibling ensures the navigation context is ready for redirection hooks */}
        <AuthRedirectHandler />
      </DatabaseProvider>
    </AuthProvider>
  );
}

/**
 * AuthRedirectHandler sits alongside the Stack (as a sibling) inside the AuthProvider.
 * It handles the logic of forcing users to the login screen or main app.
 */
function AuthRedirectHandler() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait until auth state is confirmed
    if (loading) return;

    // segments[0] is the root directory (tabs or auth)
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Not logged in, and not in the auth screens, redirect to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Logged in, but in the auth screens, redirect to the main app
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  return null;
}
