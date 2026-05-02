import { IconSymbol } from '@/components/ui/icon-symbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { isValidSeedPhrase } from '../../lib/bip39-service';
import { recoverFromSeedPhrase } from '../../lib/key-manager';

export default function E2EERecoveryScreen() {
  const { isDark } = useTheme();
  const [seedPhrase, setSeedPhrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  const handleRecovery = async () => {
    const cleanPhrase = seedPhrase.toLowerCase().replace(/\s+/g, ' ').trim();

    if (cleanPhrase.split(' ').length !== 24) {
      Alert.alert('Error', 'Please enter exactly 24 words separated by spaces.');
      return;
    }

    if (!isValidSeedPhrase(cleanPhrase)) {
      Alert.alert('Error', 'Invalid recovery phrase. Please check for typos.');
      return;
    }

    if (newPassphrase.length < 8) {
      Alert.alert('Error', 'New passphrase must be at least 8 characters long.');
      return;
    }

    if (newPassphrase !== confirmPassphrase) {
      Alert.alert('Error', 'Passphrases do not match.');
      return;
    }

    setIsProcessing(true);
    try {
      const { recovered, isNewDEK } = await recoverFromSeedPhrase(cleanPhrase, newPassphrase);

      if (recovered) {
        Alert.alert('Success', 'Your encrypted data has been successfully unlocked.', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)') }
        ]);
      } else if (isNewDEK) {
        Alert.alert(
          'New Key Provisioned',
          'No existing cloud data was found for this account. A new encryption key has been provisioned.',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Recovery Failed', err.message || 'Could not recover data. The phrase may not match the original cloud key.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <LinearGradient
        colors={isDark ? ['#10b98108', 'transparent'] : ['#10b98103', 'transparent']}
        className="absolute inset-0"
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className={`p-2 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
            <IconSymbol name="chevron.left" size={24} color={isDark ? "white" : "black"} />
          </TouchableOpacity>
          <Text className={`text-xl font-bold ${textClass}`}>Recovery</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <View className="pt-2 mb-6 items-center">
            <Text className={`${subTextClass} text-xs leading-5 font-medium text-center px-4`}>
              Enter your 24-word phrase to restore cloud access and decrypt your local vault.
            </Text>
          </View>

          <View className="gap-y-6">
            {/* Seed Phrase Input */}
            <View>
              <BlurView intensity={isDark ? 10 : 20} tint={isDark ? "dark" : "light"} className={`rounded-[24px] border overflow-hidden ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                <TextInput
                  className={`p-5 text-sm font-bold ${textClass} min-h-[100px]`}
                  placeholder="Paste 24-word Secret Phrase..."
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)"}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={seedPhrase}
                  onChangeText={setSeedPhrase}
                  textAlignVertical="top"
                />
              </BlurView>
            </View>

            {/* New Passphrase Section */}
            <View className={`p-6 rounded-[32px] border ${isDark ? 'bg-primary/5 border-primary/10' : 'bg-primary/5 border-primary/20'}`}>
              <View className="flex-row items-center gap-x-2 mb-3">
                <IconSymbol name="shield.fill" size={14} color="#10b981" />
                <Text className="text-[9px] font-black uppercase text-primary tracking-[2px]">Local Passphrase</Text>
              </View>

              <View className="gap-y-3">
                <View className={`rounded-[16px] border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/50 border-black/5'}`}>
                  <TextInput
                    className={`px-5 py-3 text-sm font-bold ${textClass}`}
                    placeholder="New Passphrase (8+ chars)"
                    placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)"}
                    secureTextEntry
                    value={newPassphrase}
                    onChangeText={setNewPassphrase}
                  />
                </View>
                <View className={`rounded-[16px] border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/50 border-black/5'}`}>
                  <TextInput
                    className={`px-5 py-3 text-sm font-bold ${textClass}`}
                    placeholder="Confirm Passphrase"
                    placeholderTextColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)"}
                    secureTextEntry
                    value={confirmPassphrase}
                    onChangeText={setConfirmPassphrase}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleRecovery}
              disabled={isProcessing}
              activeOpacity={0.8}
              className={`w-full py-5 rounded-[24px] shadow-lg ${isProcessing ? 'bg-primary/50' : 'bg-primary shadow-primary/20'}`}
            >
              {isProcessing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className="text-[#050505] text-center font-black uppercase tracking-[2px] text-[10px]">Unlock & Recover Data</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
