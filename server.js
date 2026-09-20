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
  Alert,
  Image
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
        {/* Banner Immagine Professionale */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop' }}
            style={styles.headerImage}
          />
          <View style={styles.imageOverlay}>
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
    backgroundColor: '#121214',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  imageContainer: {
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 18, 20, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#1f1f23',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#27272a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#1f1f23',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    borderRadius: 10,
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
    backgroundColor: '#1f1f23',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
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
    borderColor: '#52525b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxCompleted: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
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
    color: '#71717a',
    textDecorationLine: 'line-through',
  },
  deleteText: {
    color: '#71717a',
    fontSize: 18,
    paddingLeft: 10,
  },
});
