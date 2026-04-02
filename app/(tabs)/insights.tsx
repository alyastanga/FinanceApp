import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InsightsDashboard from '@/components/InsightsDashboard';

export default function InsightsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-6">
          <Text className="text-3xl font-black text-foreground mb-2">Financial Insights</Text>
          <Text className="text-sm font-medium text-muted-foreground mb-8">
            Real-time monitoring of your wealth transformation.
          </Text>
        </View>

        {/* The Reactive Monitoring Dashboard */}
        <InsightsDashboard />
      </ScrollView>
    </SafeAreaView>
  );
}
