import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { startRotation, resumeRotation } from '../../lib/dek-rotation';
import { getRotationCheckpoint, RotationProgress } from '../../lib/key-manager';

export default function DEKRotationScreen() {
  const navigation = useNavigation();

  const [passphrase, setPassphrase] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');
  
  const [isRotating, setIsRotating] = useState(false);
  const [progress, setProgress] = useState<RotationProgress | null>(null);

  // Check for interrupted rotation on mount
  useEffect(() => {
    async function checkResume() {
      const checkpoint = await getRotationCheckpoint();
      if (checkpoint && checkpoint.status === 'in_progress') {
        Alert.alert(
          'Rotation Interrupted', 
          'A previous key rotation was interrupted. The app will now resume the process to secure your data.',
          [{ text: 'Resume', onPress: executeResume }]
        );
      }
    }
    checkResume();
  }, []);

  // Block back navigation if rotation is active
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isRotating) {
        e.preventDefault();
        Alert.alert(
          'Rotation in Progress',
          'Please wait until the key rotation is complete to avoid data inconsistency. If you force close the app, it will resume automatically on next launch.'
        );
      }
    });
    return unsubscribe;
  }, [navigation, isRotating]);

  const onProgressUpdate = (p: RotationProgress) => {
    setProgress(p);
    if (p.status === 'completed') {
      setIsRotating(false);
      Alert.alert('Success', 'Your encryption key has been successfully rotated and all records re-secured.', [
        { text: 'Done', onPress: () => router.back() }
      ]);
    } else if (p.status === 'interrupted') {
      setIsRotating(false);
      Alert.alert('Error', 'Rotation failed. Please try again or check your connection.');
    }
  };

  const executeResume = async () => {
    setIsRotating(true);
    try {
      await resumeRotation(onProgressUpdate);
    } catch (err: any) {
      setIsRotating(false);
      Alert.alert('Error', err.message || 'Failed to resume rotation.');
    }
  };

  const handleStartRotation = async () => {
    const cleanPhrase = seedPhrase.toLowerCase().replace(/\s+/g, ' ').trim();
    if (cleanPhrase.split(' ').length !== 24) {
      Alert.alert('Error', 'Please enter your exactly 24-word Recovery Phrase.');
      return;
    }
    if (passphrase.length < 8) {
      Alert.alert('Error', 'Invalid daily passphrase.');
      return;
    }

    Alert.alert(
      'Confirm Rotation',
      'This will replace your current encryption key. All your data will be re-encrypted and synced. Do not close the app until complete.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Rotation', 
          style: 'destructive',
          onPress: async () => {
            setIsRotating(true);
            try {
              await startRotation(passphrase, cleanPhrase);
              await resumeRotation(onProgressUpdate);
            } catch (err: any) {
              setIsRotating(false);
              Alert.alert('Authentication Failed', err.message || 'The passphrase or seed phrase is incorrect.');
            }
          }
        }
      ]
    );
  };

  const percent = progress && progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  return (
    <ScrollView className="flex-1 bg-neutral-950 p-6">
      <View className="max-w-md mx-auto w-full pb-10 mt-4">
        <View className="w-16 h-16 bg-red-900/30 rounded-full items-center justify-center mb-6 border border-red-900/50">
          <Text className="text-red-400 text-2xl">🔄</Text>
        </View>
        
        <Text className="text-3xl font-bold text-white mb-2">Rotate Encryption Key</Text>
        <Text className="text-neutral-400 mb-8 leading-relaxed">
          If you believe your encryption key is compromised, or you want to revoke access from a lost device, you can rotate your key. This will re-encrypt all your cloud data.
        </Text>

        {!isRotating ? (
          <>
            <View className="mb-6 p-4 bg-neutral-900 rounded-xl border border-neutral-800">
              <Text className="text-neutral-300 font-semibold mb-4">Authentication Required</Text>
              
              <Text className="text-neutral-500 mb-2">Daily Passphrase</Text>
              <TextInput
                className="bg-neutral-950 text-white p-4 rounded-xl border border-neutral-800 mb-4"
                placeholder="Enter current passphrase"
                placeholderTextColor="#52525b"
                secureTextEntry
                value={passphrase}
                onChangeText={setPassphrase}
              />

              <Text className="text-neutral-500 mb-2">Recovery Phrase</Text>
              <TextInput
                className="bg-neutral-950 text-white p-4 rounded-xl border border-neutral-800 min-h-[100px]"
                placeholder="Paste your 24 words here..."
                placeholderTextColor="#52525b"
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                value={seedPhrase}
                onChangeText={setSeedPhrase}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              onPress={handleStartRotation}
              className="w-full py-4 rounded-xl shadow-lg bg-red-600 shadow-red-900/20"
            >
              <Text className="text-white text-center font-bold text-lg">Initiate Rotation</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 items-center">
            <ActivityIndicator size="large" color="#f87171" className="mb-6" />
            <Text className="text-xl font-bold text-white mb-2">Rotating Keys...</Text>
            
            <View className="w-full h-3 bg-neutral-800 rounded-full mb-4 overflow-hidden">
              <View 
                className="h-full bg-red-500 rounded-full" 
                style={{ width: `${percent}%` }}
              />
            </View>
            
            <Text className="text-neutral-400 font-medium">
              {progress ? `Processing ${progress.completed} of ${progress.total} records (${percent}%)` : 'Initializing...'}
            </Text>
            
            <Text className="text-neutral-500 text-center mt-6 text-sm leading-relaxed">
              Please do not close the app. Background sync is temporarily paused to ensure data integrity.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
