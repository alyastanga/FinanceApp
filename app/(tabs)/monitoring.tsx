import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InsightsDashboard from '@/components/InsightsDashboard';
import { useAI } from '../../context/AIContext';

import { useTheme } from '../../context/ThemeContext';

export default function InsightsScreen() {
  const { aiMode } = useAI();
  const { isDark } = useTheme();

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F5]'}`} edges={['top']}>
       <InsightsDashboard useLocal={aiMode === 'local'} />
    </SafeAreaView>
  );
}
