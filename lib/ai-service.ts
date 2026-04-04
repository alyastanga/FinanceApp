import database from '../database';
import { calculateBudgetInsights } from './budget-engine';
import { generateLocalResponse, initLocalModel } from './llama-service';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function getFinancialContext() {
  const incomes = await database.get('incomes').query().fetch();
  const expenses = await database.get('expenses').query().fetch();
  const goals = await database.get('goals').query().fetch();
  const portfolio = await database.get('portfolio').query().fetch();

  const insights = calculateBudgetInsights(incomes, expenses, goals);
  
  const totalPortfolioValue = portfolio.reduce((sum, item) => sum + ((item as any).value || 0), 0);
  const netWorth = totalPortfolioValue + insights.monthlyIncome - insights.monthlyFixedExpenses;
  
  // Sort and take last 10
  const recentExpenses = expenses
    .sort((a, b) => (b as any).createdAt.getTime() - (a as any).createdAt.getTime())
    .slice(0, 10);

  const contextString = `
    Current context:
    - Safe to Spend Daily: $${insights.dailySafeToSpend.toFixed(2)}
    - Total Monthly Income: $${insights.monthlyIncome}
    - Total Monthly (Fixed) Expenses: $${insights.monthlyFixedExpenses}
    - Monthly Goal Commitment: $${insights.monthlyGoalTarget}
    - Days left in month: ${insights.remainingDays}
    
    Portfolio & Net Worth:
    - Total Portfolio Value: $${totalPortfolioValue.toLocaleString()}
    - Asset Allocation: ${portfolio.map(p => `${(p as any).name} ($${(p as any).value.toLocaleString()})`).join(', ')}
    
    Last 10 transactions:
    ${recentExpenses.map(e => `- ${(e as any).category}: $${(e as any).amount}`).join('\n')}
  `;

  return contextString;
}

export async function generateAIResponse(
  messages: { role: string; content: string }[],
  useLocal: boolean = false
) {
  // ── Local Mode: Route directly to on-device engine ──
  if (useLocal) {
    console.log('[AI Assistant] Using LOCAL mode (on-device)');
    await initLocalModel();
    return generateLocalResponse(messages);
  }

  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

  // Diagnostic log for the user/developer
  console.log('[AI Assistant] Using CLOUD mode. API Key present:', !!apiKey);

  if (!apiKey || apiKey === 'your_key_here') {
    // No API key — auto-fallback to local
    console.log('[AI Assistant] No API key, falling back to local mode.');
    await initLocalModel();
    return generateLocalResponse(messages);
  }

  const context = await getFinancialContext();

  const systemPrompt = {
    role: 'system',
    content: `### MASTER INSTRUCTIONS
    You are FinanceApp AI, a Senior Financial Consultant with 20 years of experience in the industry.
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
    4. Keep your tone professional, authoritative yet empathetic, drawing upon your 20 years of wealth management experience.
    
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
        model: 'openrouter/free',
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
    // Network failure — auto-fallback to local
    console.warn('[AI Service] Cloud failed, falling back to local mode:', error.message);
    try {
      await initLocalModel();
      return generateLocalResponse(messages);
    } catch (localError) {
      console.error('[AI Service] Local fallback also failed:', localError);
      return `Connection Error: ${error.message || 'I had trouble connecting.'} - Try switching to Local mode for offline use.`;
    }
  }
}

export async function generateSuggestedBudget() {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') return null;

  const context = await getFinancialContext();

  // Fetch goals and incomes for deeper context
  const goals = await database.get('goals').query().fetch();
  const incomes = await database.get('incomes').query().fetch();
  const totalIncome = incomes.reduce((acc, inc) => acc + (inc as any).amount, 0);
  const goalSummary = goals.map((g: any) => `"${g.name}" (target: $${g.targetAmount}, saved: $${g.currentAmount})`).join(', ');
  
  const prompt = {
    role: 'system',
    content: `You are a Senior Financial Consultant with 20 years of experience. Based on the following financial context, suggest a categorized monthly budget that aligns with the user's income, expenses, and specifically their goals.
    
    ${context}
    
    ADDITIONAL CONTEXT:
    - Total Monthly Income: $${totalIncome}
    - Active Goals: ${goalSummary || 'None set'}
    
    IMPORTANT RULES:
    1. The total of all budget categories MUST NOT exceed the total monthly income.
    2. Prioritize allocations that help the user reach their active goals faster.
    3. Include a "Savings" category that reserves at least 15-20% of income for goals.
    4. Use realistic category names like: Food, Housing, Transport, Utilities, Health, Entertainment, Shopping, Savings.
    
    You MUST return ONLY a JSON array of objects with the format:
    [{"category": "Food", "amount_limit": 500}, {"category": "Transport", "amount_limit": 200}]
    
    Do not include any other text or explanation. Only the JSON array.`
  };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:8081',
        'X-Title': 'FinanceApp',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [prompt],
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Attempt to parse JSON from AI response
    const jsonMatch = content.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (e) {
    console.error('Budget Gen Error:', e);
    return null;
  }
}

export async function explainFinancialGraph(data: any, context: string, useLocal: boolean = false) {
  // ── Local Mode Fallback ──
  if (useLocal) {
    console.log('[AI Service] Interpreting graph in LOCAL mode...');
    await initLocalModel();
    const prompt = [{ role: 'user', content: `Analyze this ${context} chart data: ${JSON.stringify(data)}. Give me a 2-sentence summary.` }];
    return generateLocalResponse(prompt);
  }

  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    // Auto-fallback if no key
    await initLocalModel();
    const prompt = [{ role: 'user', content: `Analyze this ${context} chart data: ${JSON.stringify(data)}. Give me a 2-sentence summary.` }];
    return generateLocalResponse(prompt);
  }

  const prompt = {
    role: 'system',
    content: `You are a Senior Financial Consultant with 20 years of experience. The user has requested an explanation of a financial graph titled: "${context}".
    
    Here is the live data from that graph: ${JSON.stringify(data)}
    
    Please provide a brief, professional, and insightful 2-3 sentence analysis of what this data means for the user's financial health. 
    - For Trend data: Highlight growth or decline in net worth/savings.
    - For Category data: Mention specific spending habits or concerns.
    - For Savings Rate: Comment on efficiency relative to income.
    - Use a confident yet empathetic tone of a veteran wealth manager.`
  };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:8081',
        'X-Title': 'FinanceApp',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [prompt],
      }),
    });

    const result = await response.json();
    return result.choices?.[0]?.message?.content || "Could not generate an explanation.";
  } catch (e) {
    console.error('Graph Explain Error:', e);
    return "Failed to connect to the AI service.";
  }
}
