import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SecurityContextType {
  isLocked: boolean;
  isBiometricsEnabled: boolean;
  toggleBiometrics: (enabled: boolean) => Promise<void>;
  authenticate: () => Promise<boolean>;
  canAuthenticate: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const BIOMETRICS_KEY = '@app_biometrics_enabled';

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [canAuthenticate, setCanAuthenticate] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    loadSettings();
    checkCompatibility();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(BIOMETRICS_KEY);
      const isEnabled = saved === 'true';
      setIsBiometricsEnabled(isEnabled);
      // If enabled, lock the app initially
      if (isEnabled) {
        setIsLocked(true);
      }
    } catch (e) {
      console.error('Failed to load security settings', e);
    }
  };

  const checkCompatibility = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setCanAuthenticate(compatible && enrolled);
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // Lock app when it goes to background if biometrics are enabled
    if (
      appState.current.match(/active/) &&
      (nextAppState === 'background' || nextAppState === 'inactive')
    ) {
      if (isBiometricsEnabled) {
        setIsLocked(true);
      }
    }
    appState.current = nextAppState;
  };

  const toggleBiometrics = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Verify before enabling
        const success = await authenticateInternal();
        if (!success) return;
      }
      
      await AsyncStorage.setItem(BIOMETRICS_KEY, enabled.toString());
      setIsBiometricsEnabled(enabled);
    } catch (e) {
      console.error('Failed to toggle biometrics', e);
    }
  };

  const authenticateInternal = async (): Promise<boolean> => {
    try {
      const results = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Finance Intelligence',
        fallbackLabel: 'Enter Passcode',
        disableDeviceFallback: false,
      });

      return results.success;
    } catch (e) {
      console.error('Authentication error', e);
      return false;
    }
  };

  const authenticate = async (): Promise<boolean> => {
    const success = await authenticateInternal();
    if (success) {
      setIsLocked(false);
    }
    return success;
  };

  return (
    <SecurityContext.Provider 
      value={{ 
        isLocked, 
        isBiometricsEnabled, 
        toggleBiometrics, 
        authenticate, 
        canAuthenticate 
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
