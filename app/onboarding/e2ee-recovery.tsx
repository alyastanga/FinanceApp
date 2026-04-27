import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { isValidSeedPhrase } from '../../lib/bip39-service';
import { recoverFromSeedPhrase } from '../../lib/key-manager';

export default function E2EERecoveryScreen() {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
    <ScrollView className="flex-1 bg-neutral-950 p-6 pt-16">
      <View className="max-w-md mx-auto w-full pb-10">
        <View className="w-16 h-16 bg-blue-900 rounded-full items-center justify-center mb-6">
          <Text className="text-blue-300 text-2xl">🔑</Text>
        </View>
        
        <Text className="text-3xl font-bold text-white mb-2">Account Recovery</Text>
        <Text className="text-neutral-400 mb-8 leading-relaxed">
          Enter your 24-word Secret Recovery Phrase to unlock your encrypted cloud data on this device.
        </Text>

        <View className="mb-6">
          <Text className="text-neutral-300 font-medium mb-2 ml-1">Recovery Phrase</Text>
          <TextInput
            className="bg-neutral-900 text-white p-4 rounded-xl border border-neutral-800 min-h-[120px]"
            placeholder="Paste your 24 words here separated by spaces..."
            placeholderTextColor="#52525b"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            value={seedPhrase}
            onChangeText={setSeedPhrase}
            textAlignVertical="top"
          />
        </View>

        <View className="mb-8 p-4 bg-blue-950/30 rounded-xl border border-blue-900/50">
          <Text className="text-blue-400 font-semibold mb-2">New Local Passphrase</Text>
          <Text className="text-blue-200/80 text-sm mb-4">
            Create a new daily passphrase for this device. This secures your key locally.
          </Text>

          <View className="mb-4">
            <TextInput
              className="bg-neutral-900 text-white p-4 rounded-xl border border-neutral-800"
              placeholder="New Passphrase (Min. 8 characters)"
              placeholderTextColor="#52525b"
              secureTextEntry
              value={newPassphrase}
              onChangeText={setNewPassphrase}
            />
          </View>
          
          <View>
            <TextInput
              className="bg-neutral-900 text-white p-4 rounded-xl border border-neutral-800"
              placeholder="Confirm New Passphrase"
              placeholderTextColor="#52525b"
              secureTextEntry
              value={confirmPassphrase}
              onChangeText={setConfirmPassphrase}
            />
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleRecovery}
          disabled={isProcessing}
          className={`w-full py-4 rounded-xl shadow-lg ${isProcessing ? 'bg-blue-800' : 'bg-blue-600 shadow-blue-900/20'}`}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">Recover Data</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-full py-4 mt-2"
        >
          <Text className="text-neutral-400 text-center font-medium">Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
