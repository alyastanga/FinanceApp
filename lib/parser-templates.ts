export interface ParsedTransaction {
  amount: number;
  date: number; // timestamp
  category: string;
  description: string;
  external_id: string;
  type: 'income' | 'expense';
}

export interface ParserTemplate {
  name: string;
  senders: string[];
  patterns: {
    regex: RegExp;
    handler: (match: RegExpMatchArray) => ParsedTransaction | null;
  }[];
}

export const PARSER_TEMPLATES: ParserTemplate[] = [
  {
    name: 'Maya',
    senders: ['no-reply@maya.ph', 'notifications@maya.ph'],
    patterns: [
      {
        // Real-time notification pattern (Estimated)
        // "You've paid PHP 268.00 to GADC... Ref No. 605911221108"
        regex: /paid\sPHP\s?([\d,]+\.\d{2})\sto\s(.*?)(?:\sRef(?:\sNo)?\.?\s?(\d+))?$/i,
        handler: (match) => ({
          amount: parseFloat(match[1].replace(/,/g, '')),
          date: Date.now(), // Real-time notification
          category: 'Shopping', // Default or AI refined
          description: match[2].trim(),
          external_id: match[3] || `maya-${Date.now()}`,
          type: 'expense',
        }),
      },
      {
        // Statement Line Pattern (from screenshot)
        // 1 Mar 2026 09:11:14 PM Purchased using card GADC... 605911221108 -PHP 268.00
        regex: /(\d{1,2}\s+\w{3}\s+\d{4})\s+(?:[\d:]+\s+[APM]{2})\s+(.*?)\s+(.*?)\s+([A-Z0-9]{10,})\s+(-?PHP|PHP)\s*([\d,]+\.\d{2})/i,
        handler: (match) => {
          const date = new Date(match[1]).getTime();
          const isExpense = match[5].includes('-');
          return {
            amount: parseFloat(match[6].replace(/,/g, '')),
            date: isNaN(date) ? Date.now() : date,
            category: isExpense ? 'General' : 'Income',
            description: `${match[2]} - ${match[3]}`.trim(),
            external_id: match[4],
            type: isExpense ? 'expense' : 'income',
          };
        }
      }
    ]
  },
  {
    name: 'BDO',
    senders: ['bdo-alerts@bdo.com.ph', 'no-reply@bdo.com.ph'],
    patterns: [
      {
        // "transaction with amount of PHP 1,000.00 was made... at [Place]"
        regex: /amount\sof\s(?:PHP|USD)\s?([\d,]+\.\d{2})\swas\smade\s(?:on|at)\s(.*?)(?:\.|\son|$)/i,
        handler: (match) => ({
          amount: parseFloat(match[1].replace(/,/g, '')),
          date: Date.now(),
          category: 'General',
          description: `BDO: ${match[2].trim()}`,
          external_id: `bdo-${Date.now()}`,
          type: 'expense',
        }),
      }
    ]
  },
  {
    name: 'BPI',
    senders: ['expressonline@bpi.com.ph', 'notifications@bpi.com.ph'],
    patterns: [
      {
        // "payment of PHP 500.00 to [Merchant]"
        regex: /payment\sof\s(?:PHP|USD)\s?([\d,]+\.\d{2})\sto\s(.*?)\son/i,
        handler: (match) => ({
          amount: parseFloat(match[1].replace(/,/g, '')),
          date: Date.now(),
          category: 'Bills',
          description: `BPI: ${match[2].trim()}`,
          external_id: `bpi-${Date.now()}`,
          type: 'expense',
        }),
      }
    ]
  },
  {
    name: 'GoTyme',
    senders: ['no-reply@gotyme.com.ph', 'notifications@gotyme.com.ph'],
    patterns: [
      {
        // "You've spent PHP 150.00 at [Place]"
        regex: /spent\s(?:PHP|USD)\s?([\d,]+\.\d{2})\sat\s(.*?)(?:\.|using|$)/i,
        handler: (match) => ({
          amount: parseFloat(match[1].replace(/,/g, '')),
          date: Date.now(),
          category: 'Shopping',
          description: `GoTyme: ${match[2].trim()}`,
          external_id: `gotyme-${Date.now()}`,
          type: 'expense',
        }),
      }
    ]
  },
  {
    name: 'Maribank',
    senders: ['notifications@maribank.sg', 'no-reply@maribank.sg'],
    patterns: [
      {
        // "successfully paid SGD 20.00 to [Merchant]"
        regex: /paid\s(?:SGD|PHP|USD)\s?([\d,]+\.\d{2})\sto\s(.*?)(?:\.|$)/i,
        handler: (match) => ({
          amount: parseFloat(match[1].replace(/,/g, '')),
          date: Date.now(),
          category: 'General',
          description: `Maribank: ${match[2].trim()}`,
          external_id: `maribank-${Date.now()}`,
          type: 'expense',
        }),
      }
    ]
  },
  {
    name: 'Shopee',
    senders: ['info@shopee.ph', 'no-reply@shopee.ph'],
    patterns: [
      {
        // "Payment for Order [ID] ... amount of PHP 299.00"
        regex: /amount\sof\s(?:PHP|USD)\s?([\d,]+\.\d{2})\shas\sbeen\sconfirmed/i,
        handler: (match) => ({
          amount: parseFloat(match[1].replace(/,/g, '')),
          date: Date.now(),
          category: 'Shopping',
          description: 'Shopee Purchase',
          external_id: `shopee-${Date.now()}`,
          type: 'expense',
        }),
      }
    ]
  },
  {
    name: 'Lazada',
    senders: ['member@lazada.com.ph', 'no-reply@lazada.com.ph'],
    patterns: [
      {
        // "Order #[ID] placed for PHP 450.00"
        regex: /placed\sfor\s(?:PHP|USD)\s?([\d,]+\.\d{2})/i,
        handler: (match) => ({
          amount: parseFloat(match[1].replace(/,/g, '')),
          date: Date.now(),
          category: 'Shopping',
          description: 'Lazada Purchase',
          external_id: `lazada-${Date.now()}`,
          type: 'expense',
        }),
      }
    ]
  },
  {
    name: 'Utilities',
    senders: [
      'no-reply@meralco.com.ph', 
      'notifications@mayniladwater.com.ph', 
      'no-reply@pldt.com.ph', 
      'customercare@convergeict.com'
    ],
    patterns: [
      {
        // "payment of PHP 1,500.00 ... received"
        regex: /payment\sof\s(?:PHP|USD)\s?([\d,]+\.\d{2}).*?received/i,
        handler: (match) => ({
          amount: parseFloat(match[1].replace(/,/g, '')),
          date: Date.now(),
          category: 'Bills',
          description: 'Utility Bill Payment',
          external_id: `util-${Date.now()}`,
          type: 'expense',
        }),
      }
    ]
  },
  {
    name: 'Universal',
    senders: [], // Matches by keyword instead of specific sender
    patterns: [
      {
        // "Spent/Paid [Currency] [Amount] at [Place]"
        regex: /(?:spent|paid|purchased)\s(?:[A-Z]{3}|[$€£₱])\s?([\d,]+\.\d{2})\s(?:at|to)\s(.*?)(?:\.|$)/i,
        handler: (match) => ({
          amount: parseFloat(match[1].replace(/,/g, '')),
          date: Date.now(),
          category: 'General',
          description: match[2].trim(),
          external_id: `univ-exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'expense',
        }),
      },
      {
        // "Received [Currency] [Amount] from [Sender]"
        regex: /(?:received|credited)\s(?:[A-Z]{3}|[$€£₱])\s?([\d,]+\.\d{2})\sfrom\s(.*?)(?:\.|$)/i,
        handler: (match) => ({
          amount: parseFloat(match[1].replace(/,/g, '')),
          date: Date.now(),
          category: 'Income',
          description: match[2].trim(),
          external_id: `univ-inc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'income',
        }),
      }
    ]
  }
];
