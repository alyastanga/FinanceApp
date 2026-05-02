import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext';
import { initLocalModel, releaseLocalModel } from '@/lib/llama-service';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const MODEL_URL = 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf';
const MODEL_NAME = 'qwen2.5-1.5b-instruct-q4_k_m.gguf';
const MODEL_SIZE_MB = 1120;

export default function ModelSettings() {
  const router = useRouter();
  const { isDark } = useTheme();
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
    console.log('[Model Settings] Starting download from:', MODEL_URL);
    setIsDownloading(true);
    setDownloadProgress(0);

    const downloadResumable = FileSystem.createDownloadResumable(
      MODEL_URL,
      modelPath,
      {},
      (downloadProgress) => {
        // Guard against division by zero or NaN if server doesn't provide content-length
        const total = downloadProgress.totalBytesExpectedToWrite;
        if (total > 0) {
          const progress = downloadProgress.totalBytesWritten / total;
          setDownloadProgress(progress);
        } else {
          // Fallback: estimate based on expected size or just show indeterminate movement
          // For now we'll just log
          console.log(`[Download] Progress: ${downloadProgress.totalBytesWritten} bytes written...`);
        }
      }
    );

    try {
      const result = await downloadResumable.downloadAsync();

      if (result && result.status === 200) {
        console.log('[Model Settings] Download completed. URI:', result.uri);
        setHasModel(true);

        // CRITICAL: Re-initialize the AI engine to use the newly downloaded file
        console.log('[Model Settings] Re-initializing local AI engine...');
        const success = await initLocalModel(modelPath, true);

        if (success) {
          Alert.alert('Success', 'Model downloaded and engine initialized for offline use.');
        } else {
          Alert.alert('Download Finished', 'The model was downloaded but the engine failed to load it. Please restart the app.');
        }
      } else {
        const status = result?.status;
        console.error('[Model Settings] Download failed with status:', status);
        Alert.alert('Download Failed', `Server returned status ${status || 'unknown'}.`);
      }
    } catch (e: any) {
      console.error('[Model Settings] Download Error:', e);
      Alert.alert('Download Error', `Failed to download: ${e.message || 'Unknown error'}`);
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
    <View className={`flex-1 p-6 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`}>
      <View className="flex-row items-center gap-x-4 mb-10 pt-12">
        <TouchableOpacity onPress={() => router.back()} className={`h-10 w-10 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
          <IconSymbol name="chevron.left" size={20} color={isDark ? "white" : "black"} />
        </TouchableOpacity>
        <View>
          <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-black'} tracking-tighter`}>AI Engine</Text>
          <Text className={`text-xs uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Model Management</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <BlurView intensity={isDark ? 20 : 80} tint={isDark ? "dark" : "light"} className={`border rounded-[40px] p-8 mb-10 overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-black/[0.03] border-black/5'}`}>
          <View className="items-center mb-8">
            <View className="h-16 w-16 bg-primary/20 rounded-3xl items-center justify-center mb-6">
              <IconSymbol name="cpu.fill" size={32} color="#10b981" />
            </View>
            <Text className={`font-black text-xl text-center ${isDark ? 'text-white' : 'text-black'}`}>Qwen 2.5 1.5B</Text>
            <Text className={`text-xs text-center mt-2 px-6 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
              Advanced reasoning optimized for mobile. Runs 100% offline.
            </Text>
          </View>

          <View className="gap-y-4">
            <View className={`flex-row justify-between items-center py-4 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
              <Text className={`font-bold text-xs uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>Status</Text>
              {checking ? (
                <ActivityIndicator size="small" color={isDark ? "white" : "black"} />
              ) : (
                <View className="flex-row items-center gap-x-2">
                  <View className={`h-2 w-2 rounded-full ${hasModel ? 'bg-primary' : 'bg-destructive'}`} />
                  <Text className={`font-black text-xs uppercase tracking-widest ${hasModel ? 'text-primary' : 'text-destructive'}`}>
                    {hasModel ? 'Ready' : 'Missing'}
                  </Text>
                </View>
              )}
            </View>

            <View className={`flex-row justify-between items-center py-4 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
              <Text className={`font-bold text-xs uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-black/60'}`}>File Size</Text>
              <Text className={`font-black text-xs uppercase tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>{MODEL_SIZE_MB}MB</Text>
            </View>
          </View>

          {isDownloading && (
            <View className="mt-8">
              <View className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <View
                  style={{ width: `${downloadProgress * 100}%` }}
                  className="h-full bg-primary"
                />
              </View>
              <Text className={`text-[10px] uppercase font-black tracking-widest mt-3 text-center ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                Downloading Support Engine... {(downloadProgress * 100).toFixed(0)}%
              </Text>
            </View>
          )}

          {!hasModel && !isDownloading && (
            <TouchableOpacity
              onPress={handleDownload}
              className="mt-10 bg-primary p-5 rounded-2xl items-center shadow-lg shadow-primary/20"
            >
              <Text className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-white' : 'text-black'}`}>Download Model</Text>
            </TouchableOpacity>
          )}

          {hasModel && (
            <View className="mt-10 gap-y-3">
              <View className={`p-5 rounded-2xl border items-center ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                <Text className={`text-xs font-bold text-center italic opacity-60 ${isDark ? 'text-white' : 'text-black'}`}>
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
            <IconSymbol name="lock.fill" size={14} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} />
            <Text className={`text-[10px] font-bold uppercase tracking-widest flex-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
              Data remains in your secure enclave. No telemetry or server calls.
            </Text>
          </View>
          <View className="flex-row gap-x-3 items-center opacity-60">
            <IconSymbol name="battery.100" size={14} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} />
            <Text className={`text-[10px] font-bold uppercase tracking-widest flex-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
              Local AI uses more battery but ensures total financial privacy.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
