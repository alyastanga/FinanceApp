import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  progress: number; // 0 to 1
  label?: string;
}

export function AnimatedProgressBar({ progress, label }: AnimatedProgressBarProps) {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(progress, {
      duration: 500,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value * 100}%`,
    };
  });

  return (
    <View className="w-full mt-4">
      {label && (
        <Text className="text-white/40 text-[8px] uppercase font-black tracking-widest mb-2 text-center">
          {label}
        </Text>
      )}
      <View className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <Animated.View 
          style={[animatedStyle]} 
          className="h-full bg-primary rounded-full shadow-sm shadow-primary/50"
        />
      </View>
    </View>
  );
}
