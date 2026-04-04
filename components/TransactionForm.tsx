import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import database from '../database';
import { useAuth } from '../context/AuthContext';

interface TransactionFormProps {
  initialType?: 'income' | 'expense';
  onSuccess?: () => void;
}

export default function TransactionForm({ initialType = 'expense', onSuccess }: TransactionFormProps) {
  const { user, loading: authLoading } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    // Definitive mobile stabilization: Delay interactive mount to let native context settle
    const transitionTimer = setTimeout(() => {
      setIsHydrated(true);
    }, 50);
    return () => clearTimeout(transitionTimer);
  }, []);

  if (authLoading || !user || !isHydrated) {
    return (
      <View className="h-[300px] items-center justify-center bg-card/40 rounded-[32px] border border-white/5">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  async function handleSubmit() {
    if (!amount || !description || !user) return;

    try {
      await database.write(async () => {
        if (type === 'income') {
          await database.get('incomes').create((record: any) => {
            record.amount = parseFloat(amount);
            record.source = description;
            record.userId = user.id;
            record.createdAt = new Date();
            record.updatedAt = new Date();
          });
        } else {
          await database.get('expenses').create((record: any) => {
            record.amount = parseFloat(amount);
            record.category = description;
            record.userId = user.id;
            record.createdAt = new Date();
            record.updatedAt = new Date();
          });
        }
      });

      setAmount('');
      setDescription('');
      if (onSuccess) onSuccess();
      Alert.alert('Success', `${type} added locally!`);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  }

  return (
    <View className="bg-card/40 p-6 rounded-[32px] border border-white/5">
      {/* Hide toggle if we have a locked initialType */}
      {!initialType && (
        <View className="flex-row bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
          <Pressable 
            className={`flex-1 py-3 rounded-xl items-center ${type === 'expense' ? 'bg-white/10 shadow-sm' : ''}`}
            onPress={() => setType('expense')}
          >
            <Text className={`font-black text-[11px] uppercase tracking-widest ${type === 'expense' ? 'text-white' : 'text-muted-foreground'}`}>Expense</Text>
          </Pressable>
          <Pressable 
            className={`flex-1 py-3 rounded-xl items-center ${type === 'income' ? 'bg-white/10 shadow-sm' : ''}`}
            onPress={() => setType('income')}
          >
            <Text className={`font-black text-[11px] uppercase tracking-widest ${type === 'income' ? 'text-white' : 'text-muted-foreground'}`}>Income</Text>
          </Pressable>
        </View>
      )}

      <View className="space-y-6">
        <View>
          <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 mb-3 pl-1">Amount</Text>
          <View className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <TextInput
              className="text-4xl font-black text-white p-0"
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.1)"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        <View>
          <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 mb-3 pl-1">
            {type === 'income' ? 'Source' : 'Category'}
          </Text>
          <TextInput
            className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white font-bold"
            placeholder={type === 'income' ? 'e.g. Salary' : 'e.g. Shopping'}
            placeholderTextColor="rgba(255,255,255,0.1)"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <Pressable 
          className={`mt-4 overflow-hidden rounded-2xl`}
          onPress={handleSubmit}
        >
          {({ pressed }) => (
            <View className={`py-4 items-center ${type === 'expense' ? 'bg-destructive/80' : 'bg-primary'} ${pressed ? 'opacity-70' : ''}`}>
              <Text className="text-white font-black text-sm uppercase tracking-widest">
                Lock In {type}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
