import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function CloudAiSettingsScreen() {
  const { isDark } = useTheme();
  const [aiKeys, setAiKeys] = React.useState<Record<string, string>>({});
  const [cloudAiKey, setCloudAiKey] = React.useState('');
  const [cloudAiModel, setCloudAiModel] = React.useState('gemini-2.5-flash');
  const [cloudAiProvider, setCloudAiProvider] = React.useState('gemini');

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const fetchState = async () => {
        const keysJson = await AsyncStorage.getItem('cloud_ai_keys');
        const loadedKeys = keysJson ? JSON.parse(keysJson) : {};
        const aiModel = await AsyncStorage.getItem('cloud_ai_model');
        const aiProvider = await AsyncStorage.getItem('cloud_ai_provider');
        const currentProvider = aiProvider || 'gemini';

        if (isMounted) {
          setAiKeys(loadedKeys);
          setCloudAiKey(loadedKeys[currentProvider] || '');
          if (aiModel) setCloudAiModel(aiModel);
          if (aiProvider) setCloudAiProvider(currentProvider);
        }
      };
      fetchState();
      return () => { isMounted = false; };
    }, [])
  );

  const borderClass = isDark ? 'border-white/5' : 'border-neutral-200';
  const cardBgClass = isDark ? 'bg-[#151515]' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-neutral-900';
  const subTextClass = isDark ? 'text-white/40' : 'text-neutral-500';

  const providers = [
    { id: 'gemini', name: 'Gemini', icon: 'sparkles' },
    { id: 'openai', name: 'ChatGPT', icon: 'cpu' },
    { id: 'anthropic', name: 'Claude', icon: 'bolt' },
    { id: 'xai', name: 'Grok', icon: 'target' }
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>
      <View className="px-6 py-4 flex-row items-center gap-x-4">
        <TouchableOpacity 
          onPress={() => router.back()}
          className={`h-10 w-10 rounded-xl items-center justify-center border ${borderClass} ${isDark ? 'bg-white/5' : 'bg-black/5'}`}
        >
          <IconSymbol name="chevron.left" size={20} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text className={`text-2xl font-black ${textClass} tracking-tighter`}>Cloud AI</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-4">
        <View className="mb-8">
          <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-4 opacity-30`}>Provider Setup</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} p-6`}>
            
            <View className="mb-8">
              <Text className={`text-[10px] ${subTextClass} font-black uppercase tracking-widest mb-4`}>Select Provider</Text>
              <View className="flex-row flex-wrap gap-2">
                {providers.map((p) => {
                  const isSelected = cloudAiProvider === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={async () => {
                        setCloudAiProvider(p.id);
                        await AsyncStorage.setItem('cloud_ai_provider', p.id);
                        const newKey = aiKeys[p.id] || '';
                        setCloudAiKey(newKey);
                        
                        const defaultModels: any = { 
                          gemini: 'gemini-2.5-flash', 
                          openai: 'gpt-4o-mini', 
                          anthropic: 'claude-3-5-sonnet-latest', 
                          xai: 'grok-beta' 
                        };
                        const newModel = defaultModels[p.id];
                        setCloudAiModel(newModel);
                        await AsyncStorage.setItem('cloud_ai_model', newModel);
                      }}
                      className={`px-4 py-3 rounded-2xl border flex-row items-center gap-x-2 ${isSelected ? 'bg-primary border-primary' : (isDark ? 'bg-white/5 border-white/5' : 'bg-neutral-100 border-neutral-200')}`}
                    >
                      <IconSymbol name={p.icon as any} size={14} color={isSelected ? '#050505' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)')} />
                      <Text className={`text-xs font-black ${isSelected ? 'text-[#050505]' : textClass}`}>{p.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View>
              <Text className={`text-[10px] ${subTextClass} font-black uppercase tracking-widest mb-3`}>API Key ({cloudAiProvider.toUpperCase()})</Text>
              <TextInput
                value={cloudAiKey}
                onChangeText={async (val) => {
                  setCloudAiKey(val);
                  const updatedKeys = { ...aiKeys, [cloudAiProvider]: val };
                  setAiKeys(updatedKeys);
                  await AsyncStorage.setItem('cloud_ai_keys', JSON.stringify(updatedKeys));
                }}
                placeholder={`Enter your ${cloudAiProvider} API Key`}
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                secureTextEntry
                className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5 text-white' : 'bg-black/5 border-black/5 text-black'} font-medium`}
              />
              <Text className={`text-[9px] ${subTextClass} mt-3 leading-4`}>
                Your key is stored locally on this device. If you have E2EE enabled, it will also be synced to your secure cloud vault.
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-10">
          <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-4 opacity-30`}>Current Model</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} p-6 flex-row items-center justify-between`}>
            <View>
              <Text className={`${textClass} font-bold text-base`}>{cloudAiModel}</Text>
              <Text className={`${subTextClass} text-[10px] uppercase font-black tracking-widest`}>Active Intelligence</Text>
            </View>
            <View className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Text className="text-primary text-[10px] font-black uppercase">Standard</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
