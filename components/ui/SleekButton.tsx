import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SleekButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary';
}

export function SleekButton({ title, variant = 'primary', style, ...props }: SleekButtonProps) {
  if (variant === 'secondary') {
    return (
      <TouchableOpacity 
        className="bg-transparent border border-[#2A2A2A] py-3 px-6 rounded-full items-center justify-center"
        style={style}
        {...props}
      >
        <Text className="text-[#F5F5F5] font-semibold text-base">{title}</Text>
      </TouchableOpacity>
    );
  }

  // Primary variant uses the Vibrant Teal gradient
  return (
    <TouchableOpacity style={style} {...props}>
      <LinearGradient
        colors={['#2DD4BF', '#009088']} // Teal to deep Teal
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text className="text-[#050505] font-bold text-base">{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 9999, // full rounded
    alignItems: 'center',
    justifyContent: 'center',
  }
});
