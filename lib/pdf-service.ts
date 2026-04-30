import { Q } from '@nozbe/watermelondb';
import database from '../database';
import { PARSER_TEMPLATES } from './parser-templates';
import { processEmailToTransaction } from './parser-service';

/**
 * Service to handle PDF statement parsing with password support.
 */
export const PDFService = {
  
  /**
   * Attempts to parse a PDF statement.
   * Note: In a real environment, this would use a native library like 
   * react-native-pdf-lib or a JS library like pdfjs-dist.
   */
  async parseStatement(uri: string, password?: string): Promise<{ success: boolean, count: number, error?: string }> {
    try {
      if (password && password === 'wrong') {
        throw new Error('Invalid Password');
      }

      // Simulate PDF text extraction. 
      // In a real app, this would be: const fullText = await PDFLib.extract(uri, password);
      let fullText = "";
      
      // If it's a Maya statement, we simulate some lines
      if (uri.toLowerCase().includes('maya')) {
        fullText = `
          01 Mar 2026 09:11:14 PM Purchased using card GADC... 605911221108 -PHP 268.00
          02 Mar 2026 10:15:00 AM Cash-in via Bank 1234567890 PHP 1,000.00
          05 Mar 2026 02:45:22 PM Payment to Meralco 9876543210 -PHP 1,500.50
        `;
      }

      const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let count = 0;

      // Note: PARSER_TEMPLATES, database, and Q are imported at the top

      for (const line of lines) {
        for (const template of PARSER_TEMPLATES) {
          if (template.name === 'Maya') {
            for (const pattern of template.patterns) {
              const match = line.match(pattern.regex);
              if (match) {
                const parsed = pattern.handler(match);
                if (parsed) {
                  // Check for duplicates
                  const existing = await database.get(parsed.type === 'income' ? 'incomes' : 'expenses')
                    .query(Q.where('external_id', parsed.external_id))
                    .fetch();
                  
                  if (existing.length === 0) {
                    await database.write(async () => {
                      await database.get(parsed.type === 'income' ? 'incomes' : 'expenses').create((record: any) => {
                        record.amount = parsed.amount;
                        record.category = parsed.category || 'General';
                        record.description = parsed.description || '';
                        record.createdAt = new Date(parsed.date);
                        record.externalId = parsed.external_id; // Match model field name
                        record.userId = 'default_user';
                      });
                    });
                    count++;
                  }
                }
              }
            }
          }
        }
      }
      
      return { success: true, count };
    } catch (err: any) {
      console.error('PDF Parse Error:', err);
      return { success: false, count: 0, error: err.message };
    }
  },

  /**
   * Helper to check if a PDF is encrypted without needing a full parse.
   */
  async isEncrypted(uri: string): Promise<boolean> {
     // Mock check: Most bank PDFs are encrypted
     return true;
  }
};
