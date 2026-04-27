import { AIToggle } from '@/components/ui/AIToggle';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { seedDatabase } from '../../_tests_dev/seed';
import { useAI } from '../../context/AIContext';
import { SUPPORTED_CURRENCIES, useCurrency } from '../../context/CurrencyContext';
import { useSecurity } from '../../context/SecurityContext';
import { useTheme } from '../../context/ThemeContext';
import { clearAllUserData, clearLocalData, clearCloudData } from '../../lib/data-management';
import { E2EEState, getE2EEState, unlockVault, clearActiveDEK } from '../../lib/key-manager';
import { syncData } from '../../lib/sync';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const { isBiometricsEnabled, toggleBiometrics, canAuthenticate } = useSecurity();
  const { aiMode, setAiMode } = useAI();
  const { setTheme, isDark } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [e2eeState, setE2eeState] = React.useState<E2EEState | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const fetchState = async () => {
        const state = await getE2EEState();
        if (isMounted) setE2eeState(state);
      };
      fetchState();
      return () => { isMounted = false; };
    }, [])
  );

  const handleManualSync = async () => {
    const state = await getE2EEState();
    if (state.isEnabled && state.isVaultLocked) {
      Alert.alert(
        "Vault Locked",
        "Your cloud data is encrypted. Please unlock your vault in the 'Security & Encryption' section before syncing.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsSyncing(true);
    try {
      await syncData();
      Alert.alert("Sync Complete", "Your local data is now synchronized with the cloud.");
    } catch (error: any) {
      console.error('Manual Sync Error:', error);
      Alert.alert("Sync Failed", error.message || "An error occurred during synchronization.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSeed = async () => {
    Alert.alert(
      "Seed Database",
      "This will wipe all current local data and replace it with mock data for testing. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Seed",
          style: "destructive",
          onPress: async () => {
            const success = await seedDatabase();
            if (success) {
              Alert.alert("Success", "Database seeded with Mission Control mock data.");
            } else {
              Alert.alert("Error", "Seeding failed. Check console for details.");
            }
          }
        }
      ]
    );
  };

  const borderClass = isDark ? 'border-white/5' : 'border-black/5';
  const cardBgClass = isDark ? 'bg-[#151515]' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>
      <ScrollView 
        className="flex-1 px-4" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={handleManualSync}
            tintColor={isDark ? "#10b981" : "#059669"}
            colors={["#10b981"]}
          />
        }
      >
        <View className="pt-6 mb-8">
          <Text className={`text-3xl font-black ${textClass} mb-2`}>Settings</Text>
          <Text className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
            Preferences & Account
          </Text>
        </View>

        {/* Preferences Section */}
        <View className="mb-8">
          <Text className={`text-xs font-black ${textClass} uppercase tracking-widest ml-2 mb-4`}>Preferences</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <View className={`flex-row items-center justify-between p-5 border-b ${borderClass}`}>
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="moon.fill" size={20} color={isDark ? "rgba(255,255,255,0.7)" : "#666"} />
                <Text className={`${textClass} font-medium text-base`}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
                trackColor={{ false: "#ccc", true: "#10b981" }}
              />
            </View>

            <View className={`p-5 border-b ${borderClass}`}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-x-3">
                  <IconSymbol name="sparkles" size={20} color="#8b5cf6" />
                  <Text className={`${textClass} font-medium text-base`}>AI Intelligence</Text>
                </View>
                <AIToggle mode={aiMode} onToggle={setAiMode} />
              </View>
              <Text className="text-[10px] text-muted-foreground leading-4 mb-4">
                {aiMode === 'cloud'
                  ? 'Cloud Mode uses high-performance models for complex budgeting analysis.'
                  : 'Local Mode uses on-device inference for maximum privacy and offline stability.'}
              </Text>

              <Link href="/model-settings" asChild>
                <TouchableOpacity className="flex-row items-center justify-between">
                  <Text className="text-primary text-[10px] font-black uppercase tracking-widest">Manage Native AI Engine</Text>
                  <IconSymbol name="chevron.right" size={14} color="#10b981" />
                </TouchableOpacity>
              </Link>
            </View>

            <View className="flex-row items-center justify-between p-5">
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="bell.fill" size={20} color={isDark ? "rgba(255,255,255,0.7)" : "#666"} />
                <Text className={`${textClass} font-medium text-base`}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#ccc", true: "#10b981" }}
              />
            </View>
          </View>
        </View>


        {/* Financial Context Section */}
        <View className="mb-8">
          <Text className={`text-xs font-black ${textClass} uppercase tracking-widest ml-2 mb-4`}>Financial Context</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} p-6`}>
            <View className="flex-row items-center gap-x-3 mb-6">
              <IconSymbol name="dollarsign.circle.fill" size={20} color="#10b981" />
              <View>
                <Text className={`${textClass} font-bold text-base`}>Primary Currency</Text>
                <Text className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Live Exchange Rates</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ columnGap: 12 }}
            >
              {[...SUPPORTED_CURRENCIES].sort((a, b) => a.code === currency ? -1 : b.code === currency ? 1 : 0).map((c) => {
                const isSelected = currency === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => setCurrency(c.code)}
                    className={`px-6 py-4 rounded-2xl border ${isSelected ? 'bg-primary border-primary' : 'bg-white/5 border-white/5'}`}
                  >
                    <Text className={`text-base font-black ${isSelected ? 'text-[#050505]' : 'text-white'}`}>{c.symbol}</Text>
                    <Text className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isSelected ? 'text-[#050505]/60' : 'text-white/40'}`}>{c.code}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Integrations Section */}
        <View className="mb-8">
          <Text className={`text-xs font-black ${textClass} uppercase tracking-widest ml-2 mb-4`}>Integrations</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <TouchableOpacity className={`flex-row items-center justify-between p-5`}>
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="calendar.badge.plus" size={20} color="#10b981" />
                <View>
                  <Text className={`${textClass} font-medium text-base`}>Connect Google Calendar</Text>
                  <Text className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Available in Pro</Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={isDark ? "rgba(255,255,255,0.3)" : "#999"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security & Encryption Section */}
        <View className="mb-8">
          <Text className={`text-xs font-black ${textClass} uppercase tracking-widest ml-2 mb-4`}>Security & Encryption</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>

            {/* Encryption Status */}
            <View className={`p-5 border-b ${borderClass}`}>
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-x-3">
                  <View className={`w-2 h-2 rounded-full ${e2eeState?.isEnabled ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-neutral-500'}`} />
                  <Text className={`${textClass} font-medium text-base`}>Cloud Encryption</Text>
                </View>
                <Text className={`text-[10px] font-black uppercase tracking-widest ${e2eeState?.isEnabled ? 'text-emerald-500' : 'text-neutral-500'}`}>
                  {e2eeState?.isEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <Text className={`${subTextClass} text-xs leading-relaxed`}>
                {e2eeState?.isEnabled
                  ? "All your financial data is encrypted locally using Zero-Knowledge AES-256-GCM before syncing."
                  : "Syncing data to the cloud without end-to-end encryption. Your data is protected by Supabase security but not client-side encrypted."}
              </Text>
            </View>

            {e2eeState?.isEnabled && (
              <View className={`p-5 border-b ${borderClass}`}>
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-x-3">
                    <IconSymbol name={e2eeState.isVaultLocked ? "lock.fill" : "lock.open.fill"} size={20} color={e2eeState.isVaultLocked ? "#f87171" : "#10b981"} />
                    <Text className={`${textClass} font-medium text-base`}>Vault Status</Text>
                  </View>
                  <Text className={`text-[10px] font-black uppercase tracking-widest ${e2eeState.isVaultLocked ? 'text-red-400' : 'text-emerald-500'}`}>
                    {e2eeState.isVaultLocked ? 'Locked' : 'Unlocked'}
                  </Text>
                </View>

                {e2eeState.isVaultLocked ? (
                  <View className="flex-row gap-x-2">
                    <TouchableOpacity
                      onPress={() => {
                        Alert.prompt(
                          "Unlock Vault",
                          "Enter your daily passphrase to unlock your encryption key.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Unlock",
                              onPress: async (pass?: string) => {
                                try {
                                  await unlockVault(pass || '');
                                  const newState = await getE2EEState();
                                  setE2eeState(newState);
                                  Alert.alert("Success", "Vault unlocked. You can now sync your data.");
                                } catch (err: any) {
                                  Alert.alert("Error", "Invalid passphrase.");
                                }
                              }
                            }
                          ],
                          "secure-text"
                        );
                      }}
                      className="flex-1 bg-emerald-500 py-3 rounded-2xl items-center"
                    >
                      <Text className="text-[#050505] font-bold text-xs uppercase tracking-widest">Unlock Vault</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push('/onboarding/e2ee-recovery')}
                      className="bg-neutral-900 px-4 py-3 rounded-2xl border border-white/5 items-center justify-center"
                    >
                      <IconSymbol name="lifepreserver.fill" size={16} color="#10b981" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row gap-x-2">
                    <Link href="/settings/dek-rotation" asChild>
                      <TouchableOpacity className="flex-1 bg-neutral-900 py-3 rounded-2xl border border-white/5 items-center">
                        <Text className="text-white font-bold text-[10px] uppercase tracking-widest">Rotate Key</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                )}
              </View>
            )}

            {!e2eeState?.isEnabled && (
              <Link href="/onboarding/e2ee-setup" asChild>
                <TouchableOpacity className="flex-row items-center justify-between p-5">
                  <View className="flex-row items-center gap-x-3">
                    <IconSymbol name="shield.fill" size={20} color="#10b981" />
                    <Text className="text-emerald-500 font-bold text-base">Enable Zero-Knowledge E2EE</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color="#10b981" />
                </TouchableOpacity>
              </Link>
            )}

            <Link href="/onboarding/e2ee-recovery" asChild>
              <TouchableOpacity className={`flex-row items-center justify-between p-5`}>
                <View className="flex-row items-center gap-x-3">
                  <IconSymbol name="lifepreserver.fill" size={20} color={isDark ? "rgba(255,255,255,0.7)" : "#666"} />
                  <Text className={`${textClass} font-medium text-base`}>Recover Encrypted Vault</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={isDark ? "rgba(255,255,255,0.3)" : "#999"} />
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Synchronization Section */}
        <View className="mb-8">
          <Text className={`text-xs font-black ${textClass} uppercase tracking-widest ml-2 mb-4`}>Synchronization</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <TouchableOpacity
              onPress={handleManualSync}
              disabled={isSyncing}
              className={`flex-row items-center justify-between p-5`}
            >
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="cloud.fill" size={20} color="#3b82f6" />
                <View>
                  <Text className={`${textClass} font-medium text-base`}>
                    {isSyncing ? 'Syncing with Supabase...' : 'Sync with Cloud'}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                    Manual Data Refresh
                  </Text>
                </View>
              </View>
              {isSyncing ? (
                <View className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconSymbol name="arrow.triangle.2.circlepath" size={20} color={isDark ? "rgba(255,255,255,0.3)" : "#999"} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View className="mb-8">
          <Text className={`text-xs font-black ${textClass} uppercase tracking-widest ml-2 mb-4`}>Account</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <View className={`flex-row items-center justify-between p-5 border-b ${borderClass}`}>
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="lock.fill" size={20} color={isDark ? "rgba(255,255,255,0.7)" : "#666"} />
                <View>
                  <Text className={`${textClass} font-medium text-base`}>Biometric App Lock</Text>
                  {!canAuthenticate && (
                    <Text className="text-destructive text-[8px] font-black uppercase tracking-widest">Unsupported/Not Enrolled</Text>
                  )}
                </View>
              </View>
              <Switch
                value={isBiometricsEnabled}
                onValueChange={toggleBiometrics}
                disabled={!canAuthenticate}
                trackColor={{ false: "#ccc", true: "#10b981" }}
              />
            </View>

            <Link href="/settings/profile" asChild>
              <TouchableOpacity
                className={`flex-row items-center justify-between p-5 border-b ${borderClass}`}
              >
                <View className="flex-row items-center gap-x-3">
                  <IconSymbol name="person.fill" size={20} color={isDark ? "rgba(255,255,255,0.7)" : "#666"} />
                  <Text className={`${textClass} font-medium text-base`}>Profile Settings</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={isDark ? "rgba(255,255,255,0.3)" : "#999"} />
              </TouchableOpacity>
            </Link>

            <Link href="/csv-import" asChild>
              <TouchableOpacity className={`flex-row items-center justify-between p-5 border-b ${borderClass}`}>
                <View className="flex-row items-center gap-x-3">
                  <IconSymbol name="tray.and.arrow.down.fill" size={20} color={isDark ? "rgba(255,255,255,0.7)" : "#666"} />
                  <Text className={`${textClass} font-medium text-base`}>Import Data (CSV)</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={isDark ? "rgba(255,255,255,0.3)" : "#999"} />
              </TouchableOpacity>
            </Link>

            <TouchableOpacity className={`flex-row items-center justify-between p-5 border-b ${borderClass}`}>
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="arrow.down.doc.fill" size={20} color={isDark ? "rgba(255,255,255,0.7)" : "#666"} />
                <Text className={`${textClass} font-medium text-base`}>Export Data</Text>
              </View>
              <IconSymbol name="chevron.right" size={20} color={isDark ? "rgba(255,255,255,0.3)" : "#999"} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                Alert.alert(
                  "Clear Data",
                  "Choose which data you would like to remove. This action is permanent.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Local Only",
                      onPress: async () => {
                        const success = await clearLocalData();
                        if (success) Alert.alert("Success", "Local database and keys have been wiped.");
                      }
                    },
                    {
                      text: "Cloud Only",
                      onPress: async () => {
                        const success = await clearCloudData();
                        if (success) Alert.alert("Success", "Cloud records and key backups have been removed.");
                      }
                    },
                    {
                      text: "Wipe Everything",
                      style: "destructive",
                      onPress: async () => {
                        const success = await clearAllUserData();
                        if (success) Alert.alert("Success", "All local and cloud records have been removed.");
                      }
                    }
                  ]
                );
              }}
              className="flex-row items-center justify-between p-5"
            >
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="trash.fill" size={20} color="#ef4444" />
                <Text className="text-destructive font-bold text-base">Clear Database</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer Section */}
        <View className="mb-20">
          <Text className={`text-xs font-black ${textClass} uppercase tracking-widest ml-2 mb-4`}>Developer Tools</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <TouchableOpacity
              onPress={handleSeed}
              className="flex-row items-center justify-between p-5"
            >
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="hammer.fill" size={20} color="#10b981" />
                <View>
                  <Text className="text-[#10b981] font-bold text-base">Seed Database</Text>
                  <Text className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Generate Mock Data</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
