import { IconSymbol } from '@/components/ui/icon-symbol';
import { VaultUnlockModal } from '@/components/VaultUnlockModal';
import { CustomAlert } from '@/components/ui/CustomAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link, router, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { clearActiveDEK, E2EEState, getE2EEState, unlockVault } from '../../lib/key-manager';
import { NotificationService } from '../../lib/notification-service';
import { syncData } from '../../lib/sync';

export default function CloudVaultScreen() {
  const { isDark } = useTheme();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [e2eeState, setE2eeState] = React.useState<E2EEState | null>(null);
  const [showVaultModal, setShowVaultModal] = React.useState(false);

  const fetchState = React.useCallback(async () => {
    const state = await getE2EEState();
    setE2eeState(state);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchState();
    }, [fetchState])
  );

  const handleManualSync = async () => {
    const state = await getE2EEState();
    if (state.isEnabled && state.isVaultLocked) {
      CustomAlert.alert(
        "Vault Locked",
        "Your cloud data is encrypted. Please unlock your vault before syncing.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsSyncing(true);
    try {
      await syncData();
      CustomAlert.alert("Sync Complete", "Your local data is now synchronized with the cloud.");
    } catch (error: any) {
      console.error('Manual Sync Error:', error);
      CustomAlert.alert("Sync Failed", error.message || "An error occurred during synchronization.");
    } finally {
      setIsSyncing(false);
    }
  };

  const borderClass = isDark ? 'border-white/5' : 'border-neutral-200';
  const cardBgClass = isDark ? 'bg-[#151515]' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-neutral-900';
  const subTextClass = isDark ? 'text-white/40' : 'text-neutral-500';

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-neutral-50'}`} edges={['top']}>
      <Stack.Screen options={{ title: 'Cloud & Vault', headerShown: false }} />
      
      <View className="px-4 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className={`h-10 w-10 items-center justify-center rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
          <IconSymbol name="chevron.left" size={20} color={isDark ? 'white' : 'black'} />
        </TouchableOpacity>
        <Text className={`text-lg font-black tracking-tight ${textClass}`}>Cloud & Vault</Text>
        <TouchableOpacity
          onPress={handleManualSync}
          disabled={isSyncing}
          className={`h-10 w-10 items-center justify-center rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : (
            <IconSymbol name="arrow.triangle.2.circlepath" size={20} color="#10b981" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="py-6 items-center">
          <View className={`${cardBgClass} rounded-[40px] border ${borderClass} overflow-hidden shadow-2xl shadow-primary/5 w-full`}>
            <View className="p-8 items-center">
              <View className="items-center mb-8">
                <Text className={`text-2xl font-black ${textClass} tracking-tight mb-1 text-center`}>
                  Cloud Intelligence
                </Text>
                <Text className={`text-[10px] ${subTextClass} uppercase font-black tracking-[2px] text-center`}>
                  {e2eeState?.isEnabled ? 'Zero-Knowledge AES-256' : 'Standard Supabase Protection'}
                </Text>
              </View>

              {/* Action Area */}
              {e2eeState?.isEnabled ? (
                <View className="gap-y-3 w-full">
                  {e2eeState.isVaultLocked ? (
                    <TouchableOpacity
                      onPress={() => setShowVaultModal(true)}
                      className="bg-emerald-500 py-4 rounded-2xl items-center shadow-lg shadow-emerald-500/20"
                    >
                      <Text className="text-[#050505] font-black text-xs uppercase tracking-widest">Unlock Encryption Vault</Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-row gap-x-3 w-full">
                      <Link href="/settings/dek-rotation" asChild>
                        <TouchableOpacity className={`flex-1 py-3 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/10'} items-center`}>
                          <Text className={`${textClass} font-bold text-[10px] uppercase tracking-widest`}>Rotate Keys</Text>
                        </TouchableOpacity>
                      </Link>
                      <TouchableOpacity
                        onPress={async () => {
                          await clearActiveDEK();
                          fetchState();
                        }}
                        className={`flex-1 py-3 rounded-2xl border border-red-500/20 bg-red-500/5 items-center`}
                      >
                        <Text className="text-red-400 font-bold text-[10px] uppercase tracking-widest">Lock Vault</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => router.push('/onboarding/e2ee-recovery')}
                    className="py-4 items-center"
                  >
                    <Text className={`${subTextClass} font-bold text-[10px] uppercase tracking-widest`}>Recover Vault via Key</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-y-3 w-full">
                  <Link href="/onboarding/e2ee-setup" asChild>
                    <TouchableOpacity className="bg-emerald-500/10 border border-emerald-500/20 py-4 rounded-2xl items-center">
                      <Text className="text-emerald-500 font-black text-xs uppercase tracking-widest">Enable End-to-End Encryption</Text>
                    </TouchableOpacity>
                  </Link>
                  <TouchableOpacity
                    onPress={() => router.push('/onboarding/e2ee-recovery')}
                    className="py-4 items-center flex-row justify-center gap-x-2"
                  >
                    <Text className="text-primary font-black text-[10px] uppercase tracking-widest">Recover Existing Vault</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="py-4">
           <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-4 opacity-30`}>Security Info</Text>
           <View className={`${cardBgClass} rounded-[32px] border ${borderClass} p-6 gap-y-4`}>
              <View className="flex-row gap-x-4">
                 <IconSymbol name="shield.fill" size={20} color="#10b981" />
                 <View className="flex-1">
                    <Text className={`${textClass} font-bold text-sm mb-1`}>Bank-Grade Encryption</Text>
                    <Text className={`${subTextClass} text-[11px] leading-4`}>When enabled, your financial data is encrypted locally with your master passphrase before ever touching our servers.</Text>
                 </View>
              </View>
              <View className="flex-row gap-x-4">
                 <IconSymbol name="icloud.fill" size={20} color="#10b981" />
                 <View className="flex-1">
                    <Text className={`${textClass} font-bold text-sm mb-1`}>Automatic Sync</Text>
                    <Text className={`${subTextClass} text-[11px] leading-4`}>Your data is automatically synced across all your devices securely.</Text>
                 </View>
              </View>
           </View>
        </View>
      </ScrollView>

      <VaultUnlockModal
        isVisible={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        onSubmit={async (pass) => {
          await unlockVault(pass);
          fetchState();
          setShowVaultModal(false);
        }}
      />
    </SafeAreaView>
  );
}
