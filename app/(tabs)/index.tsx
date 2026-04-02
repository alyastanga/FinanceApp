import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import BalanceSummary from '../../components/BalanceSummary';
import TransactionList from '../../components/TransactionList';
import IncomeForm from '../../components/IncomeForm';
import ExpenseForm from '../../components/ExpenseForm';
import { importCSV } from '../../lib/csv-import';

export default function Dashboard() {
  const [activeModal, setActiveModal] = useState<'income' | 'expense' | null>(null);

  const handleImport = async () => {
    await importCSV();
  };

  // Optimized header that will be virtualized inside the FlatList
  const DashboardHeader = () => (
    <View className="pt-6">
      <Text className="mb-6 text-3xl font-black text-foreground">My Wealth</Text>

      {/* Total Balance Card */}
      <BalanceSummary />

      {/* Quick Action Buttons */}
      <View className="mb-10 flex-row gap-x-4">
        <TouchableOpacity
          onPress={() => setActiveModal('income')}
          className="flex-1 items-center rounded-2xl bg-primary p-4 shadow-lg shadow-primary/30"
        >
          <Text className="font-bold text-primary-foreground">+ Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveModal('expense')}
          className="flex-1 items-center rounded-2xl bg-destructive p-4 shadow-lg shadow-destructive/30"
        >
          <Text className="font-bold text-destructive-foreground">- Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleImport}
          className="flex-1 items-center rounded-2xl bg-muted p-4 shadow-sm"
        >
          <Text className="font-bold text-muted-foreground">Import</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* 
          VIRTUALIZATION OPTIMIZATION:
          Consolidated the entire dashboard into a single FlatList inside TransactionList.
          This eliminates the 'VirtualizedLists should never be nested' warning.
      */}
      <TransactionList Header={DashboardHeader} />

      {/* Input Modals */}
      <Modal
        visible={activeModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setActiveModal(null)}
            className="flex-1"
          >
            {Platform.OS === 'web' ? (
              <View className="flex-1 justify-end bg-black/80">
                <TouchableOpacity 
                  activeOpacity={1} 
                  onPress={(e) => e.stopPropagation()} 
                  className="rounded-t-[40px] bg-card p-8 shadow-2xl"
                >
                  <View className="pb-8">
                    {activeModal === 'income' ? (
                      <IncomeForm 
                        onSuccess={() => setActiveModal(null)} 
                        onCancel={() => setActiveModal(null)} 
                      />
                    ) : (
                      <ExpenseForm 
                        onSuccess={() => setActiveModal(null)} 
                        onCancel={() => setActiveModal(null)} 
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <BlurView intensity={80} tint="dark" className="flex-1 justify-end">
                <TouchableOpacity 
                  activeOpacity={1} 
                  onPress={(e) => e.stopPropagation()} 
                  className="rounded-t-[40px] bg-card/95 border-t border-white/10 p-8 shadow-2xl"
                >
                  <View className="pb-8">
                    {activeModal === 'income' ? (
                      <IncomeForm 
                        onSuccess={() => setActiveModal(null)} 
                        onCancel={() => setActiveModal(null)} 
                      />
                    ) : (
                      <ExpenseForm 
                        onSuccess={() => setActiveModal(null)} 
                        onCancel={() => setActiveModal(null)} 
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </BlurView>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
