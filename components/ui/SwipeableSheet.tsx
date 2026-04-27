import React, { useEffect } from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  withTiming,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SwipeableSheetProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isDark?: boolean;
}

export const SwipeableSheet = ({ isVisible, onClose, children, isDark: isDarkProp }: SwipeableSheetProps) => {
  const { isDark: themeIsDark } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : themeIsDark;
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Animation constants
  const SPRING_CONFIG = {
    damping: 20,
    stiffness: 150,
  };

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withSpring(1);
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT);
      backdropOpacity.value = withTiming(0);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, {}, () => {
      runOnJS(onClose)();
    });
    backdropOpacity.value = withTiming(0);
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      // Allow swiping down (positive translation)
      // Add slight resistance to swiping up (negative translation)
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      } else {
        translateY.value = event.translationY / 5;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 150 || event.velocityY > 500) {
        runOnJS(handleDismiss)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!isVisible) return null;

  return (
    <View className="absolute inset-0 z-50">
      {/* Backdrop */}
      <Animated.View style={[{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }, animatedBackdropStyle]}>
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={handleDismiss} 
          className="flex-1"
        />
      </Animated.View>

      {/* Sheet Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="absolute bottom-0 left-0 right-0 max-h-[95%]"
        style={{ paddingTop: insets.top + 20 }}
      >
        <GestureDetector gesture={gesture}>
          <Animated.View style={[animatedSheetStyle]} className="w-full">
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} className="rounded-t-[48px] overflow-hidden border-t border-white/10">
              <View className={`${isDark ? 'bg-black/90' : 'bg-white/95'} p-8 pt-4 pb-12`}>
                {/* Drag Handle */}
                <View className="w-12 h-1.5 bg-white/10 rounded-full self-center mb-8" />
                
                {children}
              </View>
            </BlurView>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </View>
  );
};
