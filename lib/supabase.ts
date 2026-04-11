import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

/**
 * Custom storage adapter for Supabase that handles both Web (cookies)
 * and Mobile (AsyncStorage), while providing SSR-safety for Node environments.
 */
const isServer = typeof window === 'undefined'

const SupabaseStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isServer) return null
    
    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') return null
      const value = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${key}=`))
        ?.split('=')[1]
      return value ? decodeURIComponent(value) : null
    }
    
    return await AsyncStorage.getItem(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isServer) return

    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') return
      // Set cookie with 1 year expiration and Path=/
      document.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`
    } else {
      await AsyncStorage.setItem(key, value)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (isServer) return

    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') return
      // Expire cookie immediately
      document.cookie = `${key}=; Max-Age=0; Path=/; SameSite=Lax`
    } else {
      await AsyncStorage.removeItem(key)
    }
  }
}

// These are your provided credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SupabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
})
