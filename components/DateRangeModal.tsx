import React, { useState } from 'react';
import { Modal, Text, View, TouchableOpacity, Alert, StyleSheet, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { GlassCard } from './ui/GlassCard';
import { SleekButton } from './ui/SleekButton';
import { IconSymbol } from './ui/icon-symbol';
import { useTheme } from '../context/ThemeContext';
import { SleekCalendar } from './ui/SleekCalendar';

interface DateRangeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onExport: (fromDate: Date, toDate: Date) => void;
}

export function DateRangeModal({ isVisible, onClose, onExport }: DateRangeModalProps) {
  const { isDark } = useTheme();
  
  const [exportMode, setExportMode] = useState<'choice' | 'custom'>('choice');
  
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const handleExport = () => {
    if (fromDate > toDate) {
      Alert.alert('Invalid Range', '"From" date cannot be after "To" date.');
      return;
    }
    onExport(fromDate, toDate);
    setExportMode('choice');
  };

  const handleExportAll = () => {
    const epoch = new Date(1970, 0, 1);
    onExport(epoch, new Date());
    onClose();
    setExportMode('choice');
  };

  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => {}}>
            <GlassCard style={styles.card}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Actions */}
                <View className="flex-row items-center mb-4 min-h-[32px]">
                  {exportMode === 'custom' && (
                    <TouchableOpacity 
                      onPress={() => setExportMode('choice')}
                      className="p-2 -ml-2"
                    >
                      <IconSymbol name="chevron.left" size={24} color={isDark ? "white" : "black"} />
                    </TouchableOpacity>
                  )}
                </View>

                <View className="items-center mb-8">
                  <View className="h-14 w-14 bg-primary/20 rounded-2xl items-center justify-center mb-4">
                    <IconSymbol name="arrow.down.doc.fill" size={28} color="#10b981" />
                  </View>
                  <Text className={`text-2xl font-black ${textClass}`}>Export CSV</Text>
                  <Text className={`text-[10px] uppercase tracking-[3px] font-bold mt-1 ${subTextClass}`}>
                    Transaction History
                  </Text>
                </View>

                {exportMode === 'choice' ? (
                  <View className="gap-y-4 mb-4">
                    <TouchableOpacity 
                      onPress={handleExportAll}
                      activeOpacity={0.7}
                      className={`p-6 rounded-[32px] border flex-row items-center gap-x-4 ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
                    >
                      <View className="h-12 w-12 bg-primary/20 rounded-2xl items-center justify-center">
                        <IconSymbol name="archivebox.fill" size={20} color="#10b981" />
                      </View>
                      <View className="flex-1">
                        <Text className={`font-bold text-base ${textClass}`}>Export All</Text>
                        <Text className={`text-[10px] uppercase tracking-widest font-black ${subTextClass}`}>Full History</Text>
                      </View>
                      <IconSymbol name="chevron.right" size={16} color={isDark ? "white" : "black"} style={{ opacity: 0.3 }} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => setExportMode('custom')}
                      activeOpacity={0.7}
                      className={`p-6 rounded-[32px] border flex-row items-center gap-x-4 ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
                    >
                      <View className="h-12 w-12 bg-primary/20 rounded-2xl items-center justify-center">
                        <IconSymbol name="calendar.badge.clock" size={20} color="#10b981" />
                      </View>
                      <View className="flex-1">
                        <Text className={`font-bold text-base ${textClass}`}>Custom Range</Text>
                        <Text className={`text-[10px] uppercase tracking-widest font-black ${subTextClass}`}>Specific Dates</Text>
                      </View>
                      <IconSymbol name="chevron.right" size={16} color={isDark ? "white" : "black"} style={{ opacity: 0.3 }} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="gap-y-5 mb-8">
                    {/* From Date */}
                    <View>
                      <Text className={`text-[10px] font-black uppercase tracking-widest ml-1 mb-2 ${subTextClass}`}>From Date</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setShowFromPicker(true);
                          setShowToPicker(false);
                        }}
                        activeOpacity={0.7}
                        className={`flex-row items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      >
                        <Text className={`font-bold text-base ${textClass}`}>{fromDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        <IconSymbol name="calendar" size={18} color={isDark ? "white" : "black"} style={{ opacity: 0.5 }} />
                      </TouchableOpacity>
                    </View>

                    {/* To Date */}
                    <View>
                      <Text className={`text-[10px] font-black uppercase tracking-widest ml-1 mb-2 ${subTextClass}`}>To Date</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setShowToPicker(true);
                          setShowFromPicker(false);
                        }}
                        activeOpacity={0.7}
                        className={`flex-row items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      >
                        <Text className={`font-bold text-base ${textClass}`}>{toDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        <IconSymbol name="calendar" size={18} color={isDark ? "white" : "black"} style={{ opacity: 0.5 }} />
                      </TouchableOpacity>
                    </View>

                    <View className="mt-4">
                      <SleekButton title="Generate Export" onPress={handleExport} />
                    </View>
                  </View>
                )}
              </ScrollView>
            </GlassCard>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* From Picker */}
      <SleekCalendar 
        isVisible={showFromPicker}
        onClose={() => setShowFromPicker(false)}
        selectedDate={fromDate}
        onSelect={(date) => {
          setFromDate(date);
          setShowFromPicker(false);
        }}
        title="Select Start Date"
      />

      {/* To Picker */}
      <SleekCalendar 
        isVisible={showToPicker}
        onClose={() => setShowToPicker(false)}
        selectedDate={toDate}
        onSelect={(date) => {
          setToDate(date);
          setShowToPicker(false);
        }}
        title="Select End Date"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  }
});
