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
import { AIToggle } from '@/components/ui/AIToggle';
import type { AIMode } from '@/lib/llama-service';

import { BudgetChart } from '../../components/ui/BudgetChart';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const ChatBubble = ({ item }: { item: Message }) => {
  // Use 'Auto-Repairing' detection: finds anything that starts like a chart and tries to fix it
  const startIdx = item.text.indexOf('{');
  const dataIdx = item.text.indexOf('"data"');
  
  let chartData = null;
  let cleanText = item.text;

  if (startIdx !== -1 && dataIdx > startIdx) {
    // Attempt to find the best possible JSON block
    const lastBrace = item.text.lastIndexOf('}');
    const lastBracket = item.text.lastIndexOf(']');
    const endIdx = Math.max(lastBrace, lastBracket) + 1;
    
    if (endIdx > dataIdx) {
      // Find the trigger prefix to remove it as well
      const triggerMatch = item.text.substring(0, startIdx).match(/\[?CHART_DATA:?\s*/i);
      const triggerStart = triggerMatch ? item.text.lastIndexOf(triggerMatch[0], startIdx) : startIdx;
      
      let rawMatch = item.text.substring(startIdx, endIdx);
      
      try {
        let repairToken = rawMatch;
        if (!repairToken.endsWith('}')) repairToken += '}';
        const parsed = JSON.parse(repairToken);
        
        if (parsed && Array.isArray(parsed.data)) {
          chartData = parsed.data;
          // SURGICAL CUT: Remove the entire block from triggerStart to endIdx (plus any trailing bracket)
          const actualEnd = item.text[endIdx] === ']' ? endIdx + 1 : endIdx;
          cleanText = (item.text.substring(0, triggerStart) + item.text.substring(actualEnd)).trim();
        }
      } catch (e) {
        // Fallback for extreme hallucinations
        try {
          const simplified = rawMatch.replace(/\]\]$/, ']}');
          const parsed2 = JSON.parse(simplified);
          if (parsed2 && Array.isArray(parsed2.data)) {
            chartData = parsed2.data;
            cleanText = item.text.replace(rawMatch, '').replace(/\[?CHART_DATA:?\s*/i, '').trim();
          }
        } catch (e2) {
          console.warn('AI Visualization surgical repair failed:', e2);
        }
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
  const [aiMode, setAiMode] = useState<AIMode>('cloud');
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
      // Prepare messages for API (mistral 7b instruct format)
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
        <View className="flex-row items-center justify-between mt-3">
          <View className="flex-row items-center gap-x-2">
            <View className={`h-2 w-2 rounded-full ${aiMode === 'cloud' ? 'bg-[#10b981]' : 'bg-[#8b5cf6]'}`} />
            <Text className={`text-xs font-black uppercase tracking-[2px] opacity-80 ${aiMode === 'cloud' ? 'text-[#10b981]' : 'text-[#8b5cf6]'}`}>
              {aiMode === 'cloud' ? 'Cloud' : 'Offline'}
            </Text>
          </View>
          <AIToggle mode={aiMode} onToggle={setAiMode} />
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
