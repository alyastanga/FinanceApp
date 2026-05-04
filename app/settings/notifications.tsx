import { IconSymbol } from '@/components/ui/icon-symbol';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { NotificationService } from '../../lib/notification-service';
import { BudgetMonitor } from '../../lib/budget-monitor';
import { CustomAlert } from '../../components/ui/CustomAlert';

export default function NotificationSettingsScreen() {
  const { isDark } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [morningSummaryEnabled, setMorningSummaryEnabled] = useState(false);
  const [morningSummaryTime, setMorningSummaryTime] = useState(new Date(new Date().setHours(8, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);

  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';
  const cardBgClass = isDark ? 'bg-[#151515]' : 'bg-white';
  const borderClass = isDark ? 'border-white/5' : 'border-black/5';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const notificationStatus = await NotificationService.getPermissionStatusAsync();
    setNotificationsEnabled(notificationStatus === 'granted');

    const summaryEnabled = await AsyncStorage.getItem('morning_summary_enabled');
    const summaryTime = await AsyncStorage.getItem('morning_summary_time');
    
    if (summaryEnabled !== null) setMorningSummaryEnabled(summaryEnabled === 'true');
    if (summaryTime !== null) setMorningSummaryTime(new Date(summaryTime));
  };

  const handleMorningSummaryToggle = async (val: boolean) => {
    setMorningSummaryEnabled(val);
    await AsyncStorage.setItem('morning_summary_enabled', val.toString());
    if (val) {
      // Do nothing, let user click "Schedule Time" manually
    } else {
      setShowTimePicker(false);
      await NotificationService.cancelNotificationAsync('morning_summary');
    }
  };

  const handleTimeChange = async (event: any, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (date) {
      setMorningSummaryTime(date);
      await AsyncStorage.setItem('morning_summary_time', date.toISOString());
      
      const summary = await BudgetMonitor.generateMorningSummary();
      await NotificationService.scheduleDailyNotificationAsync(
        'morning_summary',
        'Daily Financial Summary',
        summary,
        date.getHours(),
        date.getMinutes()
      );
    }
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity 
            onPress={() => router.back()}
            className={`h-10 w-10 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}
          >
            <IconSymbol name="chevron.left" size={20} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>
          <Text className={`text-xl font-black ${textClass}`}>Notifications</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 px-4">
          <View className="mt-4 mb-8">
            <Text className={`text-[10px] font-black ${subTextClass} uppercase tracking-[3px] ml-2 mb-3`}>System Permissions</Text>
            <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
              <View className="flex-row items-center justify-between p-5 border-b border-white/5">
                <View className="flex-row items-center gap-x-4">
                  <View className="h-10 w-10 rounded-2xl bg-primary/10 items-center justify-center">
                    <IconSymbol name="bell.fill" size={20} color="#10b981" />
                  </View>
                  <View>
                    <Text className={`${textClass} font-bold text-base`}>Push Notifications</Text>
                    <Text className={`text-[10px] ${subTextClass} font-bold uppercase`}>System Alerts & Sync</Text>
                  </View>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={async (val) => {
                    if (val) {
                      const granted = await NotificationService.requestPermissionsAsync();
                      setNotificationsEnabled(granted);
                      if (!granted) CustomAlert.alert("Permissions Required", "Enable in System Settings.");
                    } else {
                      setNotificationsEnabled(false);
                      CustomAlert.alert("Note", "Revoke OS permissions in System Settings.");
                    }
                  }}
                  trackColor={{ false: "#333", true: "#10b981" }}
                />
              </View>
            </View>
          </View>

          <View className="mb-8">
            <Text className={`text-[10px] font-black ${subTextClass} uppercase tracking-[3px] ml-2 mb-3`}>Smart Alerts</Text>
            <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
              <View className="p-5 border-b border-white/5">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-x-4">
                    <View className="h-10 w-10 rounded-2xl bg-orange-500/10 items-center justify-center">
                      <IconSymbol name="sun.max.fill" size={20} color="#f97316" />
                    </View>
                    <View>
                      <Text className={`${textClass} font-bold text-base`}>Morning Summary</Text>
                      <Text className={`text-[10px] ${subTextClass} font-bold uppercase`}>Daily Financial Briefing</Text>
                    </View>
                  </View>
                  <Switch
                    value={morningSummaryEnabled}
                    onValueChange={handleMorningSummaryToggle}
                    trackColor={{ false: "#333", true: "#10b981" }}
                  />
                </View>

                {morningSummaryEnabled && (
                  <TouchableOpacity 
                    onPress={() => setShowTimePicker(true)}
                    className={`mt-2 p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-black/5'} flex-row justify-between items-center`}
                  >
                    <Text className={`${textClass} font-bold`}>Schedule Time</Text>
                    <Text className="text-primary font-black">
                      {morningSummaryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex-row items-center justify-between p-5">
                <View className="flex-row items-center gap-x-4">
                  <View className="h-10 w-10 rounded-2xl bg-emerald-500/10 items-center justify-center">
                    <IconSymbol name="chart.bar.fill" size={20} color="#10b981" />
                  </View>
                  <View>
                    <Text className={`${textClass} font-bold text-base`}>Budget Thresholds</Text>
                    <Text className={`text-[10px] ${subTextClass} font-bold uppercase`}>Alerts at 80% and 100%</Text>
                  </View>
                </View>
                <View className="bg-primary/10 px-3 py-1 rounded-full">
                  <Text className="text-primary text-[10px] font-black uppercase">Active</Text>
                </View>
              </View>
            </View>
          </View>

          <Modal
            visible={showTimePicker}
            transparent
            animationType="fade"
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
              <View className={`${cardBgClass} p-8 rounded-[40px] border ${borderClass} w-[90%] shadow-2xl`}>
                <View className="flex-row justify-between items-center mb-6">
                  <Text className={`${textClass} font-black text-lg`}>Select Time</Text>
                  <TouchableOpacity 
                    onPress={() => setShowTimePicker(false)}
                    className="bg-primary/10 px-6 py-2 rounded-full"
                  >
                    <Text className="text-primary font-black uppercase text-[10px] tracking-widest">Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={morningSummaryTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              </View>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
