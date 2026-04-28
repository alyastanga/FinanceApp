import React from 'react';
import { ViewProps, StyleSheet, Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: number;
}

export function GlassCard({ children, style, intensity = 80, ...props }: GlassCardProps) {
  // On Web, use standard CSS backdrop filter via NativeWind className
  if (Platform.OS === 'web') {
    return (
      <View 
        className="bg-[#121212]/80 border border-[#2A2A2A] rounded-2xl p-5 shadow-lg backdrop-blur-xl"
        style={style}
        {...props}
      >
        {children}
      </View>
    );
  }

  // On Mobile, use BlurView for proper native glassmorphism
  return (
    <BlurView 
      intensity={intensity} 
      tint="dark" 
      className="border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-lg"
      style={[styles.container, style]}
      {...props}
    >
      <View className="bg-[#121212]/50 p-5">
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(5, 5, 5, 0.4)', // Base overlay underneath the blur
  }
});
