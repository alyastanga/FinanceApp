import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BlurView } from 'expo-blur';
import { releaseLocalModel } from '@/lib/llama-service';

const MODEL_URL = 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf?download=true';
const MODEL_NAME = 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
const MODEL_SIZE_MB = 669;

export default function ModelSettings() {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [hasModel, setHasModel] = useState(false);
  const [checking, setChecking] = useState(true);

  const modelPath = `${FileSystem.documentDirectory}${MODEL_NAME}`;

  useEffect(() => {
    checkModel();
  }, []);

  const checkModel = async () => {
    try {
      const info = await FileSystem.getInfoAsync(modelPath);
      setHasModel(info.exists);
    } catch (err) {
      console.error('Check failed:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    const downloadResumable = FileSystem.createDownloadResumable(
      MODEL_URL,
      modelPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setDownloadProgress(progress);
      }
    );

    try {
      const result = await downloadResumable.downloadAsync();
      if (result) {
        setHasModel(true);
        Alert.alert('Success', 'Model downloaded and ready for offline use.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Download Error', 'Failed to download the model file.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Model',
      'Are you sure you want to remove the local LLM model from your device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
             try {
                await releaseLocalModel();
                await FileSystem.deleteAsync(modelPath);
                setHasModel(false);
             } catch (err) {
                Alert.alert('Error', 'Failed to delete model file.');
             }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#050505] p-6">
      <View className="flex-row items-center gap-x-4 mb-10 pt-12">
        <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 bg-white/5 rounded-full items-center justify-center">
          <IconSymbol name="chevron.left" size={20} color="white" />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-black text-white">AI Engine</Text>
          <Text className="text-white/40 text-xs uppercase tracking-widest">Model Management</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <BlurView intensity={20} className="bg-white/[0.03] border border-white/5 rounded-[40px] p-8 mb-10 overflow-hidden">
          <View className="items-center mb-8">
            <View className="h-16 w-16 bg-primary/20 rounded-3xl items-center justify-center mb-6">
              <IconSymbol name="cpu.fill" size={32} color="#10b981" />
            </View>
            <Text className="text-white font-black text-xl text-center">TinyLlama 1.1B Chat</Text>
            <Text className="text-white/40 text-xs text-center mt-2 px-6">
              Optimized for privacy and speed on mobile devices. Runs 100% offline.
            </Text>
          </View>

          <View className="gap-y-4">
             <View className="flex-row justify-between items-center py-4 border-b border-white/5">
                <Text className="text-white/60 font-bold text-xs uppercase tracking-widest">Status</Text>
                {checking ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <View className="flex-row items-center gap-x-2">
                    <View className={`h-2 w-2 rounded-full ${hasModel ? 'bg-primary' : 'bg-destructive'}`} />
                    <Text className={`font-black text-xs uppercase tracking-widest ${hasModel ? 'text-primary' : 'text-destructive'}`}>
                      {hasModel ? 'Ready' : 'Missing'}
                    </Text>
                  </View>
                )}
             </View>

             <View className="flex-row justify-between items-center py-4 border-b border-white/5">
                <Text className="text-white/60 font-bold text-xs uppercase tracking-widest">File Size</Text>
                <Text className="text-white font-black text-xs uppercase tracking-widest">{MODEL_SIZE_MB}MB</Text>
             </View>
          </View>

          {isDownloading && (
            <View className="mt-8">
               <View className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <View 
                    style={{ width: `${downloadProgress * 100}%` }}
                    className="h-full bg-primary" 
                  />
               </View>
               <Text className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-3 text-center">
                 Downloading Support Engine... {(downloadProgress * 100).toFixed(0)}%
               </Text>
            </View>
          )}

          {!hasModel && !isDownloading && (
            <TouchableOpacity 
              onPress={handleDownload}
              className="mt-10 bg-primary p-5 rounded-2xl items-center shadow-lg shadow-primary/20"
            >
              <Text className="text-white font-black uppercase tracking-widest text-xs">Download Model</Text>
            </TouchableOpacity>
          )}

          {hasModel && (
            <View className="mt-10 gap-y-3">
              <View className="bg-white/5 p-5 rounded-2xl border border-white/5 items-center">
                 <Text className="text-white text-xs font-bold text-center italic opacity-60">
                   Active Model: Ready for total privacy
                 </Text>
              </View>
              <TouchableOpacity 
                onPress={handleDelete}
                className="p-5 rounded-2xl items-center border border-destructive/20"
              >
                <Text className="text-destructive font-black uppercase tracking-widest text-xs opacity-60">Delete Local Data</Text>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>

        <View className="px-4 gap-y-4">
          <View className="flex-row gap-x-3 items-center opacity-60">
            <IconSymbol name="lock.fill" size={14} color="#999" />
            <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex-1">
              Data remains in your secure enclave. No telemetry or server calls.
            </Text>
          </View>
          <View className="flex-row gap-x-3 items-center opacity-60">
            <IconSymbol name="battery.100" size={14} color="#999" />
            <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex-1">
              Local AI uses more battery but ensures total financial privacy.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
