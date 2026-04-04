const FINNHUB_API_KEY = 'd78hka9r01qsbhvtsoigd78hka9r01qsbhvtsoj0';
const BASE_URL = 'https://finnhub.io/api/v1';

const symbols = [
  'OANDA:USD_PHP',
  'FX:USDPHP',
  'PHYSICAL:USD/PHP',
  'FX_PIDC:USD-PHP',
  'CC:USDPHP',
  'IDC:USDPHP',
  'ICE:USDPHP',
  'EUR_USD',
  'USD_PHP'
];

async function check() {
  for (const s of symbols) {
    console.log(`Checking ${s}...`);
    try {
      const response = await fetch(`${BASE_URL}/quote?symbol=${s}&token=${FINNHUB_API_KEY}`);
      const data = await response.json();
      console.log(`Result for ${s}:`, JSON.stringify(data));
    } catch (e) {
      console.error(`Error for ${s}:`, e.message);
    }
  }
}

check();
