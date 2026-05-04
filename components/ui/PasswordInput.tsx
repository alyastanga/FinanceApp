import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { IconSymbol } from './icon-symbol';

interface PasswordInputProps extends TextInputProps {
  className?: string;
  containerClass?: string;
  isDark?: boolean;
}

export function PasswordInput({ className, containerClass, isDark, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`flex-row ${props.multiline ? 'items-start' : 'items-center'} ${containerClass}`}>
      <TextInput
        {...props}
        secureTextEntry={!showPassword}
        textContentType="none"
        autoComplete="off"
        className={`flex-1 ${className}`}
      />
      <TouchableOpacity 
        onPress={() => setShowPassword(!showPassword)}
        className={`ml-2 px-2 ${props.multiline ? 'mt-3' : ''}`}
        activeOpacity={0.7}
      >
        <IconSymbol 
          name={showPassword ? "eye.slash.fill" : "eye.fill"} 
          size={18} 
          color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} 
        />
      </TouchableOpacity>
    </View>
  );
}
