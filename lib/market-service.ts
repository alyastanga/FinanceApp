const FINNHUB_API_KEY = process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

export interface MarketQuote {
  currentPrice: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

/**
 * Fetches real-time quote data for a given symbol (Stock or Crypto) using Finnhub.
 * Symbols should be in Finnhub format (e.g., 'AAPL', 'BINANCE:BTCUSDT').
 */
export const fetchMarketQuote = async (symbol: string): Promise<MarketQuote | null> => {
  if (!FINNHUB_API_KEY) {
    console.error('Finnhub API Key is missing. Please set EXPO_PUBLIC_FINNHUB_API_KEY in .env');
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
    const data = await response.json();

    if (!data || data.c === 0 || data.c === null) {
      console.warn(`No market data found for symbol: ${symbol}`);
      return null;
    }

    return {
      currentPrice: data.c,
      change: data.d,
      percentChange: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
    };
  } catch (error) {
    console.error(`Error fetching market quote for ${symbol}:`, error);
    return null;
  }
};

/**
 * Utility to batch fetch quotes (serialized to avoid rate limits on free tier if needed)
 */
export const fetchMultipleQuotes = async (symbols: string[]): Promise<Record<string, MarketQuote>> => {
  const results: Record<string, MarketQuote> = {};

  // Using Promise.all for speed, but be wary of rate limits (30 requests/sec with free key usually)
  const promises = symbols.map(async (symbol) => {
    const quote = await fetchMarketQuote(symbol);
    if (quote) {
      results[symbol] = quote;
    }
  });

  await Promise.all(promises);
  return results;
};

/**
 * Fetches the exchange rate from USD to a target currency.
 * Uses Finnhub's Forex quote endpoint (e.g., OANDA:USD_PHP).
 * Default rate is 1.0 (USD to USD).
 */
export const fetchExchangeRate = async (toCurrency: string): Promise<number> => {
  if (toCurrency === 'USD') return 1.0;

  // 1. Primary: Frankfurter Dev API (Free, high-availability, no key required)
  try {
    const fResponse = await fetch(`https://api.frankfurter.dev/v1/latest?from=USD&to=${toCurrency}`);
    const fData = await fResponse.json();
    if (fData && fData.rates && fData.rates[toCurrency]) {
      const rate = fData.rates[toCurrency];
      console.log(`[MarketService] Exchange rate for ${toCurrency} found via Frankfurter: ${rate}`);
      return rate;
    }
  } catch (error) {
    console.warn(`[MarketService] Frankfurter API failed for ${toCurrency}:`, error);
  }

  // 2. Secondary: Finnhub Fallback (If key and access allow)
  if (!FINNHUB_API_KEY) return 1.0;

  const pairs = [
    `FX:USD${toCurrency}`,
    `PHYSICAL:USD/${toCurrency}`,
    `OANDA:USD_${toCurrency}`,
    `FX_PIDC:USD-${toCurrency}`
  ];

  for (const symbol of pairs) {
    try {
      const response = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
      const data = await response.json();

      if (data && data.c > 0) {
        console.log(`[MarketService] Exchange rate for ${toCurrency} found via Finnhub (${symbol}): ${data.c}`);
        return data.c;
      }
    } catch (error) {
      console.warn(`[MarketService] Finnhub fallback failed via ${symbol}:`, error);
    }
  }

  console.error(`[MarketService] All exchange rate lookups failed for ${toCurrency}. Defaulting to 1.0`);
  return 1.0;
};

/**
 * Detects the user's local currency based on their IP address.
 * Uses ipapi.co (Free tier). Fallbacks to USD.
 */
export const fetchCurrencyByIP = async (): Promise<string> => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch('https://ipapi.co/currency/', { signal: controller.signal });
    clearTimeout(id);

    const currency = await response.text();
    if (currency && currency.length === 3) {
      console.log(`[MarketService] IP-based currency detection: ${currency}`);
      return currency.toUpperCase();
    }
    return 'USD';
  } catch (error) {
    console.warn('[MarketService] IP currency detection failed or timed out. Defaulting to USD.');
    return 'USD';
  }
};
