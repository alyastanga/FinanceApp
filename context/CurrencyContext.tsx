import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchExchangeRate, fetchCurrencyByIP } from '@/lib/market-service';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'PHP' | 'CAD' | 'AUD';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'PHP', symbol: '₱' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'AUD', symbol: 'A$' },
];

const CURRENCY_MAP = SUPPORTED_CURRENCIES.reduce((acc, curr) => {
  acc[curr.code] = curr;
  return acc;
}, {} as Record<CurrencyCode, CurrencyInfo>);

interface CurrencyContextType {
  currency: CurrencyCode;
  symbol: string;
  exchangeRate: number;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  loading: boolean;
  convert: (val: number) => number;
  format: (val: number, decimals?: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      let saved = await AsyncStorage.getItem('user_currency');
      
      // If no saved preference, try IP-based detection
      if (!saved) {
        console.log('[CurrencyContext] No saved currency found. Detecting via IP...');
        const detected = await fetchCurrencyByIP();
        if (detected in CURRENCY_MAP) {
          saved = detected;
          await AsyncStorage.setItem('user_currency', detected);
          console.log(`[CurrencyContext] Defaulting to IP-detected currency: ${detected}`);
        } else {
          saved = 'USD';
          await AsyncStorage.setItem('user_currency', 'USD');
          console.log(`[CurrencyContext] IP-detected currency (${detected}) not supported. Defaulting to USD.`);
        }
      }

      if (saved && saved in CURRENCY_MAP) {
        setCurrencyState(saved as CurrencyCode);
        const rate = await fetchExchangeRate(saved as CurrencyCode);
        setExchangeRate(rate);
      }
    } catch (e) {
      console.error('Failed to load currency settings', e);
    } finally {
      setLoading(false);
    }
  };

  const setCurrency = async (code: CurrencyCode) => {
    setLoading(true);
    try {
      console.log(`[CurrencyContext] Switching to ${code}...`);
      const rate = await fetchExchangeRate(code);
      
      await AsyncStorage.setItem('user_currency', code);
      setExchangeRate(rate);
      setCurrencyState(code);
      
      console.log(`[CurrencyContext] Successfully switched to ${code} (Rate: ${rate})`);
    } catch (error) {
      console.error(`[CurrencyContext] Failed to switch to ${code}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const convert = (val: number) => val * exchangeRate;

  const format = (val: number, decimals: number = 0) => {
    const converted = convert(val);
    const absVal = Math.abs(converted);
    const symbol = CURRENCY_MAP[currency].symbol;
    const sign = converted < 0 ? '-' : '';

    if (absVal >= 1000000) {
      return `${sign}${symbol}${(absVal / 1000000).toFixed(1)}M`;
    }
    if (absVal >= 1000) {
      return `${sign}${symbol}${(absVal / 1000).toFixed(1)}K`;
    }
    return `${sign}${symbol}${absVal.toFixed(decimals)}`;
  };

  return (
    <CurrencyContext.Provider 
      value={{ 
        currency, 
        symbol: CURRENCY_MAP[currency].symbol, 
        exchangeRate, 
        setCurrency, 
        loading,
        convert,
        format 
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
