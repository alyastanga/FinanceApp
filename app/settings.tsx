import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { seedDatabase } from '../_tests_dev/seed';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function Settings() {
  const router = useRouter();

  const handleSeed = async () => {
    const success = await seedDatabase();
    if (success) {
      Alert.alert("Success", "Database seeded with mock financial data.");
    } else {
      Alert.alert("Error", "Seeding failed. Check console for details.");
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-[#050505] p-6">
      <Text className="text-3xl font-black text-foreground tracking-tighter">Settings</Text>
      <Text className="mt-2 text-lg text-muted-foreground font-bold italic opacity-60">
        App Infrastructure & Debug
      </Text>

      <View className="mt-12 w-full gap-y-4">
        <TouchableOpacity
          onPress={() => router.push('/model-settings')}
          className="w-full rounded-[24px] bg-[#10b981]/10 p-6 border border-[#10b981]/20 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-x-4">
             <View className="h-8 w-8 bg-[#10b981]/20 rounded-xl items-center justify-center">
                <IconSymbol name="cpu.fill" size={16} color="#10b981" />
             </View>
             <Text className="text-[#10b981] font-black uppercase tracking-widest text-xs">
               AI Local Engine
             </Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color="#10b981" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSeed}
          className="w-full rounded-[24px] bg-white/[0.03] p-6 border border-white/5 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-x-4 opacity-40">
             <View className="h-8 w-8 bg-white/10 rounded-xl items-center justify-center">
                <IconSymbol name="bolt.fill" size={16} color="white" />
             </View>
             <Text className="text-white font-black uppercase tracking-widest text-xs">
               Seed Database
             </Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color="white" style={{ opacity: 0.2 }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className="w-full rounded-[24px] bg-muted p-6 items-center"
        >
          <Text className="text-muted-foreground font-black uppercase tracking-widest text-xs">
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
