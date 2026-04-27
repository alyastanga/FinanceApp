import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AIMode } from '../lib/llama-service';

interface AIContextType {
  aiMode: AIMode;
  setAiMode: (mode: AIMode) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

/**
 * AIProvider manages the global state for AI preference (Cloud vs Local).
 * It persists the choice to AsyncStorage to ensure it survives app reloads.
 */
export function AIProvider({ children }: { children: React.ReactNode }) {
  const [aiMode, setAiModeState] = useState<AIMode>('cloud');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load persisted preference on mount
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('ai_mode');
        if (saved === 'cloud' || saved === 'local') {
          setAiModeState(saved as AIMode);
        }
      } catch (e) {
        console.error('[AI Context] Failed to load preference:', e);
      } finally {
        setLoading(false);
      }
    };
    loadPreference();
  }, []);

  const setAiMode = async (mode: AIMode) => {
    setAiModeState(mode);
    try {
      await AsyncStorage.setItem('ai_mode', mode);
    } catch (e) {
      console.error('[AI Context] Failed to save preference:', e);
    }
  };

  return (
    <AIContext.Provider value={{ aiMode, setAiMode }}>
      {children}
    </AIContext.Provider>
  );
}

/**
 * Hook to access global AI preferences anywhere in the app.
 */
export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
