import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useTheme } from '../../context/ThemeContext';
import { generateConfirmationQuiz, generateSeedPhrase, verifyQuizAnswers } from '../../lib/bip39-service';
import { setupE2EE } from '../../lib/key-manager';
import { CustomAlert } from '../../components/ui/CustomAlert';

type SetupStep = 'intro' | 'phrase' | 'quiz' | 'passphrase';

export default function E2EESetupScreen() {
  const { isDark } = useTheme();
  // Prevent screenshots globally for this screen (active across all steps just to be safe)
  usePreventScreenCapture();

  const [step, setStep] = useState<SetupStep>('intro');
  const [phrase, setPhrase] = useState('');
  const [phraseHash, setPhraseHash] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<{ position: number; correctWord: string }[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});

  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize phrase on mount
  useEffect(() => {
    async function initPhrase() {
      const { phrase, phraseHash, words } = await generateSeedPhrase();
      setPhrase(phrase);
      setPhraseHash(phraseHash);
      setWords(words);

      const generatedQuiz = generateConfirmationQuiz(phrase, 4);
      setQuiz(generatedQuiz.questions);
    }
    initPhrase();
  }, []);

  const handleVerifyQuiz = () => {
    const result = verifyQuizAnswers(quiz, quizAnswers);
    if (result.passed) {
      setStep('passphrase');
    } else {
      CustomAlert.alert('Incorrect', 'One or more words are incorrect. Please check your backup and try again.');
    }
  };

  const handleSetupE2EE = async () => {
    if (passphrase.length < 8) {
      CustomAlert.alert('Error', 'Passphrase must be at least 8 characters long.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      CustomAlert.alert('Error', 'Passphrases do not match.');
      return;
    }

    setIsProcessing(true);
    try {
      await setupE2EE(passphrase, { seedPhrase: phrase, phraseHash });
      CustomAlert.alert('Success', 'Your zero-knowledge cloud storage is now fully configured.', [
        { text: 'Continue', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (err: any) {
      CustomAlert.alert('Error', err.message || 'Failed to setup encryption.');
    } finally {
      setIsProcessing(false);
    }
  };

  const textClass = isDark ? 'text-white' : 'text-neutral-900';
  const subTextClass = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const bgClass = isDark ? 'bg-[#050505]' : 'bg-neutral-50';
  const cardBgClass = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const borderClass = isDark ? 'border-white/5' : 'border-neutral-200';

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`} edges={['top']}>
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => {
            if (step === 'intro') {
              router.back();
            } else {
              setStep('intro');
            }
          }}
          className={`h-10 w-10 rounded-xl items-center justify-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
        >
          <IconSymbol name="chevron.left" size={18} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className={`text-2xl font-black ${textClass} tracking-tighter`}>Security Setup</Text>
        </View>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 0, flexGrow: 1 }}>
        {/* STEP 1: INTRO */}
        {step === 'intro' && (
          <View className="flex-1 pt-6">
            <View className="items-center mb-5">
              <View className={`w-24 h-24 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500/10'} items-center justify-center border-4 ${borderClass}`}>
                <IconSymbol name="lock.fill" size={48} color="#10b981" />
              </View>
              <Text className={`text-2xl font-black ${textClass} tracking-tighter mt-4`}>Zero-Knowledge Security</Text>
              <Text className={`mt-2 text-center font-medium leading-relaxed ${subTextClass}`}>
                Your data will be encrypted on your device before it ever reaches the cloud.
              </Text>
            </View>

            <View className="mb-6">
              <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Security Status</Text>
              <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
                <View className={`p-5 border-b ${borderClass} flex-row items-center gap-x-4`}>
                  <View className={`p-2 rounded-full ${isDark ? 'bg-primary/10' : 'bg-primary/5'}`}>
                    <IconSymbol name="shield.fill" size={16} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Text className={`${textClass} font-bold`}>End-to-End Encryption</Text>
                    <Text className={`${subTextClass} text-[10px]`}>Active for all financial transactions</Text>
                  </View>
                </View>

                <View className="p-5 bg-red-500/[0.03]">
                  <View className="flex-row items-center gap-x-3 mb-1">
                    <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#ef4444" />
                    <Text className="text-red-400 font-bold text-xs">Important Warning</Text>
                  </View>
                  <Text className={`${subTextClass} text-[11px] leading-4`}>
                    If you lose your Recovery Phrase, your data is gone forever. There is no password reset for zero-knowledge data.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setStep('phrase')}
              className="bg-primary rounded-[32px] py-5 items-center shadow-lg shadow-primary/20"
            >
              <Text className="text-[#050505] font-black uppercase tracking-widest text-xs">Generate Recovery Phrase</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: PHRASE DISPLAY */}
        {step === 'phrase' && (
          <View className="pt-4">
            <View className="items-center mb-8">
              <View className={`p-4 rounded-full ${isDark ? 'bg-primary/10' : 'bg-primary/5'} mb-4`}>
                <IconSymbol name="key.fill" size={24} color="#10b981" />
              </View>
              <Text className={`text-2xl font-black ${textClass} tracking-tighter`}>Recovery Phrase</Text>
              <Text className={`mt-2 text-center font-medium ${subTextClass}`}>
                Write down these 24 words in the exact order.
              </Text>
            </View>

            <View className="mb-8">
              <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Your 24 Words</Text>
              <View className={`${cardBgClass} rounded-[32px] border ${borderClass} p-5`}>
                <View className="flex-row flex-wrap justify-between">
                  {words.map((word, index) => (
                    <View key={index} className="w-[48%] flex-row items-center mb-3">
                      <Text className={`text-[10px] font-black w-6 ${isDark ? 'text-white/20' : 'text-black/20'}`}>{index + 1}</Text>
                      <Text className={`font-bold ${textClass}`}>{word}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(phrase);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    CustomAlert.alert('Copied', 'Recovery phrase copied to clipboard. Store it securely!');
                  }}
                  className={`mt-4 flex-row items-center justify-center py-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                >
                  <Text className={`font-black uppercase tracking-widest text-[10px] ${textClass}`}>Copy to Clipboard</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setStep('quiz')}
              className="bg-primary rounded-[32px] py-5 items-center shadow-lg shadow-primary/20"
            >
              <Text className="text-[#050505] font-black uppercase tracking-widest text-xs">I've Written It Down</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: QUIZ */}
        {step === 'quiz' && (
          <View className="pt-4">
            <View className="items-center mb-10">
              <View className={`p-4 rounded-full ${isDark ? 'bg-primary/10' : 'bg-primary/5'} mb-4`}>
                <IconSymbol name="checkmark.shield.fill" size={24} color="#10b981" />
              </View>
              <Text className={`text-2xl font-black ${textClass} tracking-tighter`}>Verify Backup</Text>
              <Text className={`mt-2 text-center font-medium ${subTextClass}`}>
                Confirm your backup by entering the requested words.
              </Text>
            </View>

            <View className="mb-10">
              <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Security Quiz</Text>
              <View className={`${cardBgClass} rounded-[32px] border ${borderClass} p-5 gap-y-6`}>
                {quiz.map((q) => (
                  <View key={q.position}>
                    <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest mb-2 ml-1`}>Word #{q.position}</Text>
                    <TextInput
                      className={`border rounded-xl px-4 py-3.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}
                      placeholder={`Enter word #${q.position}`}
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "#94a3b8"}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={quizAnswers[q.position] || ''}
                      onChangeText={(text) => setQuizAnswers(prev => ({ ...prev, [q.position]: text.toLowerCase().trim() }))}
                    />
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleVerifyQuiz}
              className="bg-primary rounded-[32px] py-5 items-center shadow-lg shadow-primary/20"
            >
              <Text className="text-[#050505] font-black uppercase tracking-widest text-xs">Verify & Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: PASSPHRASE */}
        {step === 'passphrase' && (
          <View className="pt-4">
            <View className="items-center mb-10">
              <View className={`p-4 rounded-full ${isDark ? 'bg-primary/10' : 'bg-primary/5'} mb-4`}>
                <IconSymbol name="lock.fill" size={24} color="#10b981" />
              </View>
              <Text className={`text-2xl font-black ${textClass} tracking-tighter`}>Daily Passphrase</Text>
              <Text className={`mt-2 text-center font-medium ${subTextClass}`}>
                Used for quick, daily access to your encrypted data.
              </Text>
            </View>

            <View className="mb-10">
              <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Set Passphrase</Text>
              <View className={`${cardBgClass} rounded-[32px] border ${borderClass} p-5 gap-y-6`}>
                <View>
                  <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest mb-2 ml-1`}>Passphrase</Text>
                  <PasswordInput
                    className="flex-1 text-base"
                    containerClass={`border rounded-xl px-4 py-1.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "#94a3b8"}
                    value={passphrase}
                    onChangeText={setPassphrase}
                    isDark={isDark}
                    style={{ color: isDark ? 'white' : '#0f172a' }}
                  />
                </View>

                <View>
                  <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest mb-2 ml-1`}>Confirm Passphrase</Text>
                  <PasswordInput
                    className="flex-1 text-base"
                    containerClass={`border rounded-xl px-4 py-1.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}
                    placeholder="Re-enter passphrase"
                    placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "#94a3b8"}
                    value={confirmPassphrase}
                    onChangeText={setConfirmPassphrase}
                    isDark={isDark}
                    style={{ color: isDark ? 'white' : '#0f172a' }}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSetupE2EE}
              disabled={isProcessing}
              className={`rounded-[32px] py-5 items-center shadow-lg ${isProcessing ? 'bg-primary/50' : 'bg-primary shadow-primary/20'}`}
            >
              {isProcessing ? (
                <ActivityIndicator color={isDark ? "#050505" : "white"} />
              ) : (
                <Text className="text-[#050505] font-black uppercase tracking-widest text-xs">Complete Setup</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
