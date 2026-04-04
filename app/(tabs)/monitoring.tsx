import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InsightsDashboard from '@/components/InsightsDashboard';
import { useAI } from '../../context/AIContext';

export default function InsightsScreen() {
  const { aiMode } = useAI();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
       <InsightsDashboard useLocal={aiMode === 'local'} />
    </SafeAreaView>
  );
}
