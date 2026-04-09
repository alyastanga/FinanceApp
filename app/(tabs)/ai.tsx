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
  Animated
} from 'react-native';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { generateAIResponse } from '@/lib/ai-service';
import { useAI } from '../../context/AIContext';

import { BudgetChart } from '../../components/ui/BudgetChart';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const ChatBubble = ({ item }: { item: Message }) => {
  // ── Robust Chart Extraction (Regex-based) ──
  let chartData = null;
  let cleanText = item.text;

  // Pattern: matches [CHART_DATA: { ... }] with optional Markdown formatting
  const CHART_REGEX = /\[?CHART_DATA:?\s*(?:```json\s*)?(\{[\s\S]*?\})(?:\s*```)?\s*\]?/gi;
  const match = CHART_REGEX.exec(item.text);

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && Array.isArray(parsed.data)) {
        chartData = parsed.data;
        // Strip the entire matched block from the text
        cleanText = item.text.replace(match[0], '').trim();
      }
    } catch (e) {
      console.warn('[AI UI] Chart extraction failed, attempting surgical repair:', e);
      // Minimal repair for common JSON trailing errors
      try {
        let repair = match[1].trim();
        if (!repair.endsWith('}')) repair += '}';
        const parsedRepair = JSON.parse(repair);
        if (parsedRepair && Array.isArray(parsedRepair.data)) {
          chartData = parsedRepair.data;
          cleanText = item.text.replace(match[0], '').trim();
        }
      } catch (innerError) {
        console.error('[AI UI] Critical visualization failure:', innerError);
      }
    }
  }

  return (
    <View 
      style={{
        alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        marginBottom: 16
      }}
    >
      <View 
        className={`p-4 rounded-[28px] ${
          item.role === 'user' 
            ? 'bg-[#10b981] rounded-tr-none' 
            : 'bg-[#151515] border border-white/5 rounded-tl-none'
        }`}
      >
        <Text 
          className={`text-[16px] leading-6 font-medium ${
            item.role === 'user' ? 'text-[#050505]' : 'text-foreground'
          }`}
        >
          {cleanText}
        </Text>

        {chartData && (
          <View className="mt-4 pt-4 border-t border-white/5">
            <BudgetChart data={chartData} size={160} />
          </View>
        )}
      </View>
      <Text className="text-[10px] uppercase font-black text-white/20 mt-1 ml-2 tracking-widest">
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
};

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
      // Prepare messages for API
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.text
      }));

      const response = await generateAIResponse(apiMessages, aiMode === 'local');

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response || "I'm sorry, I couldn't process that request.",
        role: 'assistant',
        timestamp: new Date()
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
      <View className="pt-16 pb-4 px-6 border-b border-white/5">
        <Text className="text-3xl font-black text-foreground tracking-tighter">AI Assistant</Text>
        <View className="flex-row items-center mt-3">
          <View className={`h-2 w-2 rounded-full ${aiMode === 'cloud' ? 'bg-[#10b981]' : 'bg-[#8b5cf6]'}`} />
          <Text className={`text-xs font-black uppercase tracking-[2px] opacity-80 ${aiMode === 'cloud' ? 'text-[#10b981]' : 'text-[#8b5cf6]'} ml-2`}>
            {aiMode === 'cloud' ? 'Cloud' : 'Offline'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          renderItem={({ item }) => <ChatBubble item={item} />}
          ListFooterComponent={
            isTyping ? (
              <View className="mb-4 self-start">
                <Text className="text-xs font-black text-[#10b981] uppercase tracking-[2px] ml-2 animate-pulse">
                  AI is thinking...
                </Text>
              </View>
            ) : null
          }
        />

        {/* Input Area */}
        <View className="px-5 pb-10 pt-4 border-t border-white/5 bg-[#050505]">
          <View className="flex-row items-center bg-[#151515] rounded-[32px] p-2 pr-4 border border-white/5">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your budget..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="flex-1 px-4 py-3 text-foreground font-bold"
              multiline
            />
            <TouchableOpacity 
              onPress={sendMessage}
              className={`h-12 w-12 rounded-full items-center justify-center ${
                input.trim() ? 'bg-[#10b981]' : 'bg-white/5'
              }`}
            >
              <IconSymbol name="arrow.up" size={24} color={input.trim() ? '#050505' : 'rgba(255,255,255,0.2)'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
