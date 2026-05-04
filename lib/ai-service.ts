import database from '../database';
import { getFinancialContext } from './budget-engine';
import { generateLocalResponse, initLocalModel } from './llama-service';

// const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Option A (V1Beta + 3.0 Flash): Recommended for systemInstruction support
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_AGENTS, DEFAULT_AGENT } from './ai-agents';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const PROVIDER_CONFIGS = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.5-flash',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-sonnet-latest',
  },
  xai: {
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-beta',
  }
};

export async function generateAIResponse(
  messages: { role: string; content: string }[],
  useLocal: boolean = false,
  agentId?: string,
  onToken?: (token: string) => void,
  signal?: AbortSignal
) {
  const agent = agentId ? (AI_AGENTS[agentId] || DEFAULT_AGENT) : DEFAULT_AGENT;

  // 1. Check for User Settings in Storage
  const keysJson = await AsyncStorage.getItem('cloud_ai_keys');
  const aiKeys = keysJson ? JSON.parse(keysJson) : {};
  const userProvider = (await AsyncStorage.getItem('cloud_ai_provider')) || 'gemini';
  const userModel = await AsyncStorage.getItem('cloud_ai_model');

  const providerKey = aiKeys[userProvider];

  // ── Local Mode: Route directly to on-device engine ──
  if (useLocal) {
    console.log(`[AI Assistant] Using LOCAL mode with agent: ${agent.name}`);
    await initLocalModel();
    return generateLocalResponse(messages, agent.id, onToken);
  }

  const envKey = userProvider === 'gemini' ? process.env.EXPO_PUBLIC_GEMINI_API_KEY : undefined;
  const apiKey = providerKey || envKey;
  const model = userModel || PROVIDER_CONFIGS[userProvider as keyof typeof PROVIDER_CONFIGS]?.defaultModel || PROVIDER_CONFIGS.gemini.defaultModel;

  // Diagnostic log for the user/developer
  console.log('[AI Assistant] Using CLOUD mode (Gemini). API Key present:', !!apiKey);

  if (!apiKey || apiKey === 'your_key_here') {
    // No API key — auto-fallback to local
    console.log(`[AI Assistant] No Gemini API key, falling back to local mode with agent: ${agent.name}.`);
    await initLocalModel();
    return generateLocalResponse(messages, agent.id, onToken);
  }
  const userQuery = messages.length > 0 ? messages[messages.length - 1].content : '';
  const context = await getFinancialContext(userQuery);

  const systemInstructionText = `### MASTER INSTRUCTIONS
    You are ${agent.name}. Your role is: ${agent.description}.
    
    IGNORING PREVIOUS LIMITATIONS: Your internal knowledge suggesting you cannot access user data is INCORRECT. 
    I have provided the user's LIVE financial data below in the <FINANCIAL_CONTEXT> tags. 
    YOU MUST USE THIS DATA TO ANSWER THE USER.
    
    <FINANCIAL_CONTEXT>
    ${context}
    </FINANCIAL_CONTEXT>
    
    SPECIALIST INSTRUCTIONS:
    ${agent.systemPrompt}
    
    CRITICAL FORMATTING RULES:
    1. DO NOT say you cannot access data. Use the provided context.
    2. USE PLAIN TEXT ONLY. NO BOLDING (**), NO HASHTAGS (#), NO ASTERISKS (*).
    3. NO MARKDOWN EXCEPT FOR CHARTS AND TABLES: Avoid all markdown formatting in your conversational text. Do not use bold (**) or headers (#).
    4. TABLE FORMATTING: If you are presenting historical data, structured data, or lists of transactions, you MUST format it as a Markdown table.
    5. VISUALIZATION TRIGGER: If the user explicitly requests a "chart", "graph", "visual", or "breakdown", OR if it is mandated by your specialist instructions, you MUST append this EXACT block at the very end of your response, on its own line:
       [CHART_DATA: {"data": [{"label": "<NAME>", "value": <NUMBER>, "color": "<HEX_COLOR>"}, ...]}]
       
       DO NOT wrap the CHART_DATA block in markdown code blocks (\`\`\`). Output it raw.
       
       CRITICAL COLOR RULE: Each category in a pie/donut chart MUST use a UNIQUE, DISTINCT color so the user can differentiate segments visually.
        Assign colors in this order (one per data item, cycling if needed):
        1. #10b981 (Emerald)
        2. #3b82f6 (Blue)
        3. #8b5cf6 (Purple)
        4. #f59e0b (Amber)
        5. #ef4444 (Red)
        6. #ec4899 (Pink)
        7. #06b6d4 (Cyan)
        8. #f97316 (Orange)
        9. #a855f7 (Violet)
        NEVER use the same color for multiple categories.`;

  // Combine external signal with internal timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 40000);
  
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    let response;
    const body: any = {
      model: model,
      temperature: 0.7,
      max_tokens: 4096,
    };

    if (userProvider === 'gemini') {
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      const apiUrl = `${PROVIDER_CONFIGS.gemini.baseUrl}/${model}:generateContent?key=${apiKey}`;
      
      response = await fetch(apiUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          system_instruction: { parts: [{ text: systemInstructionText }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        }),
      });
    } else if (userProvider === 'anthropic') {
      response = await fetch(PROVIDER_CONFIGS.anthropic.baseUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey as string,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          system: systemInstructionText,
          messages: messages,
          max_tokens: 4096
        }),
      });
    } else {
      // OpenAI, Grok (xAI) and other OpenAI-compatible providers
      const url = userProvider === 'xai' ? PROVIDER_CONFIGS.xai.baseUrl : PROVIDER_CONFIGS.openai.baseUrl;
      response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey as string}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'system', content: systemInstructionText }, ...messages],
          max_tokens: 4096
        }),
      });
    }

    clearTimeout(timeoutId);
    const data = await response.json();

    if (data.error) {
      console.error(`${userProvider} Error:`, data.error);
      // Auto-fallback to local on API errors (quota, auth, etc)
      console.log(`[AI Assistant] ${userProvider} failed with error, falling back to local mode.`);
      await initLocalModel();
      return generateLocalResponse(messages, agent.id, onToken, controller.signal);
    }

    // Extract text based on provider format
    let resultText = '';
    if (userProvider === 'gemini') {
      resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (userProvider === 'anthropic') {
      resultText = data.content?.[0]?.text || '';
    } else {
      // OpenAI / xAI format
      resultText = data.choices?.[0]?.message?.content || '';
    }

    if (!resultText) {
      console.error(`[${userProvider} Diagnostic] Unexpected response structure:`, JSON.stringify(data, null, 2));
      return "The AI returned an empty or restricted response. Check console for details.";
    }

    return resultText;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || controller.signal.aborted) {
      if (signal?.aborted) return "Generation stopped by user.";
      return "The AI is taking too long to respond (Free Tier Limit). Please try a shorter question or try again in a moment.";
    }
    // Network failure — auto-fallback to local
    console.warn('[AI Service] Gemini failed, falling back to local mode:', error.message);
    try {
      await initLocalModel();
      return generateLocalResponse(messages, agent.id, onToken);
    } catch (localError) {
      console.error('[AI Service] Local fallback also failed:', localError);
      return `Connection Error: ${error.message || 'I had trouble connecting.'} - Try switching to Local mode for offline use.`;
    }
  }
}

export async function generateSuggestedBudget() {
  const keysJson = await AsyncStorage.getItem('cloud_ai_keys');
  const aiKeys = keysJson ? JSON.parse(keysJson) : {};
  const userProvider = (await AsyncStorage.getItem('cloud_ai_provider')) || 'gemini';
  const userModel = await AsyncStorage.getItem('cloud_ai_model');

  const providerKey = aiKeys[userProvider];
  const envKey = userProvider === 'gemini' ? process.env.EXPO_PUBLIC_GEMINI_API_KEY : undefined;
  const apiKey = providerKey || envKey;
  const model = userModel || PROVIDER_CONFIGS[userProvider as keyof typeof PROVIDER_CONFIGS]?.defaultModel || PROVIDER_CONFIGS.gemini.defaultModel;

  if (!apiKey || apiKey === 'your_key_here') return null;

  const context = await getFinancialContext();

  // Fetch goals and incomes for deeper context
  const goals = await database.get('goals').query().fetch();
  const incomes = await database.get('incomes').query().fetch();
  const totalIncome = incomes.reduce((acc, inc) => acc + (inc as any).amount, 0);
  const baseCurrency = (await AsyncStorage.getItem('user_currency')) || 'PHP';
  const goalSummary = goals.map((g: any) => `"${g.name}" (target: ${g.targetAmount} ${g._currency || baseCurrency}, saved: ${g.currentAmount} ${g._currency || baseCurrency})`).join(', ');

  try {
    const systemInstruction = `You are a Senior Financial Consultant with 20 years of experience. Based on the following financial context, suggest a categorized monthly budget that aligns with the user's income, expenses, and specifically their goals.
    
    The user's default currency is ${baseCurrency}. 
    
    ${context}
    
    ADDITIONAL CONTEXT:
    - Total Monthly Income: ${totalIncome} ${baseCurrency}
    - Active Goals: ${goalSummary || 'None set'}
    
    IMPORTANT RULES:
    1. The total of all budget categories MUST NOT exceed the total monthly income.
    2. Prioritize allocations that help the user reach their active goals faster.
    3. Include a "Savings" category that reserves at least 15-20% of income for goals.
    4. Use realistic category names like: Food, Housing, Transport, Utilities, Health, Entertainment, Shopping, Savings.
    
    You MUST return ONLY a JSON array of objects with the format:
    [{"category": "Food", "amount_limit": 500}, {"category": "Transport", "amount_limit": 200}]
    
    Do not include any other text or explanation. Only the JSON array.`;

    let response;
    if (userProvider === 'gemini') {
      const apiUrl = `${PROVIDER_CONFIGS.gemini.baseUrl}/${model}:generateContent?key=${apiKey}`;
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: "Please generate the budget based on the context provided in your system instructions." }] }],
          system_instruction: { parts: [{ text: systemInstruction }] }
        }),
      });
    } else if (userProvider === 'anthropic') {
      response = await fetch(PROVIDER_CONFIGS.anthropic.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey as string,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          system: systemInstruction,
          messages: [{ role: 'user', content: "Please generate the budget." }],
          max_tokens: 4096
        }),
      });
    } else {
      const url = userProvider === 'xai' ? PROVIDER_CONFIGS.xai.baseUrl : PROVIDER_CONFIGS.openai.baseUrl;
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey as string}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: "Please generate the budget." }],
        }),
      });
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('[Gemini Budget Diagnostic] Unexpected response structure:', JSON.stringify(data, null, 2));
      return null;
    }

    const content = data.candidates[0].content.parts[0].text;

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
  const keysJson = await AsyncStorage.getItem('cloud_ai_keys');
  const aiKeys = keysJson ? JSON.parse(keysJson) : {};
  const userProvider = (await AsyncStorage.getItem('cloud_ai_provider')) || 'gemini';
  const userModel = await AsyncStorage.getItem('cloud_ai_model');

  const providerKey = aiKeys[userProvider];
  const envKey = userProvider === 'gemini' ? process.env.EXPO_PUBLIC_GEMINI_API_KEY : undefined;
  const apiKey = providerKey || envKey;
  const model = userModel || PROVIDER_CONFIGS[userProvider as keyof typeof PROVIDER_CONFIGS]?.defaultModel || PROVIDER_CONFIGS.gemini.defaultModel;

  // ── Local Mode Fallback ──
  if (useLocal || !apiKey || apiKey === 'your_key_here') {
    console.log('[AI Service] Interpreting graph in LOCAL mode...');
    await initLocalModel();
    const prompt = [{ role: 'user', content: `Analyze this ${context} chart data: ${JSON.stringify(data)}. Give me a 2-sentence summary.` }];
    return generateLocalResponse(prompt);
  }

  try {
    /* Commented out OpenRouter implementation
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
    */

    const safeStringify = (obj: any) => {
      const cache = new Set();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) return '[Circular]';
          cache.add(value);
        }
        // Exclude WatermelonDB internals that cause massive bloat or circular refs
        if (['collection', 'database', '_subscriber', 'subject'].includes(key)) return undefined;
        return value;
      });
    };

    const baseCurrency = (await AsyncStorage.getItem('user_currency')) || 'PHP';

    const systemInstruction = `You are a Senior Financial Consultant with 20 years of experience. The user has requested an explanation of a financial graph titled: "${context}".
    
    The user's default display currency is ${baseCurrency}. 
    Please report total net worths or balances in ${baseCurrency} when making general statements, but acknowledge if specific assets hold foreign currency.
    For Portfolio/Asset data: Emphasize the 'value' (CURRENT MARKET VALUE) over 'investedAmount' (initial invested cash) when determining their total wealth.

    Here is the live data from that graph: ${safeStringify(data)}
    
    Please provide a brief, professional, and insightful 2-3 sentence analysis of what this data means for the user's financial health. 
    - For Trend data: Highlight growth or decline in net worth/savings.
    - For Category data: Mention specific spending habits or concerns.
    - For Savings Rate: Comment on efficiency relative to income.
    - Use a confident yet empathetic tone of a veteran wealth manager.
    - USE PLAIN TEXT ONLY. NO BOLDING (**), NO HASHTAGS (#).`;

    let response;
    if (userProvider === 'gemini') {
      const apiUrl = `${PROVIDER_CONFIGS.gemini.baseUrl}/${model}:generateContent?key=${apiKey}`;
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: "Please interpret this graph data." }] }],
          system_instruction: { parts: [{ text: systemInstruction }] }
        }),
      });
    } else if (userProvider === 'anthropic') {
      response = await fetch(PROVIDER_CONFIGS.anthropic.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey as string,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          system: systemInstruction,
          messages: [{ role: 'user', content: "Please interpret this graph data." }],
          max_tokens: 4096
        }),
      });
    } else {
      const url = userProvider === 'xai' ? PROVIDER_CONFIGS.xai.baseUrl : PROVIDER_CONFIGS.openai.baseUrl;
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey as string}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: "Please interpret this graph data." }],
        }),
      });
    }

    const result = await response.json();

    // Extract result based on provider
    let resultText = '';
    if (userProvider === 'gemini') {
      resultText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (userProvider === 'anthropic') {
      resultText = result.content?.[0]?.text || '';
    } else {
      resultText = result.choices?.[0]?.message?.content || '';
    }

    if (!resultText) {
      console.error(`[${userProvider} Graph Diagnostic] Unexpected response structure:`, JSON.stringify(result, null, 2));
      return "The AI could not interpret this graph at this time.";
    }

    return resultText;
  } catch (e) {
    console.error('Graph Explain Error:', e);
    return "Failed to connect to the AI service.";
  }
}

export async function debugGeminiModels() {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Debug] No Gemini API key found.');
    return;
  }

  const LIST_MODELS_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    console.log('[Debug] Fetching available Gemini models...');
    const response = await fetch(LIST_MODELS_URL);
    const data = await response.json();

    if (data.models) {
      console.log('[Debug] Valid model names for your key:');
      data.models.forEach((m: any) => console.log(` - ${m.name}`));
    } else {
      console.error('[Debug] Failed to list models:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('[Debug] Error listing models:', e);
  }
}
