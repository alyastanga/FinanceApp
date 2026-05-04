import { router, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useTheme } from '../../context/ThemeContext';
import { resumeRotation, startRotation } from '../../lib/dek-rotation';
import { getRotationCheckpoint, RotationProgress } from '../../lib/key-manager';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { CustomAlert } from '../../components/ui/CustomAlert';

export default function DEKRotationScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();

  const [passphrase, setPassphrase] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');

  const [isRotating, setIsRotating] = useState(false);
  const [progress, setProgress] = useState<RotationProgress | null>(null);

  const textClass = isDark ? 'text-white' : 'text-neutral-900';
  const subTextClass = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const bgClass = isDark ? 'bg-[#050505]' : 'bg-neutral-50';
  const cardBgClass = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const borderClass = isDark ? 'border-white/5' : 'border-neutral-200';
  const inputBgClass = isDark ? 'bg-black/40' : 'bg-neutral-100';

  // Check for interrupted rotation on mount
  useEffect(() => {
    async function checkResume() {
      const checkpoint = await getRotationCheckpoint();
      if (checkpoint && checkpoint.status === 'in_progress') {
        CustomAlert.alert(
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
        CustomAlert.alert(
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
      CustomAlert.alert('Success', 'Your encryption key has been successfully rotated and all records re-secured.', [
        { text: 'Done', onPress: () => router.back() }
      ]);
    } else if (p.status === 'interrupted') {
      setIsRotating(false);
      CustomAlert.alert('Error', 'Rotation failed. Please try again or check your connection.');
    }
  };

  const executeResume = async () => {
    setIsRotating(true);
    try {
      await resumeRotation(onProgressUpdate);
    } catch (err: any) {
      setIsRotating(false);
      CustomAlert.alert('Error', err.message || 'Failed to resume rotation.');
    }
  };

  const handleStartRotation = async () => {
    const cleanPhrase = seedPhrase.toLowerCase().replace(/\s+/g, ' ').trim();
    if (cleanPhrase.split(' ').length !== 24) {
      CustomAlert.alert('Error', 'Please enter your exactly 24-word Recovery Phrase.');
      return;
    }
    if (passphrase.length < 8) {
      CustomAlert.alert('Error', 'Invalid daily passphrase.');
      return;
    }

    CustomAlert.alert(
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
              CustomAlert.alert('Authentication Failed', err.message || 'The passphrase or seed phrase is incorrect.');
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
    <SafeAreaView className={`flex-1 ${bgClass}`} edges={['top']}>
      <View className="px-gsd-lg py-gsd-lg flex-row items-center">
        <TouchableOpacity
          onPress={() => !isRotating && router.back()}
          disabled={isRotating}
          className={`z-10 h-gsd-huge w-gsd-huge rounded-gsd-md items-center justify-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
        >
          <IconSymbol name="chevron.left" size={18} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className={`text-2xl font-black ${textClass} tracking-tighter`}>Rotation</Text>
        </View>
        <View className="w-gsd-huge" />
      </View>

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        <View className="max-w-md mx-auto w-full pb-10">
          <Text className={`${subTextClass} mb-8 leading-relaxed font-medium`}>
            If you believe your encryption key is compromised, or you want to revoke access from a lost device, you can rotate your key. This will re-encrypt all your cloud data.
          </Text>

          {!isRotating ? (
            <>
              <View className={`${cardBgClass} p-5 rounded-[32px] border ${borderClass} mb-8`}>
                <Text className={`${textClass} font-black text-[10px] uppercase tracking-[3px] mb-6 opacity-40 ml-1`}>Authentication Required</Text>

                <View className="mb-6">
                  <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest mb-2 ml-1`}>Daily Passphrase</Text>
                  <PasswordInput
                    className={`${textClass} font-medium`}
                    containerClass={`${inputBgClass} p-4 rounded-2xl border ${borderClass}`}
                    placeholder="Enter current passphrase"
                    placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)"}
                    value={passphrase}
                    onChangeText={setPassphrase}
                    isDark={isDark}
                  />
                </View>

                <View>
                  <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest mb-2 ml-1`}>Recovery Phrase</Text>
                  <TextInput
                    className={`${inputBgClass} ${textClass} p-4 rounded-2xl border ${borderClass} min-h-[120px] font-medium`}
                    placeholder="Paste your 24 words here..."
                    placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)"}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={seedPhrase}
                    onChangeText={setSeedPhrase}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleStartRotation}
                className="w-full py-5 rounded-[32px] shadow-xl bg-red-500 shadow-red-500/20"
              >
                <Text className="text-white text-center font-black text-xs uppercase tracking-widest">Initiate Rotation</Text>
              </TouchableOpacity>

              <Text className={`${subTextClass} text-[9px] text-center mt-6 px-6 leading-4 font-bold uppercase tracking-tight`}>
                Warning: This process may take several minutes depending on your record count. Do not close the app.
              </Text>
            </>
          ) : (
            <View className={`${cardBgClass} p-8 rounded-[40px] border ${borderClass} items-center shadow-2xl`}>
              <ActivityIndicator size="large" color="#f87171" className="mb-6" />
              <Text className={`text-2xl font-black ${textClass} mb-2 tracking-tight`}>Rotating Keys...</Text>

              <View className="w-full h-3 bg-neutral-800 rounded-full my-6 overflow-hidden">
                <View
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </View>

              <Text className={`${textClass} font-black text-[10px] uppercase tracking-widest opacity-60`}>
                {progress ? `Processing ${progress.completed} / ${progress.total} records` : 'Initializing...'}
              </Text>

              <View className={`mt-8 p-4 rounded-2xl ${isDark ? 'bg-red-500/5' : 'bg-red-500/10'} border border-red-500/20`}>
                <Text className="text-red-400 text-center text-xs font-bold leading-5">
                  Critical security process in progress. Sync is paused to ensure data integrity.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
