import Papa from 'papaparse';

export interface CSVMapping {
  dateHeader: string;
  sourceHeader: string;
  amountHeader: string;
  type?: 'auto' | 'income' | 'expense'; // Force a type or detect by sign
}

export interface ParsedTransaction {
  amount: number;
  source: string;
  createdAt: Date;
  type: 'income' | 'expense';
}

/**
 * Parses raw CSV text and returns headers for mapping
 */
export const getCSVHeaders = (csvText: string): string[] => {
  const result = Papa.parse(csvText, { header: true, preview: 1 });
  return result.meta.fields || [];
};

/**
 * Heuristic to guess default column mappings
 */
export const guessMappings = (headers: string[]): Partial<CSVMapping> => {
  const mapping: Partial<CSVMapping> = {};
  
  headers.forEach(h => {
    const low = h.toLowerCase();
    if (low.includes('date')) mapping.dateHeader = h;
    if (low.includes('desc') || low.includes('source') || low.includes('name') || low.includes('memo')) {
      mapping.sourceHeader = h;
    }
    if (low.includes('amount') || low.includes('value') || low.includes('price') || low.includes('total')) {
      mapping.amountHeader = h;
    }
  });

  return mapping;
};

/**
 * Transforms CSV rows into ParsedTransaction objects based on mapping
 */
export const transformRows = (
  csvText: string, 
  mapping: CSVMapping
): ParsedTransaction[] => {
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const data = result.data as any[];

  return data.map(row => {
    const rawAmount = parseFloat(row[mapping.amountHeader].replace(/[^\d.-]/g, ''));
    const rawDate = row[mapping.dateHeader];
    
    // Determine type
    let type: 'income' | 'expense' = 'expense';
    if (mapping.type === 'income') type = 'income';
    else if (mapping.type === 'expense') type = 'expense';
    else {
      // Auto-detect: positive is usually income in bank exports if 'negative' is spend
      // But some banks use positive for everything and separate 'Credit/Debit' columns.
      // For v1, we assume negative = expense, positive = income.
      type = rawAmount < 0 ? 'expense' : 'income';
    }

    return {
      amount: Math.abs(rawAmount),
      source: row[mapping.sourceHeader] || 'Uncategorized',
      createdAt: new Date(rawDate),
      type
    };
  }).filter(t => !isNaN(t.amount) && !isNaN(t.createdAt.getTime()));
};

/**
 * Converts array of transactions to CSV string
 */
export const generateCSV = (incomes: any[], expenses: any[]): string => {
  const data = [
    ...incomes.map(i => {
      const d = i.createdAt instanceof Date ? i.createdAt : new Date(i.createdAt);
      const isEpoch = d.getFullYear() === 2026;
      
      return {
        'Date': (isEpoch ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0]).trim(),
        'Type': 'Income',
        'Category': 'Revenue',
        'Description': (i.source || 'Income').trim(),
        'Amount (USD)': i.amount.toFixed(2)
      };
    }),
    ...expenses.map(e => {
      const d = e.createdAt instanceof Date ? e.createdAt : new Date(e.createdAt);
      const isEpoch = d.getFullYear() === 2026;

      return {
        'Date': (isEpoch ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0]).trim(),
        'Type': 'Expense',
        'Category': (e.category || 'Maintenance').trim(),
        'Description': 'General Expense',
        'Amount (USD)': (-e.amount).toFixed(2)
      };
    })
  ].sort((a, b) => b.Date.localeCompare(a.Date));

  return Papa.unparse(data).trim();
};
