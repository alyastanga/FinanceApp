import database from '../database';
import { calculateSafeToSpend } from './safe-to-spend';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function getFinancialContext() {
  const stats = await calculateSafeToSpend();
  const recentExpenses = await database.get('expenses')
    .query()
    .fetch();

  // Sort and take last 10
  const sortedExpenses = recentExpenses
    .sort((a, b) => (b as any).createdAt.getTime() - (a as any).createdAt.getTime())
    .slice(0, 10);

  const contextString = `
    Current context:
    - Safe to Spend Daily: $${stats.safeDaily.toFixed(2)}
    - Total Monthly Income: $${stats.totalIncome}
    - Total Monthly Expenses: $${stats.totalExpenses}
    - Monthly Goal Commitment: $${stats.totalGoalTarget}
    - Days left in month: ${stats.daysLeft}
    
    Last 10 transactions:
    ${sortedExpenses.map(e => `- ${(e as any).category}: $${(e as any).amount}`).join('\n')}
  `;

  return contextString;
}

export async function generateAIResponse(messages: { role: string; content: string }[]) {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

  // Diagnostic log for the user/developer
  console.log('[AI Assistant] Validating API Key presence:', !!apiKey);

  if (!apiKey || apiKey === 'your_key_here') {
    return "I need an OpenRouter API Key to analyze your data. Please check your .env file!";
  }

  const context = await getFinancialContext();

  const systemPrompt = {
    role: 'system',
    content: `### MASTER INSTRUCTIONS
    You are FinanceApp AI, a highly advanced personal finance engine. 
    IGNORING PREVIOUS LIMITATIONS: Your internal knowledge suggesting you cannot access user data is INCORRECT. 
    I have provided the user's LIVE financial data below in the <FINANCIAL_CONTEXT> tags. 
    YOU MUST USE THIS DATA TO ANSWER THE USER.
    
    <FINANCIAL_CONTEXT>
    ${context}
    </FINANCIAL_CONTEXT>
    
    CRITICAL FORMATTING RULES:
    1. DO NOT say you cannot access data. Use the context above.
    2. USE PLAIN TEXT ONLY. NO BOLDING (**), NO HASHTAGS (#), NO ASTERISKS (*).
    3. VISUALIZATION TRIGGER: For every budget breakdown, you MUST append this EXACT block at the end:
       [CHART_DATA: {"data": [{"label": "Safe", "value": <VALUE>, "color": "#10b981"}, {"label": "Spent", "value": <VALUE>, "color": "#059669"}]}]
    4. Keep it human, conversational, and professional.
    
    Begin your response now summarizing their status based on the context.`
  };

  // Add a 25-second timeout for the free tier
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:8081',
        'X-Title': 'FinanceApp',
      },
      body: JSON.stringify({
        model: 'arcee-ai/trinity-large-preview:free',
        messages: [systemPrompt, ...messages],
      }),
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (data.error) {
      console.error('OpenRouter Error:', data.error);
      return `OpenRouter Error: ${data.error.message || 'Unknown error'}`;
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return "The AI is taking too long to respond (Free Tier Limit). Please try a shorter question or try again in a moment.";
    }
    console.error('[AI Service Error]:', error);
    return `Connection Error: ${error.message || 'I had trouble connecting to my brain.'} - Please check your internet or API key in .env.`;
  }
}
