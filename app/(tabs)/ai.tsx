import { IconSymbol } from '@/components/ui/icon-symbol';
import { generateAIResponse } from '@/lib/ai-service';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAI } from '../../context/AIContext';
import { useTheme } from '../../context/ThemeContext';
import { AI_AGENTS, AIAgent, getAgentFromMention } from '../../lib/ai-agents';

import { AITable } from '../../components/ui/AITable';
import { BudgetChart } from '../../components/ui/BudgetChart';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  agent?: AIAgent;
}

const ChatBubble = ({ item }: { item: Message }) => {
  const { isDark } = useTheme();
  // ── Robust Chart Extraction ──
  let chartData: any[] | null = null;
  let cleanText = item.text;

  // Helper to reliably extract nested JSON from a string by counting braces
  const extractNestedJson = (str: string) => {
    // Look for the first structural character [ or {
    const startIdx = str.search(/[\{\[]/);
    if (startIdx === -1) return null;

    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escape = false;
    let endIdx = -1;

    for (let i = startIdx; i < str.length; i++) {
      const char = str[i];
      if (escape) { escape = false; continue; }
      if (char === '\\') { escape = true; continue; }
      if (char === '"') { inString = !inString; continue; }

      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;

        if (braceCount === 0 && bracketCount === 0) {
          endIdx = i;
          break;
        }
      }
    }

    // ── AGGRESSIVE JSON HEALING ──
    // If we reached the end but it's not closed, force-close it
    let jsonStr = '';
    let finalEndIdx = endIdx;

    if (endIdx === -1 && (braceCount > 0 || bracketCount > 0)) {
      jsonStr = str.substring(startIdx);
      // Append missing closers
      if (inString) jsonStr += '"';
      jsonStr += '}'.repeat(Math.max(0, braceCount));
      jsonStr += ']'.repeat(Math.max(0, bracketCount));
      finalEndIdx = str.length - 1;
    } else if (endIdx !== -1) {
      jsonStr = str.substring(startIdx, endIdx + 1);
    }

    if (jsonStr) {
      return {
        jsonStr,
        start: startIdx,
        end: finalEndIdx
      };
    }
    return null;
  };

  const HIGH_CONTRAST_PALETTE = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316', '#a855f7'];

  const processExtractedJson = (jsonStr: string, textToRemove: string) => {
    try {
      let cleanJson = jsonStr.trim();
      cleanJson = cleanJson.replace(/,\s*([\}\]])/g, '$1'); // Fix trailing commas

      const parsed = JSON.parse(cleanJson);
      const dataArr = Array.isArray(parsed) ? parsed : (parsed.data && Array.isArray(parsed.data) ? parsed.data : (parsed.items && Array.isArray(parsed.items) ? parsed.items : null));

      if (dataArr && Array.isArray(dataArr)) {
        chartData = dataArr.map((d: any, index: number) => {
          const label = d.label || d.name || d.category || d.item || d.asset || d.description || d.month || d.date || d.type || 'Item';
          const value = Math.abs(Number(
            d.value || d.amount || d.total || d.price || d.balance ||
            d.Total_Expenses || d.spending || d.cost || d.sum || d.limit || 0
          ));
          const color = d.color || HIGH_CONTRAST_PALETTE[index % HIGH_CONTRAST_PALETTE.length];
          return { label, value, color };
        }).filter(d => d.value > 0);

        // Safeguard: if all items have the same color (AI ignored distinct color rule),
        // override with the palette so the chart is visually distinguishable
        if (chartData && chartData.length > 1) {
          const uniqueColors = new Set(chartData.map(d => d.color.toLowerCase()));
          if (uniqueColors.size === 1) {
            chartData = chartData.map((d, i) => ({ ...d, color: HIGH_CONTRAST_PALETTE[i % HIGH_CONTRAST_PALETTE.length] }));
          }
        }

        if (chartData && chartData.length > 0) {
          cleanText = cleanText.replace(textToRemove, '').trim();
          return true;
        }
      }
    } catch (e) {
      // Parsing failed (common during streaming)
    }
    return false;
  };

  // ── Pre-processing: Strip markdown code fences around chart data ──
  // Gemini frequently wraps CHART_DATA or JSON in ```json ... ``` despite instructions.
  // We normalize the raw text first so downstream extraction works on clean JSON.
  let workingText = item.text;

  // Strip code fences that wrap CHART_DATA tags
  workingText = workingText.replace(/```(?:json)?\s*(\[?\s*CHART_DATA[\s\S]*?)\s*```/gi, '$1');
  // Strip code fences that wrap bare JSON arrays/objects (potential chart data)
  workingText = workingText.replace(/```(?:json)?\s*([\[\{][\s\S]*?[\]\}])\s*```/g, '$1');

  cleanText = workingText;

  // ── 1. Primary: Extract [CHART_DATA: ...] tag ──
  const chartTagIdx = workingText.toUpperCase().indexOf('CHART_DATA');
  if (chartTagIdx !== -1) {
    const afterTag = workingText.substring(chartTagIdx);
    const extraction = extractNestedJson(afterTag);

    if (extraction) {
      // Find the outermost enclosure: from the `[` before CHART_DATA to the closing `]`
      const startOfBlock = Math.max(0, workingText.lastIndexOf('[', chartTagIdx));
      let endOfBlock = chartTagIdx + extraction.end + 1;
      // Capture a trailing ] if the outer block is [CHART_DATA: {...}]
      if (endOfBlock < workingText.length && workingText[endOfBlock] === ']') endOfBlock++;

      const fullMatch = workingText.substring(startOfBlock, endOfBlock);
      processExtractedJson(extraction.jsonStr, fullMatch);
    }
  }

  // ── 2. Fallback: Any remaining JSON block that looks like chart data ──
  if (!chartData) {
    // Try to find a standalone JSON array or object in the text
    const extraction = extractNestedJson(workingText);
    if (extraction) {
      // Only process if it looks like structured data (has label/value-like keys)
      const looksLikeChartData = /("label"|"name"|"category"|"value"|"amount"|"total")/i.test(extraction.jsonStr);
      if (looksLikeChartData) {
        processExtractedJson(extraction.jsonStr, extraction.jsonStr);
      }
    }
  }

  // Cleanup residual CHART_DATA tags and empty bracket remnants
  cleanText = cleanText.replace(/\[?\s*CHART_DATA\s*:?\s*\]?/gi, '').trim();
  // Clean up markdown comments <!-- ... -->
  cleanText = cleanText.replace(/<!--[\s\S]*?-->/g, '').trim();
  // Clean up any remaining orphaned code fences
  cleanText = cleanText.replace(/```(?:json)?\s*```/g, '').trim();

  cleanText = cleanText.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // ── Thinking Process Extraction ──
  let thoughtProcess: string | null = null;
  const thinkOpenTag = '<think>';
  const thinkCloseTag = '</think>';

  if (cleanText.includes(thinkOpenTag)) {
    const startIdx = cleanText.indexOf(thinkOpenTag) + thinkOpenTag.length;
    const endIdx = cleanText.indexOf(thinkCloseTag);

    if (endIdx !== -1) {
      // Completed thinking process
      thoughtProcess = cleanText.substring(startIdx, endIdx).trim();
      cleanText = cleanText.substring(endIdx + thinkCloseTag.length).trim();
    } else {
      // Still thinking...
      thoughtProcess = cleanText.substring(startIdx).trim();
      cleanText = ''; // Hide the main text while the brain is still churning
    }
  }

  // ── Prevent blank bubble: if we have chart data but no text, add a default label ──
  if (chartData && (chartData as any[]).length > 0 && !cleanText.trim()) {
    cleanText = 'Here is the breakdown based on your financial data:';
  }


  const isUser = item.role === 'user';

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        marginBottom: 20
      }}
    >
      {/* Agent Badge */}
      {!isUser && item.agent && (
        <View className="flex-row items-center mb-2 ml-1">
          <View
            className={`px-2 py-0.5 rounded-full flex-row items-center border ${isDark ? 'border-white/10' : 'border-black/10'}`}
            style={{ backgroundColor: `${item.agent.color}${isDark ? '20' : '10'}` }}
          >
            <Text
              className="text-[8px] font-black uppercase tracking-widest"
              style={{ color: item.agent.color }}
            >
              {item.agent.name}
            </Text>
          </View>
        </View>
      )}

      {isUser ? (
        <View
          className={`p-4 rounded-[32px] rounded-tr-none border shadow-2xl ${isDark ? 'bg-[#1A1A1A] border-emerald-500/30' : 'bg-white border-emerald-500/20'}`}
        >
          <Text className={`text-[15px] leading-6 font-bold ${isDark ? 'text-white/90' : 'text-black/90'}`}>
            {cleanText}
          </Text>
        </View>
      ) : (
        <View className={`p-4 rounded-[32px] border rounded-tl-none shadow-xl gap-y-3 ${isDark ? 'bg-[#121212] border-white/5' : 'bg-white border-black/5'}`}>
          {thoughtProcess && !item.text.includes('</think>') && (
            <View className={`mb-4 p-3 rounded-2xl border-l-2 ${isDark ? 'bg-white/5 border-primary/40' : 'bg-black/5 border-primary/60'}`}>
              <View className="flex-row items-center">
                <IconSymbol name="sparkles" size={12} color="#10b981" />
                <Text className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isDark ? 'text-primary/60' : 'text-primary/80'}`}>
                  Thinking...
                </Text>
              </View>
            </View>
          )}

          {/* Render Text Segments (Supports Text and Tables) */}
          {(() => {
            // Split text by markdown tables
            const tableRegex = /(\|(?:[^\n]+\|)+\n\|(?:\s*:?---*:?\s*\|)+\n(?:\|(?:[^\n]+\|)+(?:\n|$))+)/g;

            // THE FIX: Aggressively filter out any empty or whitespace-only segments BEFORE mapping
            const segments = cleanText.split(tableRegex).filter(segment => segment.trim().length > 0);

            return segments.map((segment, index) => {
              if (segment.startsWith('|') && segment.includes('---')) {
                // This is a table
                const tableData = segment.trim().split('\n')
                  .filter(line => line.includes('|'))
                  .map(line =>
                    line
                      .split('|')
                      .filter((_, i, arr) => i > 0 && i < arr.length - 1)
                      .map(c => c.trim())
                  )
                  .filter(row => row.length > 0 && !row.every(c => c.includes('---')));

                if (tableData.length > 0) {
                  return <AITable key={`table-${index}`} data={tableData} isDark={isDark} />;
                }
              }

              // Normal text
              const trimmed = segment.trim();
              return (
                <Text key={`text-${index}`} className={`text-[15px] leading-6 font-medium ${isDark ? 'text-white/90' : 'text-black/90'}`}>
                  {trimmed}
                </Text>
              );
            });
          })()}
          {chartData && (chartData as any[]).length > 0 && (chartData as any[]).reduce((s, d) => s + d.value, 0) > 0 && (
            <View className="mt-3">
              <View className="flex-row items-center mb-3 ml-1">
                <IconSymbol name="chart.pie.fill" size={12} color="#10b981" />
                <Text className="text-[10px] font-black uppercase text-emerald-500 tracking-[1.5px] ml-2">
                  Intelligence Report
                </Text>
              </View>
              {/* Plain View wrapper — Skia Canvas cannot render inside BlurView (GlassCard) on iOS */}
              <View
                className={`rounded-2xl border overflow-hidden ${isDark ? 'border-[#2A2A2A]' : 'border-[#EAEAEA]'}`}
                style={{ backgroundColor: isDark ? '#121212' : '#FAFAFA', padding: 12 }}
              >
                <BudgetChart data={chartData} size={180} hideLegend hideTitle showCenterLabel isDark={isDark} />
              </View>
              {/* Compact inline legend for chat context */}
              <View className="mt-3 gap-y-1.5">
                {(chartData as any[]).map((d: any, i: number) => (
                  <View key={i} className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="h-2 w-2 rounded-full mr-2"
                        style={{ backgroundColor: d.color }}
                      />
                      <Text className={`text-[11px] font-bold ${isDark ? 'text-white/70' : 'text-black/70'}`}>{d.label}</Text>
                    </View>
                    <Text className={`text-[11px] font-black ${isDark ? 'text-white/90' : 'text-black/90'}`}>{d.value.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      <Text className={`text-[9px] uppercase font-black mt-1.5 ml-2 tracking-widest ${isDark ? 'text-white/15' : 'text-black/20'}`}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
};

const ThinkingAnimation = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (val: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const dotStyle = (val: Animated.Value) => ({
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }]
  });

  return (
    <View className="flex-row items-center gap-x-1.5 ml-4 mb-4">
      <Animated.View style={dotStyle(dot1)} className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
      <Animated.View style={dotStyle(dot2)} className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
      <Animated.View style={dotStyle(dot3)} className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
    </View>
  );
};

const IntelligenceHero = ({ onFastQuery }: { onFastQuery: (text: string) => void }) => {
  const { isDark } = useTheme();
  return (
    <View className="items-center justify-center pt-10 px-4">
      <View className="h-20 w-20 rounded-[30px] bg-[#10b98110] items-center justify-center border border-[#10b98120] mb-6">
        <IconSymbol name="sparkles" size={32} color="#10b981" />
      </View>
      <Text className={`text-3xl font-black text-center tracking-tighter mb-2 ${isDark ? 'text-white' : 'text-black'}`}>Finance Intelligence</Text>
      <Text className={`text-center text-sm font-medium mb-10 px-6 ${isDark ? 'text-white/40' : 'text-black/50'}`}>
        Summon specialized experts using @agent or ask a general strategy question.
      </Text>

      <View className="flex-row flex-wrap justify-center gap-3">
        {Object.values(AI_AGENTS).map(agent => (
          <TouchableOpacity
            key={agent.id}
            onPress={() => onFastQuery(`@${agent.slug} `)}
            className={`border rounded-2xl px-4 py-3 flex-row items-center ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
          >
            <View>
              <Text className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/80' : 'text-black/80'}`}>{agent.name}</Text>
              <Text className={`text-[8px] font-bold uppercase tracking-[1px] ${isDark ? 'text-white/30' : 'text-black/40'}`}>Summon Specialist</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

import { useLocalSearchParams } from 'expo-router';

export default function AIChatScreen() {
  const { agent, prompt, _t } = useLocalSearchParams<{ agent: string, prompt: string, _t: string }>();
  const { aiMode } = useAI();
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Intelligence active. Ready to analyze your spending, goals, and budget. How can I assist you today?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredAgents, setFilteredAgents] = useState<AIAgent[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const mounted = useRef(true);
  const lastTriggerId = useRef<string | null>(null);

  const handleInputChange = (text: string) => {
    setInput(text);

    // Detect '@' trigger
    const lastWord = text.split(/\s/).pop() || '';
    if (lastWord.startsWith('@')) {
      const query = lastWord.slice(1).toLowerCase();
      const matches = Object.values(AI_AGENTS).filter(agent =>
        agent.slug.toLowerCase().includes(query) ||
        agent.name.toLowerCase().includes(query)
      );

      setFilteredAgents(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectAgent = (agent: AIAgent) => {
    const words = input.split(/\s/);
    words.pop(); // Remove the partial '@...'
    const newText = [...words, `@${agent.slug} `].join(' ').trimStart();
    setInput(newText);
    setShowSuggestions(false);
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Handle incoming agent links and auto-trigger if prompt is present
  useEffect(() => {
    if (!agent || !prompt) {
      // Reset trigger ID if we land on AI screen without params (e.g. manual tab click)
      // This allows clicking the same insight again after navigating away and back.
      lastTriggerId.current = null;
      return;
    }

    // Use the full param string as the trigger ID. Budget.tsx now appends a
    // unique timestamp (_t=...) so even repeated clicks produce a new ID.
    const currentTriggerId = `${agent}-${prompt}`;
    if (lastTriggerId.current === currentTriggerId) return;

    const targetAgent = Object.values(AI_AGENTS).find(a => a.slug === agent || a.id === agent);
    if (!targetAgent) return;

    const initialInput = `@${targetAgent.slug} ${prompt}`;
    setInput(initialInput);

    if (!isTyping) {
      lastTriggerId.current = currentTriggerId;
      // Small delay to ensure state and keyboard settle
      setTimeout(() => {
        performSendMessage(initialInput);
        setInput('');
      }, 600);
    }
  }, [agent, prompt, _t]);

  const performSendMessage = async (text: string) => {
    if (!text.trim() || !mounted.current) return;

    setIsTyping(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text,
      role: 'user',
      timestamp: new Date()
    };

    const targetedAgent = getAgentFromMention(text);
    const aiMsgId = (Date.now() + 1).toString();

    // Add ONLY the user message to start. AI bubble stays hidden.
    setMessages(prev => [...prev, userMsg]);

    let fullText = '';
    try {
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.text
      }));

      const response = await generateAIResponse(
        apiMessages,
        aiMode === 'local',
        targetedAgent.id,
        (token) => {
          // Collect tokens but don't update state to keep bubble hidden
          fullText += token;
        }
      );

      if (!mounted.current) return;

      // Final response is ready, add the AI message to the list
      const finalAiMsg: Message = {
        id: aiMsgId,
        text: response || fullText,
        role: 'assistant',
        timestamp: new Date(),
        agent: targetedAgent
      };

      setMessages(prev => [...prev, finalAiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: aiMsgId,
        text: "I'm sorry, I couldn't process that request. Please try again.",
        role: 'assistant',
        timestamp: new Date(),
        agent: targetedAgent
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      if (mounted.current) {
        setIsTyping(false);
      }
    }
  };

  const sendMessage = () => {
    if (!input.trim() || isTyping) return;
    performSendMessage(input);
    setInput('');
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      {/* Floating Header */}
      <BlurView intensity={isDark ? 30 : 80} tint={isDark ? "dark" : "light"} className={`absolute top-0 left-0 right-0 z-50 pt-16 pb-6 px-6 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>Penance AI</Text>
            <View className="flex-row items-center mt-1">
              <View className={`h-1.5 w-1.5 rounded-full ${aiMode === 'cloud' ? 'bg-[#10b981]' : 'bg-[#8b5cf6]'}`} />
              <Text className={`text-[10px] font-black uppercase tracking-[2px] opacity-80 ${aiMode === 'cloud' ? 'text-[#10b981]' : 'text-[#8b5cf6]'} ml-2`}>
                {aiMode === 'cloud' ? 'Cloud' : 'Local'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setMessages([])}
            className={`h-10 w-10 rounded-2xl items-center justify-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
          >
            <IconSymbol name="trash.fill" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} />
          </TouchableOpacity>
        </View>
      </BlurView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 5 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingTop: 140, paddingBottom: 140 }}
          renderItem={({ item }) => <ChatBubble item={item} />}
          ListEmptyComponent={<IntelligenceHero onFastQuery={setInput} />}
          ListFooterComponent={isTyping ? <ThinkingAnimation /> : null}
        />

        {/* Input Area */}
        <View className="px-gsd-lg pb-gsd-lg pt-gsd-sm">
          <BlurView
            intensity={isDark ? 30 : 60}
            tint={isDark ? "dark" : "light"}
            className={`rounded-[32px] border overflow-hidden ${isDark ? 'bg-transparent border-white/10' : 'bg-transparent border-black/5'}`}
          >
            {/* Stacked Agent Suggestions */}
            {showSuggestions && (
              <View className={`border-b overflow-hidden ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                {filteredAgents.map((agent, index) => (
                  <TouchableOpacity
                    key={agent.id}
                    onPress={() => selectAgent(agent)}
                    className={`flex-row items-center p-4 ${index !== filteredAgents.length - 1 ? (isDark ? 'border-b border-white/5' : 'border-b border-black/5') : ''}`}
                  >
                    <View
                      className="h-10 w-10 rounded-2xl items-center justify-center mr-4"
                      style={{ backgroundColor: `${agent.color}${isDark ? '20' : '10'}` }}
                    >
                    </View>
                    <View className="flex-1">
                      <Text className={`font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>{agent.name}</Text>
                      <Text className={`text-[10px] uppercase font-black tracking-widest mt-0.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                        Expert Intelligence
                      </Text>
                    </View>
                    <IconSymbol name="plus.circle.fill" size={20} color={agent.color} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View className={`flex-row items-center p-2 pr-2`}>
              {(!input || input.length === 0) && (
                <View className="pl-4 pr-1">
                  <IconSymbol name="at" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} />
                </View>
              )}
              <TextInput
                value={input}
                onChangeText={handleInputChange}
                placeholder="Summon an expert..."
                placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"}
                className={`flex-1 ${(!input || input.length === 0) ? 'px-2' : 'px-5'} py-3 text-[15px] font-bold ${isDark ? 'text-white' : 'text-black'}`}
                multiline
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={!input.trim()}
                className={`h-12 w-12 rounded-full items-center justify-center ${input.trim() ? 'bg-primary' : (isDark ? 'bg-white/5' : 'bg-black/5')
                  }`}
              >
                <IconSymbol name="arrow.up" size={24} color={input.trim() ? (isDark ? '#000' : '#FFF') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')} />
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
