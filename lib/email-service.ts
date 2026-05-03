import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { processEmailToTransaction } from './parser-service';
import { addIncome, addExpense } from './transaction-actions';

WebBrowser.maybeCompleteAuthSession();

const LAST_SYNC_KEY = 'bank_email_last_sync_timestamp';
const GMAIL_TOKEN_KEY = 'gmail_oauth_token';

/**
 * Service to manage Gmail connection and automated parsing of upcoming transactions.
 */
export const EmailService = {
  
  /**
   * Initializes sync state. Sets last sync to NOW to ensure only upcoming
   * emails are processed from this point forward.
   */
  async initializeSync() {
    // Look back 30 days on initial connection to populate history
    const thirtyDaysAgo = Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000);
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(thirtyDaysAgo));
  },

  /**
   * Main sync loop:
   * 1. Fetches new messages since last sync
   * 2. Parses each message
   * 3. Saves to DB if valid and not duplicate
   */
  async syncIncomingTransactions() {
    const token = await AsyncStorage.getItem(GMAIL_TOKEN_KEY);
    if (!token) throw new Error('Not connected to Gmail');

    let lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (!lastSync) {
      await this.initializeSync();
      return { processed: 0, status: 'initialized' };
    }

    try {
      // Query Gmail for messages after the last sync timestamp
      // Enhanced query to catch a broader range of financial notifications
      const financialKeywords = '(maya OR uob OR gcash OR bpi OR bdo OR citi OR shopee OR lazada OR meralco OR maynilad OR pldt OR converge OR "bank" OR "transaction" OR "alert" OR "spent" OR "received" OR "confirmed" OR "statement")';
      const query = encodeURIComponent(`after:${lastSync} ${financialKeywords}`);
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const listData = await response.json();
      if (!listData.messages || listData.messages.length === 0) {
        return { processed: 0, status: 'no_new_emails' };
      }

      let count = 0;
      for (const msgRef of listData.messages) {
        const msgDetail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json());

        // Extract body and sender
        const body = this._extractEmailBody(msgDetail);
        const from = msgDetail.payload.headers.find((h: any) => h.name === 'From')?.value || '';
        
        const result = await processEmailToTransaction({
          body,
          from,
          messageId: msgRef.id
        });

        if (result.status === 'success' && result.data) {
          const tx = result.data;
          if (tx.type === 'income') {
            await addIncome({ ...tx, externalId: tx.external_id });
          } else {
            await addExpense({ ...tx, externalId: tx.external_id });
          }
          count++;
        }
      }

      // Update sync time to now
      await AsyncStorage.setItem(LAST_SYNC_KEY, String(Math.floor(Date.now() / 1000)));
      
      return { processed: count, status: 'success' };
    } catch (err) {
      console.error('Email Sync Error:', err);
      throw err;
    }
  },

  /**
   * Helper to decode Gmail's base64 encoded body parts
   */
  _extractEmailBody(message: any): string {
    let body = '';
    if (message.payload.parts) {
      // Check for plain text first
      const textPart = message.payload.parts.find((p: any) => p.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      } else {
        // Fallback to HTML or other parts
        body = message.snippet || '';
      }
    } else if (message.payload.body && message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    }
    return body;
  }
};
