/**
 * AIToggle — Lets the user switch between Cloud and Local AI modes.
 *
 * Cloud mode: Uses OpenRouter for full GPT-class responses.
 * Local mode: Uses on-device llama.rn (or fallback engine) for offline privacy.
 */
import type { AIMode } from '@/lib/llama-service';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface AIToggleProps {
  mode: AIMode;
  onToggle: (mode: AIMode) => void;
}

export function AIToggle({ mode, onToggle }: AIToggleProps) {
  const { isDark } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'center', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
      <TouchableOpacity
        onPress={() => onToggle('cloud')}
        activeOpacity={0.7}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderRadius: 14,
          backgroundColor: mode === 'cloud' ? '#10b981' : 'transparent',
        }}
      >
        <Text style={{
          fontSize: 9,
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: mode === 'cloud' ? '#050505' : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'),
        }}>
          Cloud
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onToggle('local')}
        activeOpacity={0.7}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderRadius: 14,
          backgroundColor: mode === 'local' ? '#8b5cf6' : 'transparent',
        }}
      >
        <Text style={{
          fontSize: 9,
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: mode === 'local' ? '#050505' : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'),
        }}>
          Local
        </Text>
      </TouchableOpacity>
    </View>
  );
}
