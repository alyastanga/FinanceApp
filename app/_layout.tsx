import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import database from '../database';
import '../global.css';
import React, { useState, useEffect } from 'react';
// Skia is now initialized at the index.web.js entry point.

// Polyfills
if (typeof (global as any).setImmediate === 'undefined') {
  (global as any).setImmediate = (fn: any) => setTimeout(fn, 0);
}

if (typeof (global as any).process.nextTick === 'undefined') {
  (global as any).process.nextTick = (global as any).setImmediate;
}

export default function RootLayout() {
  return (
    <DatabaseProvider database={database}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'Settings' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'System Info' }} />
      </Stack>
    </DatabaseProvider>
  );
}
