import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  Keyboard,
  Animated,
  Easing
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { generateAIResponse } from '@/lib/ai-service';
import { useAI } from '../../context/AIContext';
import { AI_AGENTS, getAgentFromMention, cleanMention, AIAgent } from '../../lib/ai-agents';

import { BudgetChart } from '../../components/ui/BudgetChart';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  agent?: AIAgent;
}

const ChatBubble = ({ item }: { item: Message }) => {
  // ── Robust Chart Extraction ──
  let chartData = null;
  let cleanText = item.text;
  
  // Helper to reliably extract nested JSON from a string by counting braces
  const extractNestedJson = (str: string) => {
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
            
            // Allow matching [CHART_DATA: [ ... ]] where outer is a bracket we want to ignore,
            // but actually CHART_DATA array won't trip this if we start parsing at the first valid { or [ after CHART_DATA.
            // Wait, if it starts with [ and we hit ], bracketCount goes to 0. We found our JSON.
            if (braceCount === 0 && bracketCount === 0) {
                endIdx = i;
                break;
            }
        }
    }

    if (endIdx !== -1) {
        return {
            jsonStr: str.substring(startIdx, endIdx + 1),
            start: startIdx,
            end: endIdx
        };
    }
    return null;
  };

  const processExtractedJson = (jsonStr: string, textToRemove: string) => {
    try {
      // Fix common AI trailing commas and possibly unquoted keys if necessary
      let fixedJson = jsonStr.replace(/,\s*([\}\]])/g, '$1');
      const parsed = JSON.parse(fixedJson);
      
      const dataArr = Array.isArray(parsed) ? parsed : (parsed.data && Array.isArray(parsed.data) ? parsed.data : (parsed.items && Array.isArray(parsed.items) ? parsed.items : null));
      
      if (dataArr && Array.isArray(dataArr)) {
        const HIGH_CONTRAST_PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#a855f7'];
        
        // Map common AI field names to the Chart interface robustly
        chartData = dataArr.map((d: any, index: number) => {
            const label = d.label || d.name || d.category || d.item || d.asset || d.description || 'Item';
            const value = Math.abs(Number(d.value || d.amount || d.total || d.price || d.balance || 0));
            // FORCE contrast by using the palette based on index, ignore AI color suggestion
            const color = HIGH_CONTRAST_PALETTE[index % HIGH_CONTRAST_PALETTE.length];
            return { label, value, color };
        }).filter(d => d.value > 0);

        if (chartData.length > 0) {
          // Remove the matched block and any residual tags
          cleanText = item.text.replace(textToRemove, '').replace(/\[?CHART_DATA:?\]?/gi, '').trim();
          return true;
        }
      }
    } catch (e) {
        console.warn("[AI UI] Aggressive JSON recovery failed:", e);
    }
    return false;
  };

  // Check if there is CHART_DATA tag
  const chartTagIdx = item.text.indexOf('CHART_DATA');
  
  if (chartTagIdx !== -1) {
     // Extract JSON starting after the tag
     const afterTag = item.text.substring(chartTagIdx);
     const extraction = extractNestedJson(afterTag);
     
     if (extraction) {
         // Tightly scope the fullMatch to avoid over-greedy deletion
         const startOfBlock = Math.max(0, item.text.lastIndexOf('[', chartTagIdx));
         const possibleEnd = chartTagIdx + extraction.end + 2; 
         // Check if there's a trailing bracket
         const fullMatch = item.text.substring(startOfBlock, possibleEnd).includes(']') 
            ? item.text.substring(startOfBlock, possibleEnd)
            : item.text.substring(startOfBlock, chartTagIdx + extraction.end + 1);
         
         processExtractedJson(extraction.jsonStr, fullMatch);
     }
  }

  // Fallback: Just look for any JSON block if CHART_DATA wasn't found but there's still no chart
  if (!chartData) {
      const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)\s*```/g.exec(item.text);
      if (codeBlockMatch && codeBlockMatch[1]) {
          const extraction = extractNestedJson(codeBlockMatch[1]);
          if (extraction) {
             processExtractedJson(extraction.jsonStr, codeBlockMatch[0]);
          }
      }
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
            className="px-2 py-0.5 rounded-full flex-row items-center border border-white/10"
            style={{ backgroundColor: `${item.agent.color}20` }}
          >
            <Text className="text-[10px] mr-1.5">{item.agent.icon}</Text>
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
        <LinearGradient
          colors={['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-4 rounded-[24px] rounded-tr-none shadow-lg shadow-emerald-500/20"
        >
          <Text className="text-[15px] leading-6 font-bold text-[#050505]">
            {cleanText}
          </Text>
        </LinearGradient>
      ) : (
        <View className="p-4 rounded-[24px] bg-[#121212] border border-white/5 rounded-tl-none shadow-xl">
          <Text className="text-[15px] leading-6 font-medium text-white/90">
            {cleanText}
          </Text>
          {chartData && (
            <View className="mt-4 pt-4 border-t border-white/5 bg-black/20 rounded-2xl p-4">
              <BudgetChart data={chartData} size={150} />
            </View>
          )}
        </View>
      )}
      
      <Text className="text-[9px] uppercase font-black text-white/15 mt-1.5 ml-2 tracking-widest">
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

const IntelligenceHero = ({ onFastQuery }: { onFastQuery: (text: string) => void }) => (
  <View className="items-center justify-center pt-10 px-4">
    <View className="h-20 w-20 rounded-[30px] bg-[#10b98110] items-center justify-center border border-[#10b98120] mb-6">
      <IconSymbol name="sparkles" size={32} color="#10b981" />
    </View>
    <Text className="text-3xl font-black text-white text-center tracking-tighter mb-2">Finance Intelligence</Text>
    <Text className="text-white/40 text-center text-sm font-medium mb-10 px-6">
      Summon specialized experts using @agent or ask a general strategy question.
    </Text>

    <View className="flex-row flex-wrap justify-center gap-3">
      {Object.values(AI_AGENTS).map(agent => (
        <TouchableOpacity 
          key={agent.id}
          onPress={() => onFastQuery(`@${agent.slug} `)}
          className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 flex-row items-center"
        >
          <Text className="text-lg mr-2">{agent.icon}</Text>
          <View>
            <Text className="text-[10px] font-black uppercase tracking-widest text-white/80">{agent.name}</Text>
            <Text className="text-[8px] font-bold text-white/30 uppercase tracking-[1px]">Summon Specialist</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export default function AIChatScreen() {
  const { aiMode } = useAI();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your Finance AI. I can analyze your spending, check your savings goals, or help you with a 'Safe to Spend' budget. How can I help today?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    
    try {
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.text
      }));

      const targetedAgent = getAgentFromMention(input);
      const promptText = cleanMention(input);

      const response = await generateAIResponse(apiMessages, aiMode === 'local', targetedAgent.id);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response || "I'm sorry, I couldn't process that request.",
        role: 'assistant',
        timestamp: new Date(),
        agent: targetedAgent
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View className="flex-1 bg-[#050505]">
      {/* Floating Header */}
      <BlurView intensity={30} tint="dark" className="absolute top-0 left-0 right-0 z-50 pt-16 pb-6 px-6 border-b border-white/5">
        <View className="flex-row items-center justify-between">
           <View>
             <Text className="text-3xl font-black text-foreground tracking-tighter">AI Assistant</Text>
             <View className="flex-row items-center mt-1">
               <View className={`h-1.5 w-1.5 rounded-full ${aiMode === 'cloud' ? 'bg-[#10b981]' : 'bg-[#8b5cf6]'}`} />
               <Text className={`text-[10px] font-black uppercase tracking-[2px] opacity-80 ${aiMode === 'cloud' ? 'text-[#10b981]' : 'text-[#8b5cf6]'} ml-2`}>
                 {aiMode === 'cloud' ? 'Cloud Matrix' : 'Local Core'}
               </Text>
             </View>
           </View>
           <TouchableOpacity 
             onPress={() => setMessages([])} 
             className="h-10 w-10 rounded-2xl bg-white/5 items-center justify-center border border-white/5"
           >
              <IconSymbol name="trash" size={18} color="rgba(255,255,255,0.4)" />
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
          contentContainerStyle={{ padding: 20, paddingTop: 140, paddingBottom: 20 }}
          renderItem={({ item }) => <ChatBubble item={item} />}
          ListEmptyComponent={<IntelligenceHero onFastQuery={setInput} />}
          ListFooterComponent={isTyping ? <ThinkingAnimation /> : null}
        />

        {/* Input Area */}
        <BlurView intensity={80} tint="dark" className="px-5 pb-8 pt-4 border-t border-white/5">
          <View className="flex-row items-center bg-[#181818] rounded-[32px] p-2 pr-2 border border-white/10 shadow-2xl">
            <View className="pl-4 pr-1">
               <IconSymbol name="at" size={18} color="rgba(255,255,255,0.2)" />
            </View>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Summon an expert..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="flex-1 px-2 py-3 text-[15px] font-bold text-white"
              multiline
            />
            <TouchableOpacity 
              onPress={sendMessage}
              disabled={!input.trim()}
              className={`h-12 w-12 rounded-full items-center justify-center ${
                input.trim() ? 'bg-primary' : 'bg-white/5'
              }`}
            >
              <IconSymbol name="arrow.up" size={24} color={input.trim() ? '#000' : 'rgba(255,255,255,0.1)'} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
}
