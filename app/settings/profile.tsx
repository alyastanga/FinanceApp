import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { clearActiveDEK, updatePassphrase } from '../../lib/key-manager';
import { supabase } from '../../lib/supabase';
import { PasswordInput } from '@/components/ui/PasswordInput';

export default function ProfileSettingsScreen() {
  const { isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Password Change States
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const textClass = isDark ? 'text-white' : 'text-neutral-900';
  const subTextClass = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const bgClass = isDark ? 'bg-[#050505]' : 'bg-neutral-50';
  const cardBgClass = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const borderClass = isDark ? 'border-white/5' : 'border-neutral-200';

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      const name = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
      setDisplayName(name);
      setOriginalName(name);
    }
    fetchUser();
  }, []);

  const handleUpdateProfile = async () => {
    if (displayName === originalName) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });

      if (error) throw error;

      setOriginalName(displayName);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (error: any) {
      Alert.alert("Update Failed", error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long.");
      return;
    }

    setIsChangingPassword(true);
    try {
      // 1. Update Encryption Vault (DEK Re-wrap)
      // This also verifies the current password is correct for decryption.
      await updatePassphrase(currentPassword, newPassword);

      // 2. Update Supabase Password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      Alert.alert("Success", "Password updated successfully. Your encryption vault is now secured with the new password.");
      setIsPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert("Failed to update password", error.message || "An error occurred during re-encryption.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out? This will also lock your encryption vault for security.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              clearActiveDEK();
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              router.replace('/login');
            } catch (error: any) {
              Alert.alert("Logout Failed", error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`} edges={['top']}>
      <View className="px-gsd-lg py-gsd-lg flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className={`z-10 h-gsd-huge w-gsd-huge rounded-gsd-md items-center justify-center border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
        >
          <IconSymbol name="chevron.left" size={18} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className={`text-2xl font-black ${textClass} tracking-tighter`}>Profile Settings</Text>
        </View>
        <View className="w-gsd-huge" />
      </View>

      <ScrollView className="flex-1 px-6 mt-8">
        <View className="items-center mb-10">
          <View className={`w-24 h-24 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500/10'} items-center justify-center border-4 ${borderClass}`}>
            <IconSymbol name="person.fill" size={48} color="#10b981" />
          </View>
          <View className="flex-row items-center justify-center mt-4 w-full gap-x-2">
            <View className="w-6" />
            <TextInput
              ref={inputRef}
              className={`text-2xl font-bold ${textClass} text-center ${isEditing ? 'border-b border-primary/50' : ''} pb-1`}
              value={displayName}
              onChangeText={setDisplayName}
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
              onSubmitEditing={() => {
                setIsEditing(false);
                Keyboard.dismiss();
                handleUpdateProfile();
              }}
              returnKeyType="done"
              placeholder="Username"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
              style={{ minWidth: 100, maxWidth: '80%' }}
            />
            <TouchableOpacity onPress={() => inputRef.current?.focus()}>
              <IconSymbol name="pencil" size={16} color="#10b981" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
          </View>
          <Text className={`${subTextClass} text-sm mt-1`}>{user?.email}</Text>

          {displayName !== originalName && (
            <TouchableOpacity
              onPress={handleUpdateProfile}
              disabled={isUpdating}
              className="mt-4 bg-primary px-6 py-2 rounded-full"
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#050505" />
              ) : (
                <Text className="text-[#050505] font-black text-[10px] uppercase tracking-widest">Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View className="mb-6">
          <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Account Details</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <View className={`p-5 border-b ${borderClass}`}>
              <Text className={`${subTextClass} text-xs uppercase tracking-widest font-black mb-1`}>User ID</Text>
              <Text className={`${textClass} font-mono text-xs`} numberOfLines={1}>{user?.id}</Text>
            </View>

            <View className={`p-5 border-b ${borderClass}`}>
              <Text className={`${subTextClass} text-xs uppercase tracking-widest font-black mb-1`}>Login Method</Text>
              <Text className={`${textClass} font-medium`}>Email & Password</Text>
            </View>
          </View>
        </View>

        <View className="mb-8">
          <Text className={`text-[10px] font-black ${textClass} uppercase tracking-[3px] ml-2 mb-2 opacity-30`}>Security</Text>
          <View className={`${cardBgClass} rounded-[32px] border ${borderClass} overflow-hidden`}>
            <TouchableOpacity 
              onPress={() => setIsPasswordModalVisible(true)}
              className="p-5 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-x-3">
                <View className={`p-2 rounded-full ${isDark ? 'bg-primary/10' : 'bg-primary/5'}`}>
                  <IconSymbol name="lock.fill" size={16} color="#10b981" />
                </View>
                <View>
                  <Text className={`${textClass} font-bold`}>Change Password</Text>
                  <Text className={`${subTextClass} text-[10px]`}>Update your login and vault key</Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={16} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500/10 py-5 rounded-[32px] border border-red-500/20 items-center flex-row justify-center gap-x-3"
        >
          <IconSymbol name="arrow.left.square.fill" size={20} color="#f87171" />
          <Text className="text-red-400 font-bold text-base">Logout</Text>
        </TouchableOpacity>

        <Text className={`text-center mt-6 ${subTextClass} text-[10px] uppercase tracking-[2px] font-black`}>
          Zero-Knowledge Finance v1.0
        </Text>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={isPasswordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/60"
        >
          <View className={`${cardBgClass} rounded-t-[40px] p-6 pb-12 border-t ${borderClass}`}>
            <View className="flex-row items-center justify-between mb-8">
              <Text className={`text-xl font-black ${textClass}`}>Change Password</Text>
              <TouchableOpacity 
                onPress={() => setIsPasswordModalVisible(false)}
                className={`p-2 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}
              >
                <IconSymbol name="xmark" size={20} color={isDark ? "white" : "black"} />
              </TouchableOpacity>
            </View>

            <View className="gap-y-4">
              <View>
                <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest mb-2 ml-1`}>Current Password</Text>
                <PasswordInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Required for re-encryption"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)"}
                  className={`${textClass} font-medium`}
                  containerClass="bg-black/5 dark:bg-white/5 p-4 rounded-2xl"
                  isDark={isDark}
                />
              </View>

              <View>
                <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest mb-2 ml-1`}>New Password</Text>
                <PasswordInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)"}
                  className={`${textClass} font-medium`}
                  containerClass="bg-black/5 dark:bg-white/5 p-4 rounded-2xl"
                  isDark={isDark}
                />
              </View>

              <View>
                <Text className={`${subTextClass} text-[10px] font-black uppercase tracking-widest mb-2 ml-1`}>Confirm New Password</Text>
                <PasswordInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat new password"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)"}
                  className={`${textClass} font-medium`}
                  containerClass="bg-black/5 dark:bg-white/5 p-4 rounded-2xl"
                  isDark={isDark}
                />
              </View>

              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={isChangingPassword}
                className="bg-primary py-4 rounded-2xl items-center mt-4"
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="#050505" />
                ) : (
                  <Text className="text-[#050505] font-black text-xs uppercase tracking-widest">Update Password</Text>
                )}
              </TouchableOpacity>
              
              <Text className={`${subTextClass} text-[9px] text-center mt-2 px-6 leading-4`}>
                This will update both your login credentials and your encryption vault access key.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
