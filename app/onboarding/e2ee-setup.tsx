import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { generateSeedPhrase, generateConfirmationQuiz, verifyQuizAnswers } from '../../lib/bip39-service';
import { setupE2EE } from '../../lib/key-manager';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

type SetupStep = 'intro' | 'phrase' | 'quiz' | 'passphrase';

export default function E2EESetupScreen() {
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
      Alert.alert('Incorrect', 'One or more words are incorrect. Please check your backup and try again.');
    }
  };

  const handleSetupE2EE = async () => {
    if (passphrase.length < 8) {
      Alert.alert('Error', 'Passphrase must be at least 8 characters long.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      Alert.alert('Error', 'Passphrases do not match.');
      return;
    }

    setIsProcessing(true);
    try {
      await setupE2EE(passphrase, { seedPhrase: phrase, phraseHash });
      Alert.alert('Success', 'Your zero-knowledge cloud storage is now fully configured.', [
        { text: 'Continue', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to setup encryption.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View className="flex-1 bg-neutral-950 p-6 pt-16">
      
      {/* STEP 1: INTRO */}
      {step === 'intro' && (
        <View className="flex-1 justify-center items-center max-w-md mx-auto">
          <View className="w-16 h-16 bg-blue-900 rounded-full items-center justify-center mb-6">
            <Text className="text-blue-300 text-2xl">🔒</Text>
          </View>
          <Text className="text-3xl font-bold text-white text-center mb-4">Zero-Knowledge Security</Text>
          <Text className="text-neutral-400 text-center mb-8 text-lg leading-relaxed">
            Your data will be encrypted on your device before it ever reaches the cloud. 
            Even we cannot see your financial data.
          </Text>
          
          <View className="bg-red-950/30 p-4 rounded-xl border border-red-900/50 mb-8 w-full">
            <Text className="text-red-400 font-semibold mb-2">⚠️ Important Warning</Text>
            <Text className="text-red-200/80 leading-relaxed">
              If you lose your device and forget your Recovery Phrase, your data will be permanently unrecoverable. 
              There is no "forgot password" button.
            </Text>
          </View>

          <TouchableOpacity 
            onPress={() => setStep('phrase')}
            className="bg-blue-600 w-full py-4 rounded-xl shadow-lg shadow-blue-900/20"
          >
            <Text className="text-white text-center font-bold text-lg">Generate Recovery Phrase</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2: PHRASE DISPLAY */}
      {step === 'phrase' && (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-2xl font-bold text-white mb-2">Secret Recovery Phrase</Text>
          <Text className="text-neutral-400 mb-6">
            Write down these 24 words in the exact order. Do not save them digitally. Screenshots are disabled for your security.
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {words.map((word, index) => (
              <View key={index} className="w-[48%] bg-neutral-900 p-3 rounded-lg border border-neutral-800 mb-3 flex-row items-center">
                <Text className="text-neutral-500 w-6">{index + 1}.</Text>
                <Text className="text-white font-medium ml-2">{word}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity 
            onPress={async () => {
              await Clipboard.setStringAsync(phrase);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Copied', 'Recovery phrase copied to clipboard. Store it securely!');
            }}
            className="flex-row items-center justify-center py-3 bg-neutral-900 rounded-xl border border-neutral-800 mt-2"
          >
            <Text className="text-neutral-400 font-bold uppercase tracking-widest text-xs">Copy Recovery Phrase</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setStep('quiz')}
            className="bg-blue-600 w-full py-4 rounded-xl mt-6 shadow-lg shadow-blue-900/20"
          >
            <Text className="text-white text-center font-bold text-lg">I've Written It Down</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STEP 3: QUIZ */}
      {step === 'quiz' && (
        <View className="flex-1 justify-center max-w-md mx-auto w-full">
          <Text className="text-2xl font-bold text-white mb-2">Verify Backup</Text>
          <Text className="text-neutral-400 mb-8">
            To make sure you've written down your phrase correctly, please enter the requested words below.
          </Text>

          {quiz.map((q) => (
            <View key={q.position} className="mb-4">
              <Text className="text-neutral-300 font-medium mb-2 ml-1">Word #{q.position}</Text>
              <TextInput
                className="bg-neutral-900 text-white p-4 rounded-xl border border-neutral-800"
                placeholder={`Enter word #${q.position}`}
                placeholderTextColor="#52525b"
                autoCapitalize="none"
                autoCorrect={false}
                value={quizAnswers[q.position] || ''}
                onChangeText={(text) => setQuizAnswers(prev => ({ ...prev, [q.position]: text.toLowerCase().trim() }))}
              />
            </View>
          ))}

          <TouchableOpacity 
            onPress={handleVerifyQuiz}
            className="bg-blue-600 w-full py-4 rounded-xl mt-6 shadow-lg shadow-blue-900/20"
          >
            <Text className="text-white text-center font-bold text-lg">Verify</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 4: PASSPHRASE */}
      {step === 'passphrase' && (
        <View className="flex-1 justify-center max-w-md mx-auto w-full">
          <Text className="text-2xl font-bold text-white mb-2">Set Daily Passphrase</Text>
          <Text className="text-neutral-400 mb-8">
            This passphrase will be used to quickly unlock your local app data. It replaces your Recovery Phrase for daily use.
          </Text>

          <View className="mb-4">
            <Text className="text-neutral-300 font-medium mb-2 ml-1">Passphrase</Text>
            <TextInput
              className="bg-neutral-900 text-white p-4 rounded-xl border border-neutral-800"
              placeholder="Min. 8 characters"
              placeholderTextColor="#52525b"
              secureTextEntry
              value={passphrase}
              onChangeText={setPassphrase}
            />
          </View>

          <View className="mb-8">
            <Text className="text-neutral-300 font-medium mb-2 ml-1">Confirm Passphrase</Text>
            <TextInput
              className="bg-neutral-900 text-white p-4 rounded-xl border border-neutral-800"
              placeholder="Re-enter passphrase"
              placeholderTextColor="#52525b"
              secureTextEntry
              value={confirmPassphrase}
              onChangeText={setConfirmPassphrase}
            />
          </View>

          <TouchableOpacity 
            onPress={handleSetupE2EE}
            disabled={isProcessing}
            className={`w-full py-4 rounded-xl shadow-lg ${isProcessing ? 'bg-blue-800' : 'bg-blue-600 shadow-blue-900/20'}`}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-center font-bold text-lg">Complete Setup</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}
