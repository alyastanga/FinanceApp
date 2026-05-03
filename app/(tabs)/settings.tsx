import { DateRangeModal } from '@/components/DateRangeModal';
import { AIToggle } from '@/components/ui/AIToggle';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { seedDatabase } from '../../_tests_dev/seed';
import { VaultUnlockModal } from '../../components/VaultUnlockModal';
import { useAI } from '../../context/AIContext';
import { SUPPORTED_CURRENCIES, useCurrency } from '../../context/CurrencyContext';
import { useSecurity } from '../../context/SecurityContext';
import { useTheme } from '../../context/ThemeContext';
import database from '../../database';
import Expense from '../../database/models/Expense';
import Income from '../../database/models/Income';
import { clearAllUserData, clearCloudData, clearLocalData } from '../../lib/data-management';
import { EmailService } from '../../lib/email-service';
import { ExportTransaction, exportTransactionsToCSV } from '../../lib/export-service';
import { clearActiveDEK, E2EEState, getE2EEState, unlockVault } from '../../lib/key-manager';
import { syncData } from '../../lib/sync';

export default function SettingsScreen() {
  const { isBiometricsEnabled, toggleBiometrics, canAuthenticate } = useSecurity();
  const { aiMode, setAiMode } = useAI();
  const { setTheme, isDark } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [e2eeState, setE2eeState] = React.useState<E2EEState | null>(null);
  const [isGmailConnected, setIsGmailConnected] = React.useState(false);
  const [isEmailSyncing, setIsEmailSyncing] = React.useState(false);
  const [showVaultModal, setShowVaultModal] = React.useState(false);
  
  // Cloud AI Settings
  const [aiKeys, setAiKeys] = React.useState<Record<string, string>>({});
  const [cloudAiKey, setCloudAiKey] = React.useState('');
  const [cloudAiModel, setCloudAiModel] = React.useState('gemini-2.5-flash');
  const [cloudAiProvider, setCloudAiProvider] = React.useState('gemini');

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const fetchState = async () => {
        const state = await getE2EEState();
        const token = await AsyncStorage.getItem('gmail_oauth_token');
        const keysJson = await AsyncStorage.getItem('cloud_ai_keys');
        const loadedKeys = keysJson ? JSON.parse(keysJson) : {};
        const aiModel = await AsyncStorage.getItem('cloud_ai_model');
        const aiProvider = await AsyncStorage.getItem('cloud_ai_provider');
        const currentProvider = aiProvider || 'gemini';

        if (isMounted) {
          setE2eeState(state);
          setIsGmailConnected(!!token);
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

  const handleExport = async (fromDate: Date, toDate: Date) => {
    setIsExporting(true);
    try {
      const fromTime = new Date(fromDate).setHours(0, 0, 0, 0);
      const toTime = new Date(toDate).setHours(23, 59, 59, 999);

      const incomes = await database.get<Income>('incomes').query().fetch();
      const expenses = await database.get<Expense>('expenses').query().fetch();

      const filteredIncomes = incomes.filter(i => {
        const time = i.createdAt.getTime();
        return time >= fromTime && time <= toTime;
      });
      const filteredExpenses = expenses.filter(e => {
        const time = e.createdAt.getTime();
        return time >= fromTime && time <= toTime;
      });

      const allTransactions: ExportTransaction[] = [
        ...filteredIncomes.map(i => ({
          amount: i.amount,
          category: i.category,
          description: i.description || '',
          createdAt: i.createdAt.getTime(),
          type: 'Inflow' as const
        })),
        ...filteredExpenses.map(e => ({
          amount: e.amount,
          category: e.category,
          description: e.description || '',
          createdAt: e.createdAt.getTime(),
          type: 'Outflow' as const
        }))
      ].sort((a, b) => b.createdAt - a.createdAt);

      if (allTransactions.length === 0) {
        Alert.alert('No Data', 'No transactions found for the selected period.');
        return;
      }

      await exportTransactionsToCSV(allTransactions, fromDate, toDate);
      setShowExportModal(false);
    } catch (error: any) {
      console.error('Export Error:', error);
      Alert.alert("Export Failed", error.message || "An error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleConnectGmail = async () => {
    if (isGmailConnected) {
      Alert.alert("Disconnect", "Are you sure you want to disconnect your Gmail?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect", style: "destructive", onPress: async () => {
            await AsyncStorage.removeItem('gmail_oauth_token');
            await AsyncStorage.removeItem('bank_email_last_sync_timestamp');
            setIsGmailConnected(false);
          }
        }
      ]);
    } else {
      // In a real app, this would trigger the Google OAuth flow
      // For now, we simulate the connection for the user to test the UI/Logic
      Alert.alert("Connect Gmail", "This will redirect you to Google to grant read-only access to your emails.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Connect", onPress: async () => {
            await AsyncStorage.setItem('gmail_oauth_token', 'mock_token');
            await EmailService.initializeSync(); // Only upcoming emails
            setIsGmailConnected(true);
            Alert.alert("Connected", "Only new emails received from now on will be processed.");
          }
        }
      ]);
    }
  };

  const handleSyncEmails = async () => {
    setIsEmailSyncing(true);
    try {
      const result = await EmailService.syncIncomingTransactions();
      if (result.status === 'no_new_emails') {
        Alert.alert("No New Transactions", "No upcoming bank emails found since the last check.");
      } else if (result.status === 'success') {
        Alert.alert("Sync Success", `Successfully parsed and added ${result.processed} new transactions.`);
      }
    } catch (err: any) {
      Alert.alert("Sync Error", err.message || "Could not fetch emails.");
    } finally {
      setIsEmailSyncing(false);
    }
  };

  const borderClass = isDark ? 'border-white/5' : 'border-neutral-200';
  const cardBgClass = isDark ? 'bg-[#151515]' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-neutral-900';
  const subTextClass = isDark ? 'text-white/40' : 'text-neutral-500';

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
        <View className="pt-2 mb-gsd-md">
          <Text className={`text-2xl font-black tracking-tighter ${textClass} mb-1`}>Settings</Text>
        </View>

        {/* Preferences Section */}
        <View className="mb-gsd-lg">
          <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Preferences</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <View className={`flex-row items-center justify-between p-4 border-b ${borderClass}`}>
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

            <View className={`p-4 border-b ${borderClass}`}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-x-3">
                  <IconSymbol name="sparkles" size={20} color="#8b5cf6" />
                  <Text className={`${textClass} font-medium text-base`}>AI Intelligence</Text>
                </View>
                <AIToggle mode={aiMode} onToggle={setAiMode} />
              </View>
              <Text className={`text-[9px] ${subTextClass} leading-4 mb-3 font-bold uppercase tracking-tight`}>
                {aiMode === 'cloud'
                  ? 'Cloud Mode uses high-performance models for complex budgeting analysis.'
                  : 'Local Mode uses on-device inference for maximum privacy and offline stability.'}
              </Text>

              <TouchableOpacity 
                onPress={() => router.push('/model-settings')}
                className="flex-row items-center justify-between mb-4"
              >
                <Text className="text-primary text-[10px] font-black uppercase tracking-widest">Manage Native AI Engine</Text>
                <IconSymbol name="chevron.right" size={14} color="#10b981" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => router.push('/cloud-ai-settings')}
                className="flex-row items-center justify-between"
              >
                <Text className="text-primary text-[10px] font-black uppercase tracking-widest">Configure Cloud AI</Text>
                <IconSymbol name="chevron.right" size={14} color="#10b981" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between p-4">
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
        <View className="mb-gsd-lg">
          <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Financial Context</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} p-4`}>
            <View className="flex-row items-center gap-x-3 mb-6">
              <IconSymbol name="dollarsign.circle.fill" size={20} color="#10b981" />
              <View>
                <Text className={`${textClass} font-bold text-base`}>Primary Currency</Text>
                <Text className={`text-[10px] ${subTextClass} uppercase font-black tracking-widest`}>Live Exchange Rates</Text>
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
                    className={`px-6 py-4 rounded-2xl border ${isSelected ? 'bg-primary border-primary' : (isDark ? 'bg-white/5 border-white/5' : 'bg-neutral-100 border-neutral-200')}`}
                  >
                    <Text className={`text-base font-black ${isSelected ? 'text-[#050505]' : textClass}`}>{isSelected ? c.symbol : c.symbol}</Text>
                    <Text className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isSelected ? 'text-[#050505]/60' : subTextClass}`}>{c.code}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Integrations Section */}
        <View className="mb-gsd-lg">
          <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Integrations</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            {/* Gmail Transaction Parser */}
            <View className={`p-4 border-b ${borderClass}`}>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-x-3">
                  <IconSymbol name="envelope.fill" size={20} color="#10b981" />
                  <View>
                    <Text className={`${textClass} font-medium text-base`}>Bank Email Parser</Text>
                    <Text className={`text-[10px] ${subTextClass} uppercase font-black tracking-widest`}>Automatic Sync</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleConnectGmail}
                  className={`px-4 py-2 rounded-xl ${isGmailConnected ? 'bg-red-500/10' : 'bg-primary/20'}`}
                >
                  <Text className={`text-[10px] font-black uppercase tracking-widest ${isGmailConnected ? 'text-red-400' : 'text-primary'}`}>
                    {isGmailConnected ? 'Disconnect' : 'Connect Gmail'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isGmailConnected && (
                <TouchableOpacity
                  onPress={handleSyncEmails}
                  disabled={isEmailSyncing}
                  className={`flex-row items-center justify-center py-4 rounded-2xl bg-white/5 border border-white/5 gap-x-2`}
                >
                  {isEmailSyncing ? <ActivityIndicator size="small" color="#10b981" /> : <IconSymbol name="arrow.triangle.2.circlepath" size={14} color="#10b981" />}
                  <Text className="text-primary font-black text-[10px] uppercase tracking-widest">
                    {isEmailSyncing ? 'Checking Inbox...' : 'Check for new Transactions'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity className={`flex-row items-center justify-between p-4`}>
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="calendar.badge.plus" size={20} color="#10b981" />
                <View>
                  <Text className={`${textClass} font-medium text-base`}>Connect Google Calendar</Text>
                  <Text className={`text-[10px] ${subTextClass} uppercase font-black tracking-widest`}>Available in Pro</Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={isDark ? "rgba(255,255,255,0.3)" : "#999"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cloud & Security Hub */}
        <View className="mb-gsd-lg">
          <View className="flex-row justify-between items-end mb-2 ml-2">
            <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] opacity-30`}>Cloud & Security Hub</Text>
            {e2eeState?.isEnabled && (
              <View className="flex-row items-center gap-x-1.5">
                <View className={`w-1.5 h-1.5 rounded-full ${e2eeState.isVaultLocked ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <Text className={`text-[8px] font-black uppercase tracking-tighter ${e2eeState.isVaultLocked ? 'text-red-400' : 'text-emerald-500'}`}>
                  Vault {e2eeState.isVaultLocked ? 'Locked' : 'Active'}
                </Text>
              </View>
            )}
          </View>

          <View className={`${cardBgClass} rounded-[40px] border ${borderClass} overflow-hidden shadow-2xl shadow-primary/5`}>
            {/* Main Sync & Status Row */}
            <View className="p-8">
              <View className="flex-row justify-between items-start mb-6">
                <View className="flex-1 mr-4">
                  <Text className={`text-2xl font-black ${textClass} tracking-tight mb-1`}>
                    {isSyncing ? 'Syncing...' : 'Cloud Intelligence'}
                  </Text>
                  <Text className={`text-[10px] ${subTextClass} uppercase font-black tracking-[2px]`}>
                    {e2eeState?.isEnabled ? 'Zero-Knowledge AES-256' : 'Standard Supabase Protection'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleManualSync}
                  disabled={isSyncing}
                  className={`h-12 w-12 rounded-2xl items-center justify-center ${isDark ? 'bg-primary/10 border border-primary/20' : 'bg-primary/20 border border-primary/30'}`}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#10b981" />
                  ) : (
                    <IconSymbol name="arrow.triangle.2.circlepath" size={20} color="#10b981" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Action Area */}
              {e2eeState?.isEnabled ? (
                <View className="gap-y-3">
                  {e2eeState.isVaultLocked ? (
                    <TouchableOpacity
                      onPress={() => setShowVaultModal(true)}
                      className="bg-emerald-500 py-4 rounded-2xl items-center shadow-lg shadow-emerald-500/20"
                    >
                      <Text className="text-[#050505] font-black text-xs uppercase tracking-widest">Unlock Encryption Vault</Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-row gap-x-3">
                      <Link href="/settings/dek-rotation" asChild>
                        <TouchableOpacity className={`flex-1 py-3 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/10'} items-center`}>
                          <Text className={`${textClass} font-bold text-[10px] uppercase tracking-widest`}>Rotate Keys</Text>
                        </TouchableOpacity>
                      </Link>
                      <TouchableOpacity
                        onPress={async () => {
                          await clearActiveDEK();
                          const newState = await getE2EEState();
                          setE2eeState(newState);
                        }}
                        className={`flex-1 py-3 rounded-2xl border border-red-500/20 bg-red-500/5 items-center`}
                      >
                        <Text className="text-red-400 font-bold text-[10px] uppercase tracking-widest">Lock Vault</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => router.push('/onboarding/e2ee-recovery')}
                    className="py-2 items-center"
                  >
                    <Text className={`${subTextClass} font-bold text-[9px] uppercase tracking-widest`}>Forgot passphrase? Recover Vault</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Link href="/onboarding/e2ee-setup" asChild>
                  <TouchableOpacity className="bg-emerald-500/10 border border-emerald-500/20 py-4 rounded-2xl items-center">
                    <Text className="text-emerald-500 font-black text-xs uppercase tracking-widest">Enable End-to-End Encryption</Text>
                  </TouchableOpacity>
                </Link>
              )}
            </View>
          </View>
        </View>

        {/* Account & Privacy Section */}
        <View className="mb-gsd-lg">
          <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Account & Privacy</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <View className={`flex-row items-center justify-between p-4 border-b ${borderClass}`}>
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="lock.fill" size={20} color={isDark ? "rgba(255,255,255,0.7)" : "#666"} />
                <Text className={`${textClass} font-medium text-base`}>Biometric App Lock</Text>
              </View>
              <Switch
                value={isBiometricsEnabled}
                onValueChange={toggleBiometrics}
                disabled={!canAuthenticate}
                trackColor={{ false: "#ccc", true: "#10b981" }}
              />
            </View>

            <Link href="/settings/profile" asChild>
              <TouchableOpacity className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center gap-x-3">
                  <IconSymbol name="person.fill" size={20} color={isDark ? "rgba(255,255,255,0.7)" : "#666"} />
                  <Text className={`${textClass} font-medium text-base`}>Profile Settings</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={isDark ? "rgba(255,255,255,0.3)" : "#999"} />
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Data Management Section */}
        <View className="mb-gsd-lg">
          <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Data Management</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <Link href="/data-hub" asChild>
              <TouchableOpacity className={`flex-row items-center justify-between p-4 border-b ${borderClass}`}>
                <View className="flex-row items-center gap-x-3">
                  <IconSymbol name="square.stack.3d.up.fill" size={20} color="#10b981" />
                  <View>
                    <Text className={`${textClass} font-medium text-base`}>Data Hub</Text>
                    <Text className={`text-[10px] ${subTextClass} uppercase font-black tracking-widest`}>Import & Export </Text>
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={20} color={isDark ? "rgba(255,255,255,0.3)" : "#999"} />
              </TouchableOpacity>
            </Link>

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
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="trash.fill" size={20} color="#ef4444" />
                <Text className="text-destructive font-bold text-base">Clear Database</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer Section */}
        <View className="mb-gsd-lg">
          <Text className={`text-xs font-black ${textClass} uppercase tracking-widest ml-2 mb-4`}>Developer Tools</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <TouchableOpacity
              onPress={handleSeed}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-row items-center gap-x-3">
                <IconSymbol name="hammer.fill" size={20} color="#10b981" />
                <View>
                  <Text className="text-[#10b981] font-bold text-base">Seed Database</Text>
                  <Text className={`text-[10px] ${subTextClass} uppercase font-black tracking-widest`}>Generate Mock Data</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <DateRangeModal
        isVisible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />

      <VaultUnlockModal
        isVisible={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        onSubmit={async (pass) => {
          await unlockVault(pass);
          const newState = await getE2EEState();
          setE2eeState(newState);
        }}
      />
    </SafeAreaView>
  );
}
