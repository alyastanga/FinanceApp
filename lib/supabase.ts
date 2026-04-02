import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

/**
 * Custom storage adapter for Supabase that uses browser cookies on Web
 * and AsyncStorage as a fallback on Mobile.
 */
const CookieStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      const value = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${key}=`))
        ?.split('=')[1]
      return value ? decodeURIComponent(value) : null
    }
    return await AsyncStorage.getItem(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      // Set cookie with 1 year expiration and Path=/
      document.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`
    } else {
      await AsyncStorage.setItem(key, value)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      // Expire cookie immediately
      document.cookie = `${key}=; Max-Age=0; Path=/; SameSite=Lax`
    } else {
      await AsyncStorage.removeItem(key)
    }
  }
}

// These are your provided credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://djjozvxisluwggukukpkl.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqam96dnhpc2x1d2dndWt1cGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDYzODUsImV4cCI6MjA5MDY4MjM4NX0.GfVUA0CaxpH51Yx4oGXAmL0sSK0nMwgQB_Fpp6ruCX4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: CookieStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
})
