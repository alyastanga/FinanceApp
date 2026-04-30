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
  }
];
