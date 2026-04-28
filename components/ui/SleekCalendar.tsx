import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { useTheme } from '../../context/ThemeContext';

interface SleekCalendarProps {
  isVisible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  title?: string;
}

export function SleekCalendar({ isVisible, onClose, selectedDate, onSelect, title }: SleekCalendarProps) {
  const { isDark } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View className={`flex-1 justify-center items-center px-4 ${isDark ? 'bg-black/90' : 'bg-black/50'}`}>
        <View className={`p-6 rounded-[40px] w-full border shadow-2xl ${isDark ? 'bg-[#121212] border-white/10' : 'bg-[#FFFFFF] border-black/10'}`}>
          {title && (
            <Text className={`text-center font-black uppercase tracking-widest text-[10px] mb-6 opacity-40 ${isDark ? 'text-white' : 'text-black'}`}>
              {title}
            </Text>
          )}
          
          <View className="flex-row justify-between items-center mb-6">
            <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
              <IconSymbol name="chevron.left" size={24} color="#10b981" />
            </TouchableOpacity>
            <Text className={`font-black text-lg ${isDark ? 'text-white' : 'text-black'}`}>
              {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
              <IconSymbol name="chevron.right" size={24} color="#10b981" />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <View key={i} className="w-[14.28%] items-center mb-4">
                <Text className="text-[10px] font-black text-muted-foreground">{d}</Text>
              </View>
            ))}
            
            {/* Pad leading days */}
            {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
              <View key={`pad-${i}`} className="w-[14.28%] h-10" />
            ))}
            
            {/* Calendar Days */}
            {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => onSelect(date)}
                  className={`w-[14.28%] h-10 items-center justify-center rounded-xl ${isSelected ? 'bg-primary' : ''} ${isToday && !isSelected ? 'border border-primary/30' : ''}`}
                >
                  <Text className={`font-bold ${isSelected ? (isDark ? 'text-[#050505]' : 'text-white') : (isDark ? 'text-white/70' : 'text-black/70')}`}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={onClose} className="bg-primary py-4 rounded-2xl items-center mt-8">
            <Text className="text-[#050505] font-black uppercase tracking-widest text-xs">Confirm Selection</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
