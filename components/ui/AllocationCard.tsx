import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { BlurView } from 'expo-blur';

interface AllocationCardProps {
  category: string;
  limit: number;
  onIncrease: () => void;
  onDecrease: () => void;
  isDark?: boolean;
}

export const AllocationCard: React.FC<AllocationCardProps> = ({
  category,
  limit,
  onIncrease,
  onDecrease,
  isDark = true,
}) => {
  const textClass = isDark ? 'text-white' : 'text-black';
  const subTextClass = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <BlurView 
      intensity={20} 
      tint={isDark ? "dark" : "light"} 
      className={`p-6 rounded-[32px] border ${isDark ? 'border-white/5' : 'border-black/5'} overflow-hidden mb-4`}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest mb-1`}>
            Category
          </Text>
          <Text className={`${textClass} text-lg font-black tracking-tight`}>{category}</Text>
        </View>

        <View className="flex-row items-center gap-x-4">
          <TouchableOpacity 
            onPress={onDecrease}
            className={`h-10 w-10 rounded-2xl items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}
          >
            <IconSymbol name="minus" size={16} color={isDark ? 'white' : 'black'} />
          </TouchableOpacity>

          <View className="items-center min-w-[80px]">
            <Text className={`${textClass} text-xl font-black`}>${limit.toLocaleString()}</Text>
          </View>

          <TouchableOpacity 
            onPress={onIncrease}
            className={`h-10 w-10 rounded-2xl items-center justify-center ${isDark ? 'bg-primary/20' : 'bg-primary/10'}`}
          >
            <IconSymbol name="plus" size={16} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>
    </BlurView>
  );
};
