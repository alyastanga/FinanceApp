import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { useTheme } from '../../context/ThemeContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  initialCollapsed?: boolean;
  onExplain?: () => void;
  isExplaining?: boolean;
}

export const CollapsibleCard = ({ 
  title, 
  subtitle, 
  children, 
  initialCollapsed = false,
  onExplain,
  isExplaining = false
}: CollapsibleCardProps) => {
  const { isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed(!isCollapsed);
  };

  return (
    <View className={`rounded-[32px] border overflow-hidden mb-6 shadow-2xl ${isDark ? 'bg-[#0A0A0A] border-white/5' : 'bg-[#FAFAFA] border-black/5'}`}>
      {/* Header */}
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={toggleCollapse}
        className={`p-6 flex-row justify-between items-center ${isDark ? 'bg-white/[0.02]' : 'bg-black/[0.02]'}`}
      >
        <View className="flex-1">
          <Text className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>{title}</Text>
          {subtitle && (
            <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
              {subtitle}
            </Text>
          )}
        </View>

        <View className="flex-row items-center gap-x-3">
          {onExplain && (
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                onExplain();
              }}
              disabled={isExplaining}
              className="bg-primary/10 p-2.5 rounded-2xl border border-primary/20"
            >
              <IconSymbol name="sparkles" size={16} color="#10b981" />
            </TouchableOpacity>
          )}
          <View className={`transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}>
            <IconSymbol name="chevron.down" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Content */}
      {!isCollapsed && (
        <View className={`p-6 pt-2 border-t ${isDark ? 'border-white/[0.02]' : 'border-black/[0.02]'}`}>
          {children}
        </View>
      )}
    </View>
  );
};
