import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AlertButton {
  text: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
}

interface AlertState {
  isVisible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

let setAlertStateRef: ((state: AlertState) => void) | null = null;

export const CustomAlert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    if (setAlertStateRef) {
      setAlertStateRef({
        isVisible: true,
        title,
        message,
        buttons: buttons || [{ text: 'OK', style: 'default' }]
      });
    } else {
      // Fallback to native if provider is not mounted
      const { Alert } = require('react-native');
      Alert.alert(title, message, buttons);
    }
  }
};

export const CustomAlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    isVisible: false,
    title: '',
    buttons: []
  });
  const { isDark } = useTheme();

  useEffect(() => {
    setAlertStateRef = setAlertState;
    return () => { setAlertStateRef = null; };
  }, []);

  const handlePress = (button: AlertButton) => {
    setAlertState(prev => ({ ...prev, isVisible: false }));
    if (button.onPress) {
      // Small timeout to allow modal to start closing before executing action
      setTimeout(() => button.onPress!(), 100);
    }
  };

  return (
    <>
      {children}
      <Modal
        visible={alertState.isVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.overlay}>
           {/* Dark blur overlay */}
           <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)' }]} />
           
           <View className={`w-4/5 max-w-[320px] rounded-3xl p-6 overflow-hidden ${isDark ? 'bg-[#151515] border border-white/10' : 'bg-white border border-black/5'}`} style={{ elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10 }}>
             <Text className={`text-xl font-black text-center mb-2 tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
               {alertState.title}
             </Text>
             {alertState.message && (
               <Text className={`text-[13px] text-center font-medium leading-5 mb-6 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                 {alertState.message}
               </Text>
             )}
             
             <View className={`flex-row ${alertState.buttons.length > 2 ? 'flex-col gap-y-3' : 'gap-x-3 justify-center mt-2'}`}>
               {alertState.buttons.map((btn, index) => {
                 let btnStyle = `flex-1 py-3.5 rounded-2xl items-center `;
                 let textStyle = `font-black text-[11px] uppercase tracking-widest `;
                 
                 if (btn.style === 'destructive') {
                   btnStyle += `bg-red-500/10 border border-red-500/20`;
                   textStyle += `text-red-500`;
                 } else if (btn.style === 'cancel') {
                   btnStyle += isDark ? `bg-white/5 border border-white/5` : `bg-black/5 border border-black/5`;
                   textStyle += isDark ? `text-white/60` : `text-black/60`;
                 } else {
                   // default
                   btnStyle += `bg-primary`;
                   textStyle += isDark ? `text-black` : `text-white`;
                 }

                 if (alertState.buttons.length > 2) {
                   btnStyle = btnStyle.replace('flex-1', 'w-full');
                 }

                 return (
                   <TouchableOpacity 
                     key={index} 
                     onPress={() => handlePress(btn)}
                     className={btnStyle}
                   >
                     <Text className={textStyle}>{btn.text}</Text>
                   </TouchableOpacity>
                 );
               })}
             </View>
           </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
