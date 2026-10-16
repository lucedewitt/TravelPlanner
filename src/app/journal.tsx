import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { Alert, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTrips } from '@/context/TripsContext';

type JournalEntry = { id: string; tripId: string; title: string; body: string; date: string };

// Used only as fallback content when no journal entries have been saved yet.
const initialEntries: JournalEntry[] = [
  {
    id: 'intro',
    tripId: '1',
    title: 'Trip plans',
    body: 'Use this journal to keep notes, memories, and ideas for the trip.',
    date: 'October 14, 2026',
  },
];
const ENTRIES_STORAGE_KEY = '@travel-planner/journal-entries';

export default function JournalScreen() {
  // Trips are shared with index.tsx through the context provider.
  const { trips, addTrip, removeTrip } = useTrips();
  const [selectedTripId, setSelectedTripId] = useState('1');
  const [entries, setEntries] = useState(initialEntries);
  const [tripMenuVisible, setTripMenuVisible] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [createTripModalVisible, setCreateTripModalVisible] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryBody, setNewEntryBody] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryTitle, setEditEntryTitle] = useState('');
  const [editEntryBody, setEditEntryBody] = useState('');

  // Load saved notes once. The loaded flag prevents fallback content from
  // overwriting entries that already exist in AsyncStorage.
  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(ENTRIES_STORAGE_KEY)
      .then(savedEntries => {
        if (!isMounted) return;
        if (savedEntries) {
          try {
            const parsedEntries = JSON.parse(savedEntries) as JournalEntry[];
            if (Array.isArray(parsedEntries)) setEntries(parsedEntries);
          } catch {
            // Fall back to the starter entry if saved data is invalid.
          }
        }
        setEntriesLoaded(true);
      })
      .catch(() => setEntriesLoaded(true));

    return () => {
      isMounted = false;
    };
  }, []);

  // Persist new, edited, and deleted entries locally on the device.
  useEffect(() => {
    if (entriesLoaded) {
      AsyncStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries)).catch(() => {
        // Keep the app usable if the native storage module is unavailable.
      });
    }
  }, [entries, entriesLoaded]);

  // Only show entries belonging to the active trip.
  const selectedTrip = trips.find(trip => trip.id === selectedTripId) ?? trips[0];
  const selectedEntries = entries.filter(entry => entry.tripId === selectedTripId);

  // Keep the screen usable if the active trip was deleted elsewhere.
  useEffect(() => {
    if (trips.length > 0 && !trips.some(trip => trip.id === selectedTripId)) {
      setSelectedTripId(trips[0].id);
    }
  }, [selectedTripId, trips]);

  const createTrip = () => {
    const name = newTripName.trim();
    if (!name) return;
    const trip = addTrip(name);
    if (!trip) return;
    setSelectedTripId(trip.id);
    setNewTripName('');
    setTripMenuVisible(false);
    setCreateTripModalVisible(false);
  };

  const deleteTrip = (tripId: string) => {
    if (trips.length === 1) {
      Alert.alert('Cannot delete trip', 'You must keep at least one trip.');
      return;
    }

    const trip = trips.find(item => item.id === tripId);
    if (!trip) return;

    Alert.alert('Delete trip?', `Delete "${trip.name}" and its journal entries?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const remainingTrips = trips.filter(item => item.id !== tripId);
          removeTrip(tripId);
          setEntries(currentEntries => currentEntries.filter(entry => entry.tripId !== tripId));
          if (selectedTripId === tripId) setSelectedTripId(remainingTrips[0].id);
          setTripMenuVisible(false);
        },
      },
    ]);
  };

  const getTripSwipeResponder = (tripId: string) =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -60) deleteTrip(tripId);
      },
    });

  // Create a new note and place it at the top of the journal.
  const addEntry = () => {
    const title = newEntryTitle.trim();
    const body = newEntryBody.trim();
    if (!title && !body) return;
    setEntries(currentEntries => [
      {
        id: Date.now().toString(),
        tripId: selectedTripId,
        title: title || 'Untitled entry',
        body,
        date: new Date().toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        }),
      },
      ...currentEntries.filter(entry => entry.id !== 'intro' || entry.tripId !== selectedTripId),
    ]);
    setNewEntryTitle('');
    setNewEntryBody('');
    setIsWriting(false);
  };

  // Copy the selected entry into form state so it can be edited inline.
  const startEditingEntry = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setEditEntryTitle(entry.title);
    setEditEntryBody(entry.body);
  };

  const cancelEditingEntry = () => {
    setEditingEntryId(null);
    setEditEntryTitle('');
    setEditEntryBody('');
  };

  const saveEditedEntry = () => {
    const title = editEntryTitle.trim();
    const body = editEntryBody.trim();
    if (!title && !body) return;

    setEntries(currentEntries => currentEntries.map(entry => (
      entry.id === editingEntryId
        ? { ...entry, title: title || 'Untitled entry', body }
        : entry
    )));
    cancelEditingEntry();
  };

  const deleteEntry = (entry: JournalEntry) => {
    Alert.alert('Delete entry?', `Delete "${entry.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setEntries(currentEntries => currentEntries.filter(item => item.id !== entry.id));
          if (editingEntryId === entry.id) cancelEditingEntry();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* Header and shared trip selector */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoBackground}>
            <Image source={require('../../assets/images/appIcon120.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Travel Planner</Text>
        </View>

        <View style={styles.tripMenuContainer}>
          <Pressable style={styles.tripSelector} onPress={() => setTripMenuVisible(value => !value)}>
            <Text style={styles.tripSelectorText}>{selectedTrip?.name}</Text>
            <Text style={styles.tripSelectorArrow}>⌄</Text>
          </Pressable>
          {tripMenuVisible && (
            <View style={styles.tripDropdown}>
              <Pressable
                style={styles.createTripOption}
                onPress={() => {
                  setTripMenuVisible(false);
                  setCreateTripModalVisible(true);
                }}
              >
                <Text style={styles.createTripOptionText}>+ Create trip</Text>
              </Pressable>
              {trips.map(trip => (
                <View key={trip.id} {...getTripSwipeResponder(trip.id).panHandlers}>
                  <Pressable style={styles.tripOption} onPress={() => {
                    setSelectedTripId(trip.id);
                    setTripMenuVisible(false);
                  }}>
                    <View style={styles.tripOptionContent}>
                      <Text style={styles.tripOptionText}>{trip.name}</Text>
                      <Image source={require('../../assets/images/trashicon18.png')} style={styles.trashIcon} />
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Journal list and add/edit forms */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeadingRow}>
          <View>
            <Text style={styles.pageTitle}>Trip journal</Text>
            <Text style={styles.pageSubtitle}>{selectedTrip?.name}</Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => setIsWriting(value => !value)}>
            <Text style={styles.addButtonText}>{isWriting ? 'Cancel' : '+ Add entry'}</Text>
          </Pressable>
        </View>

        {isWriting && (
          <View style={styles.entryForm}>
            <Text style={styles.formTitle}>New journal entry</Text>
            <TextInput style={styles.input} value={newEntryTitle} onChangeText={setNewEntryTitle} placeholder="Entry title" placeholderTextColor="#80909A" />
            <TextInput
              style={[styles.input, styles.bodyInput]}
              value={newEntryBody}
              onChangeText={setNewEntryBody}
              placeholder="Write about your trip..."
              placeholderTextColor="#80909A"
              multiline
              textAlignVertical="top"
            />
            <Pressable style={styles.saveButton} onPress={addEntry}>
              <Text style={styles.saveButtonText}>Save entry</Text>
            </Pressable>
          </View>
        )}

        {selectedEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>Add a note to start your trip journal.</Text>
          </View>
        ) : selectedEntries.map(entry => (
          <View style={styles.entryCard} key={entry.id}>
            {editingEntryId === entry.id ? (
              <>
                <TextInput
                  style={styles.input}
                  value={editEntryTitle}
                  onChangeText={setEditEntryTitle}
                  placeholder="Entry title"
                  placeholderTextColor="#80909A"
                />
                <TextInput
                  style={[styles.input, styles.bodyInput]}
                  value={editEntryBody}
                  onChangeText={setEditEntryBody}
                  placeholder="Write about your trip..."
                  placeholderTextColor="#80909A"
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.entryActions}>
                  <Pressable style={styles.saveButton} onPress={saveEditedEntry}>
                    <Text style={styles.saveButtonText}>Save changes</Text>
                  </Pressable>
                  <Pressable style={styles.closeButton} onPress={cancelEditingEntry}>
                    <Text style={styles.closeButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.entryTitle}>{entry.title}</Text>
                <Text style={styles.entryDate}>{entry.date}</Text>
                {!!entry.body && <Text style={styles.entryBody}>{entry.body}</Text>}
                <View style={styles.entryActions}>
                  <Pressable style={styles.editEntryButton} onPress={() => startEditingEntry(entry)}>
                    <Text style={styles.buttonText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.deleteEntryButton} onPress={() => deleteEntry(entry)}>
                    <Text style={styles.buttonText}>Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={createTripModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateTripModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create a trip</Text>
            <TextInput
              style={styles.input}
              value={newTripName}
              onChangeText={setNewTripName}
              placeholder="Trip name"
              placeholderTextColor="#80909A"
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <Pressable style={styles.addButton} onPress={createTrip}>
                <Text style={styles.buttonText}>Create trip</Text>
              </Pressable>
              <Pressable
                style={styles.closeButton}
                onPress={() => {
                  setNewTripName('');
                  setCreateTripModalVisible(false);
                }}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { height: 100, backgroundColor: '#DA6555', zIndex: 10 },
  headerContent: { marginTop: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  logoBackground: { height: 35, width: 36, backgroundColor: '#41B8AA', marginRight: 12, borderRadius: 10 },
  logo: { width: 60, height: 60, position: 'relative', right: 12, bottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#222222' },
  tripMenuContainer: { position: 'absolute', top: 50, right: -50, width: 160, zIndex: 20 },
  tripSelector: { minHeight: 36, paddingHorizontal: 10, width: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 8 },
  tripSelectorText: { flex: 1, color: '#194454', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  tripSelectorArrow: { marginLeft: 6, fontSize: 24, lineHeight: 24, color: '#194454' },
  tripDropdown: { position: 'absolute', top: 40, right: 60, width: 160, paddingVertical: 4, backgroundColor: '#ffffff', borderRadius: 8, elevation: 5, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  createTripOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  createTripOptionText: { color: '#194454', fontWeight: 'bold', textAlign: 'center' },
  tripOption: { paddingHorizontal: 12, paddingVertical: 10 },
  tripOptionContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripOptionText: { flex: 1, color: '#222222', textAlign: 'center' },
  trashIcon: { width: 18, height: 18, marginLeft: 8 },
  content: { padding: 16, paddingBottom: 110 },
  pageHeadingRow: { marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { color: '#194454', fontSize: 28, fontWeight: 'bold' },
  pageSubtitle: { marginTop: 4, color: '#6C7C84', fontSize: 15 },
  addButton: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#41B8AA', borderRadius: 8 },
  addButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  entryForm: { marginBottom: 18, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F0DDD0' },
  formTitle: { marginBottom: 12, color: '#194454', fontSize: 18, fontWeight: 'bold' },
  input: { marginBottom: 10, padding: 12, backgroundColor: '#FFFDFC', borderWidth: 1, borderColor: '#D5DEE2', borderRadius: 8, color: '#194454' },
  bodyInput: { minHeight: 120 },
  saveButton: { alignItems: 'center', padding: 12, backgroundColor: '#194454', borderRadius: 8 },
  saveButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  modalContent: { width: '85%', padding: 20, backgroundColor: '#FFFFFF', borderRadius: 16 },
  modalTitle: { marginBottom: 12, color: '#194454', fontSize: 20, fontWeight: 'bold' },
  modalButtonRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold' },
  closeButton: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#194454', borderRadius: 8 },
  closeButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  entryCard: { marginBottom: 12, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderLeftWidth: 5, borderLeftColor: '#41B8AA' },
  entryTitle: { color: '#194454', fontSize: 19, fontWeight: 'bold' },
  entryDate: { marginTop: 4, color: '#80909A', fontSize: 13 },
  entryBody: { marginTop: 12, color: '#34444C', fontSize: 16, lineHeight: 23 },
  entryActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  editEntryButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#41B8AA', borderRadius: 8 },
  deleteEntryButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#D9534F', borderRadius: 8 },
  emptyCard: { padding: 24, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center' },
  emptyTitle: { color: '#194454', fontSize: 18, fontWeight: 'bold' },
  emptyText: { marginTop: 6, color: '#6C7C84' },
});
