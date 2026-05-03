import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { IconSymbol } from './ui/icon-symbol';
import { PasswordInput } from './ui/PasswordInput';

interface PasswordPromptModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  isProcessing: boolean;
  fileName: string;
}

export function PasswordPromptModal({ isVisible, onClose, onSubmit, isProcessing, fileName }: PasswordPromptModalProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!password) return;
    onSubmit(password);
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <BlurView intensity={30} tint="dark" className="flex-1 items-center justify-center px-6">
          <View className="w-full bg-[#151515] rounded-[40px] border border-white/10 p-8 shadow-2xl">
            <View className="items-center mb-6">
              <View className="h-16 w-16 bg-primary/20 rounded-2xl items-center justify-center mb-4">
                <IconSymbol name="lock.fill" size={28} color="#10b981" />
              </View>
              <Text className="text-white text-xl font-black text-center">Protected Statement</Text>
              <Text className="text-white/40 text-xs text-center mt-2 leading-5 px-4">
                "{fileName}" is encrypted. Please enter the password to allow parsing.
              </Text>
            </View>

            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter Statement Password"
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="text-white font-bold text-base flex-1"
              containerClass="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 mb-6"
              autoFocus
              isDark={true}
            />

            <View className="flex-row gap-x-3">
              <TouchableOpacity 
                onPress={onClose}
                className="flex-1 py-4 items-center bg-white/5 rounded-2xl"
              >
                <Text className="text-white/60 font-black text-[10px] uppercase tracking-widest">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleSubmit}
                disabled={isProcessing || !password}
                className="flex-1 py-4 items-center bg-primary rounded-2xl shadow-lg shadow-primary/20"
              >
                {isProcessing ? (
                  <ActivityIndicator color="#050505" size="small" />
                ) : (
                  <Text className="text-[#050505] font-black text-[10px] uppercase tracking-widest">Unlock & Parse</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text className="text-white/20 text-[8px] uppercase font-black text-center mt-6 tracking-widest">
              Passwords are never stored and are processed locally.
            </Text>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
