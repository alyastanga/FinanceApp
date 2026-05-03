import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  format: (val: number, fromCurrency?: string, decimals?: number) => string;
  /** Format a value that has already been converted to the display currency (no conversion applied) */
  formatRaw: (val: number, decimals?: number) => string;
  /** Format a value with suffix (K/M) but WITHOUT the symbol */
  formatValue: (val: number, decimals?: number) => string;
  /** Convert a value from a specific source currency to the current display currency */
  convertFrom: (val: number, fromCurrency: string) => number;
  /** Get the symbol for any supported currency code */
  symbolFor: (code: string) => string;
  /** Proactively fetch and cache exchange rates for a list of currencies */
  refreshRates: (currencies: string[]) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

/**
 * Rate cache to avoid redundant API calls for currency pairs we've already fetched.
 * Key format: "FROM->TO", value: exchange rate.
 */
const rateCache: Record<string, number> = {};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>('PHP');
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      let saved = await AsyncStorage.getItem('user_currency');
      
      // If no saved preference or defaulted to USD erroneously, detect via IP address
      if (!saved || saved === 'USD') {
        console.log('[CurrencyContext] Detecting via IP...');
        const detected = await fetchCurrencyByIP();
        if (detected in CURRENCY_MAP) {
          saved = detected;
          await AsyncStorage.setItem('user_currency', detected);
          console.log(`[CurrencyContext] Set currency from IP detection: ${detected}`);
        } else {
          saved = 'PHP';
          await AsyncStorage.setItem('user_currency', 'PHP');
          console.log(`[CurrencyContext] IP-detected currency (${detected}) not supported. Defaulting to PHP.`);
        }
      }

      if (saved && saved in CURRENCY_MAP) {
        setCurrencyState(saved as CurrencyCode);
        // Exchange rate is relative to PHP as the universal base for stored values
        const rate = await fetchExchangeRate(saved as CurrencyCode);
        setExchangeRate(rate);
        rateCache[`PHP->${saved}`] = rate;
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
      rateCache[`PHP->${code}`] = rate;
      
      console.log(`[CurrencyContext] Successfully switched to ${code} (Rate: ${rate})`);
    } catch (error) {
      console.error(`[CurrencyContext] Failed to switch to ${code}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const convert = (val: number) => val * exchangeRate;

  /**
   * Convert a value from a specific source currency to the current display currency.
   * Uses cached rates when available to minimize API calls.
   * This is a synchronous function that uses pre-fetched cached rates.
   */
  const convertFrom = useCallback((val: number, fromCurrency: string): number => {
    if (fromCurrency === currency) return val;
    
    // Check if we have a cached rate for this pair
    const cacheKey = `${fromCurrency}->${currency}`;
    if (rateCache[cacheKey]) {
      return val * rateCache[cacheKey];
    }
    
    // If both are relative to PHP, we can compute the cross rate
    const fromToPHP = rateCache[`PHP->${fromCurrency}`];
    const toToPHP = rateCache[`PHP->${currency}`];
    
    if (fromToPHP && toToPHP) {
      // Cross rate: fromCurrency -> PHP -> toCurrency
      const crossRate = toToPHP / fromToPHP;
      rateCache[cacheKey] = crossRate;
      return val * crossRate;
    }
    
    // Fallback: if no cached rate, return unconverted (rates will be fetched async)
    return val;
  }, [currency]);

  /**
   * Proactively fetch and cache exchange rates for a list of currencies.
   * This ensures that convertFrom has the necessary data in its cache.
   */
  const refreshRates = useCallback(async (currencies: string[]) => {
    const unique = [...new Set(currencies)].filter(c => c !== currency && !!c);
    if (unique.length === 0) return;

    try {
      await Promise.all(unique.map(async (c) => {
        // If we don't have the PHP pair for this currency, fetch it
        // Storing PHP pairs allows us to compute cross-rates easily
        if (!rateCache[`PHP->${c}`]) {
          const rate = await fetchExchangeRate(c);
          rateCache[`PHP->${c}`] = rate;
          console.log(`[CurrencyContext] Cached rate: PHP->${c} = ${rate}`);
        }
      }));
    } catch (error) {
      console.warn('[CurrencyContext] Failed to refresh some rates:', error);
    }
  }, [currency]);

  /**
   * Pre-fetch and cache exchange rate for a specific currency pair.
   * Call this when loading portfolio data to ensure convertFrom works.
   */
  useEffect(() => {
    // Pre-cache the current currency rate
    if (currency !== 'PHP') {
      rateCache[`PHP->${currency}`] = exchangeRate;
    }
  }, [currency, exchangeRate]);

  const symbolFor = useCallback((code: string): string => {
    return CURRENCY_MAP[code as CurrencyCode]?.symbol || code;
  }, []);

  const getFormattedValue = (val: number, decimals: number) => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1000000) return { sign, value: (absVal / 1000000).toFixed(1), suffix: 'M' };
    if (absVal >= 1000) return { sign, value: (absVal / 1000).toFixed(1), suffix: 'K' };
    return { sign, value: absVal.toFixed(decimals), suffix: '' };
  };

  const format = (val: number, fromCurrency?: string, decimals: number = 0) => {
    const converted = (fromCurrency && fromCurrency !== currency) 
      ? convertFrom(val, fromCurrency) 
      : (fromCurrency ? val : convert(val));

    const { sign, value, suffix } = getFormattedValue(converted, decimals);
    return `${sign}${CURRENCY_MAP[currency].symbol}${value}${suffix}`;
  };

  const formatRaw = (val: number, decimals: number = 0) => {
    const { sign, value, suffix } = getFormattedValue(val, decimals);
    return `${sign}${CURRENCY_MAP[currency].symbol}${value}${suffix}`;
  };

  const formatValue = (val: number, decimals: number = 0) => {
    const { sign, value, suffix } = getFormattedValue(val, decimals);
    return `${sign}${value}${suffix}`;
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
        format,
        formatRaw,
        formatValue,
        convertFrom,
        symbolFor,
        refreshRates,
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
