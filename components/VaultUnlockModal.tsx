import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { IconSymbol } from './ui/icon-symbol';
import { AnimatedProgressBar } from './ui/AnimatedProgressBar';

interface VaultUnlockModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (passphrase: string) => Promise<void>;
}

export function VaultUnlockModal({ isVisible, onClose, onSubmit }: VaultUnlockModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Enter passphrase');

  const handleSubmit = async () => {
    if (!passphrase) return;
    
    setIsProcessing(true);
    setProgress(0.1);
    setStatusText('Deriving keys...');

    // Simulate progress for better UX
    setTimeout(() => { setProgress(0.4); setStatusText('Unlocking vault...'); }, 600);
    setTimeout(() => { setProgress(0.7); setStatusText('Verifying integrity...'); }, 1200);

    try {
      await onSubmit(passphrase);
      setProgress(1);
      setStatusText('Success');
      setTimeout(() => {
        onClose();
        setPassphrase('');
        setIsProcessing(false);
        setProgress(0);
        setStatusText('Enter passphrase');
      }, 500);
    } catch (err: any) {
      setIsProcessing(false);
      setProgress(0);
      setStatusText('Invalid Passphrase');
    }
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
          <View className="w-full bg-[#0A0A0A] rounded-[48px] border border-white/10 p-10 shadow-2xl">
            <View className="items-center mb-8">
              <View className="h-20 w-20 bg-emerald-500/20 rounded-[28px] items-center justify-center mb-6">
                <IconSymbol name="lock.shield.fill" size={32} color="#10b981" />
              </View>
              <Text className="text-white text-2xl font-black text-center tracking-tight">Unlock Vault</Text>
              <Text className="text-white/40 text-[11px] text-center mt-3 leading-5 px-6 uppercase tracking-widest font-bold">
                Zero-Knowledge Encryption Required
              </Text>
            </View>

            {!isProcessing ? (
              <View className="bg-white/5 border border-white/10 rounded-3xl px-6 py-5 mb-8">
                <TextInput
                  secureTextEntry
                  placeholder="Daily Passphrase"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  className="text-white font-bold text-lg"
                  value={passphrase}
                  onChangeText={setPassphrase}
                  autoFocus
                />
              </View>
            ) : (
              <View className="mb-8 py-4">
                <AnimatedProgressBar progress={progress} label={statusText} />
              </View>
            )}

            <View className="flex-row gap-x-4">
              <TouchableOpacity 
                onPress={onClose}
                disabled={isProcessing}
                className="flex-1 py-5 items-center bg-white/5 rounded-3xl"
              >
                <Text className="text-white/60 font-black text-[11px] uppercase tracking-widest">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleSubmit}
                disabled={isProcessing || !passphrase}
                className={`flex-1 py-5 items-center rounded-3xl shadow-xl ${!passphrase ? 'bg-primary/20' : 'bg-primary shadow-primary/20'}`}
              >
                <Text className="text-[#050505] font-black text-[11px] uppercase tracking-widest">
                  Unlock
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-white/20 text-[9px] uppercase font-black text-center mt-8 tracking-[2px]">
              E2EE Active • AES-256-GCM
            </Text>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
