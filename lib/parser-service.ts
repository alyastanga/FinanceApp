import { Q } from '@nozbe/watermelondb';
import database from '../database';
import { generateAIResponse } from './ai-service';
import { PARSER_TEMPLATES, ParsedTransaction } from './parser-templates';

/**
 * Main service to convert raw email content into structured transactions
 * with robust de-duplication and fallback logic.
 */
export async function processEmailToTransaction(email: { 
  body: string, 
  from: string, 
  messageId: string 
}): Promise<{ status: 'success' | 'duplicate' | 'failed', data?: ParsedTransaction }> {
  
  // 1. De-duplication Check
  // We check both incomes and expenses for this external_id (Message-ID or Bank Ref)
  const existingIncome = await database.get('incomes').query(Q.where('external_id', email.messageId)).fetch();
  const existingExpense = await database.get('expenses').query(Q.where('external_id', email.messageId)).fetch();
  
  if (existingIncome.length > 0 || existingExpense.length > 0) {
    return { status: 'duplicate' };
  }

  // 2. Try Template Parsing (Fast & Offline-Ready)
  for (const template of PARSER_TEMPLATES) {
    const isFromBank = template.senders.some(s => email.from.toLowerCase().includes(s.toLowerCase()));
    if (isFromBank || template.name === 'Maya') { // Added manual check for Maya statement text
      for (const pattern of template.patterns) {
        const match = email.body.match(pattern.regex);
        if (match) {
          const parsed = pattern.handler(match);
          if (parsed) {
            // Check if the handler returned a unique refId that we should also check for duplicates
            if (parsed.external_id && parsed.external_id !== email.messageId) {
               const dupCheck = await database.get(parsed.type === 'income' ? 'incomes' : 'expenses')
                 .query(Q.where('external_id', parsed.external_id))
                 .fetch();
               if (dupCheck.length > 0) return { status: 'duplicate' };
            }
            return { status: 'success', data: parsed };
          }
        }
      }
    }
  }

  // 3. AI Fallback (Slow but Flexible)
  try {
    const aiPrompt = `Extract transaction details from this bank notification email.
    Email Body: "${email.body}"
    
    Return ONLY a JSON object:
    {
      "amount": number,
      "date": timestamp,
      "category": "Food|Housing|Transport|etc",
      "description": "Short summary",
      "type": "income"|"expense"
    }`;

    const response = await generateAIResponse([{ role: 'user', content: aiPrompt }], false, 'consultant');
    
    // Attempt to extract JSON from AI response
    const jsonMatch = response.match(/\{.*\}/s);
    if (jsonMatch) {
      const aiParsed = JSON.parse(jsonMatch[0]);
      return { 
        status: 'success', 
        data: {
          ...aiParsed,
          external_id: email.messageId // Use email ID as fallback unique key
        } 
      };
    }
  } catch (err) {
    console.error('AI Parsing Fallback Error:', err);
  }

  return { status: 'failed' };
}
