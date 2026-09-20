import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const STORAGE_KEY = '@liberoflow_habits_v2';

export default function App() {
  const [habits, setHabits] = useState([]);
  const [newHabitText, setNewHabitText] = useState('');

  useEffect(() => {
    loadHabits();
  }, []);

  useEffect(() => {
    saveHabits(habits);
  }, [habits]);

  const loadHabits = async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedData !== null) {
        setHabits(JSON.parse(storedData));
      } else {
        setHabits([
          { id: '1', title: 'Sessione di Studio / Università', category: 'studio', completed: false },
          { id: '2', title: 'Programmazione & Codice', category: 'code', completed: false },
          { id: '3', title: 'Attività Fisica & Movimento', category: 'fitness', completed: false },
        ]);
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile caricare le abitudini salvate.');
    }
  };

  const saveHabits = async (currentHabits) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentHabits));
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare i dati.');
    }
  };

  const addHabit = () => {
    if (newHabitText.trim() === '') return;
    const newHabit = {
      id: Date.now().toString(),
      title: newHabitText.trim(),
      category: 'general',
      completed: false,
    };
    setHabits([...habits, newHabit]);
    setNewHabitText('');
  };

  const toggleHabit = (id) => {
    setHabits(
      habits.map((habit) =>
        habit.id === id ? { ...habit, completed: !habit.completed } : habit
      )
    );
  };

  const deleteHabit = (id) => {
    setHabits(habits.filter((habit) => habit.id !== id));
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'studio': return '📚';
      case 'code': return '💻';
      case 'fitness': return '⚡';
      default: return '🎯';
    }
  };

  const completedCount = habits.filter((h) => h.completed).length;
  const progress = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        {/* Header Stile Hevy (Geometrico e Minimale) */}
        <View style={styles.hevyHeader}>
          <View style={styles.appIconContainer}>
            <View style={styles.shapeVertical} />
            <View style={styles.shapeHorizontal} />
            <View style={styles.shapeAccent} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>LiberoFlow</Text>
            <Text style={styles.headerSubtitle}>Il tuo spazio di flusso quotidiano</Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressText}>
            Completate: {completedCount} su {habits.length}
          </Text>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Input per nuova abitudine */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Aggiungi una nuova abitudine..."
            placeholderTextColor="#8e8e93"
            value={newHabitText}
            onChangeText={setNewHabitText}
          />
          <TouchableOpacity style={styles.addButton} onPress={addHabit}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Lista Abitudini */}
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {habits.map((habit) => (
            <View key={habit.id} style={styles.habitCard}>
              <TouchableOpacity
                style={styles.habitInfo}
                onPress={() => toggleHabit(habit.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    habit.completed && styles.checkboxCompleted,
                  ]}
                >
                  {habit.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.habitIcon}>{getCategoryIcon(habit.category)}</Text>
                <Text
                  style={[
                    styles.habitTitle,
                    habit.completed && styles.habitTitleCompleted,
                  ]}
                >
                  {habit.title}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteHabit(habit.id)}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1015',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  /* Stili Header Hevy Style */
  hevyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181a20',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  appIconContainer: {
    width: 52,
    height: 52,
    backgroundColor: '#12141a',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  shapeVertical: {
    position: 'absolute',
    width: 7,
    height: 24,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    left: 12,
    top: 6,
  },
  shapeHorizontal: {
    position: 'absolute',
    width: 20,
    height: 7,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    left: 12,
    bottom: 6,
  },
  shapeAccent: {
    position: 'absolute',
    width: 7,
    height: 7,
    backgroundColor: '#2563eb',
    borderRadius: 3.5,
    top: 6,
    right: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#181a20',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#12141a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#181a20',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  addButton: {
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    borderRadius: 12,
    marginLeft: 10,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  habitCard: {
    flexDirection: 'row',
    backgroundColor: '#181a20',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  habitIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  habitTitle: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  habitTitleCompleted: {
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  deleteText: {
    color: '#6b7280',
    fontSize: 18,
    paddingLeft: 10,
  },
});
