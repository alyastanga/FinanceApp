import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { IconSymbol } from './icon-symbol';

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
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed(!isCollapsed);
  };

  return (
    <View className="rounded-[32px] bg-[#0A0A0A] border border-white/5 overflow-hidden mb-6 shadow-2xl">
      {/* Header */}
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={toggleCollapse}
        className="p-6 flex-row justify-between items-center bg-white/[0.02]"
      >
        <View className="flex-1">
          <Text className="text-lg font-black text-white tracking-tight">{title}</Text>
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
            <IconSymbol name="chevron.down" size={18} color="rgba(255,255,255,0.4)" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Content */}
      {!isCollapsed && (
        <View className="p-6 pt-2 border-t border-white/[0.02]">
          {children}
        </View>
      )}
    </View>
  );
};
