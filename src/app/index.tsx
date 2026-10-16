// import * as Device from 'expo-device';
import React, { useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Alert,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTrips } from '@/context/TripsContext';
// import { SafeAreaView } from 'react-native-safe-area-context';

// import { AnimatedIcon } from '@/components/animated-icon';
// import { HintRow } from '@/components/hint-row';
// import { ThemedText } from '@/components/themed-text';
// import { ThemedView } from '@/components/themed-view';
// import { WebBadge } from '@/components/web-badge';
// import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type EventItem = {
  id: string;
  tripId: string;
  date: string;
  title: string;
  time: string;
};

// These starter events are used only when the device has no saved calendar data yet.
const initialEvents: EventItem[] = [
  {
    id: '1',
    tripId: '1',
    date: '2026-10-15',
    title: 'Doctor appointment',
    time: '10:00 AM',
  },
  {
    id: '2',
    tripId: '1',
    date: '2026-10-15',
    title: 'Team meeting',
    time: '2:00 PM',
  },
  {
    id: '3',
    tripId: '1',
    date: '2026-10-20',
    title: 'Project deadline',
    time: 'All day',
  },
];
const EVENTS_STORAGE_KEY = '@travel-planner/events';

export default function HomeScreen() {
  // Trips come from the shared context so additions made on the journal screen
  // immediately appear in this screen's trip menu.
  const { trips, addTrip, removeTrip } = useTrips();
  const [selectedTripId, setSelectedTripId] = useState('1');
  const [events, setEvents] = useState(initialEvents);
  const [selectedDate, setSelectedDate] = useState('2026-10-15');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDay, setEditingDay] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [tripMenuVisible, setTripMenuVisible] = useState(false);
  const [createTripModalVisible, setCreateTripModalVisible] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const lastDayPress = useRef<{ dateString: string; timestamp: number } | null>(null);

  // Load calendar events once when the screen starts. The loaded flag prevents
  // the initial fallback data from overwriting saved events.
  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(EVENTS_STORAGE_KEY)
      .then(savedEvents => {
        if (!isMounted) return;
        if (savedEvents) {
          try {
            const parsedEvents = JSON.parse(savedEvents) as EventItem[];
            if (Array.isArray(parsedEvents)) setEvents(parsedEvents);
          } catch {
            // Fall back to the starter events if saved data is invalid.
          }
        }
        setEventsLoaded(true);
      })
      .catch(() => setEventsLoaded(true));

    return () => {
      isMounted = false;
    };
  }, []);

  // Persist every event change locally on the device.
  useEffect(() => {
    if (eventsLoaded) {
      AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events)).catch(() => {
        // Keep the app usable if the native storage module is unavailable.
      });
    }
  }, [events, eventsLoaded]);
  // These derived values keep the calendar and event list scoped to the
  // currently selected trip and date.
  const selectedTrip = trips.find(trip => trip.id === selectedTripId) ?? trips[0];
  const selectedEvents = events.filter(
    event => event.tripId === selectedTripId && event.date === selectedDate
  );
  const markedDates: Record<string, any> = {};

  // If a previously selected trip was deleted, fall back to the first remaining trip.
  useEffect(() => {
    if (trips.length > 0 && !trips.some(trip => trip.id === selectedTripId)) {
      setSelectedTripId(trips[0].id);
    }
  }, [selectedTripId, trips]);

  const formattedSelectedDate = (() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  })();

  // Add an event to the selected trip and calendar date.
  const addEvent = () => {
    if (!newEventTitle.trim()) return;

    setEvents(currentEvents => [
      ...currentEvents,
      {
        id: Date.now().toString(),
        tripId: selectedTripId,
        date: selectedDate,
        title: newEventTitle.trim(),
        time: newEventTime.trim() || 'All day',
      },
    ]);
    setNewEventTitle('');
    setNewEventTime('');
  };

  // Update only the edited field while preserving the rest of the event.
  const updateEvent = (id: string, field: 'title' | 'time', value: string) => {
    setEvents(currentEvents =>
      currentEvents.map(event =>
        event.id === id ? { ...event, [field]: value } : event
      )
    );
  };

  const deleteEvent = (id: string) => {
    setEvents(currentEvents => currentEvents.filter(event => event.id !== id));
  };

  // The shared context handles the trip list; this screen selects the new trip.
  const createTrip = () => {
    const name = newTripName.trim();
    if (!name) return;

    const newTrip = addTrip(name);
    if (!newTrip) return;

    setSelectedTripId(newTrip.id);
    setNewTripName('');
    setCreateTripModalVisible(false);
  };

  // Deleting a trip also removes its calendar events from local storage.
  const deleteTrip = (tripId: string) => {
    if (trips.length === 1) {
      Alert.alert('Cannot delete trip', 'You must keep at least one trip.');
      return;
    }

    const trip = trips.find(item => item.id === tripId);
    if (!trip) return;

    Alert.alert('Delete trip?', `Delete "${trip.name}" and its calendar events?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const remainingTrips = trips.filter(item => item.id !== tripId);
          removeTrip(tripId);
          setEvents(currentEvents => currentEvents.filter(event => event.tripId !== tripId));
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

  // A single tap changes the selected date; a second tap within 1.2 seconds
  // opens the event editor for that date.
  const handleDayPress = (day: { dateString: string }) => {
    const now = Date.now();
    const previousPress = lastDayPress.current;
    const isDoubleTap =
      previousPress?.dateString === day.dateString &&
      now - previousPress.timestamp < 1200;

    setSelectedDate(day.dateString);

    if (isDoubleTap) {
      setModalVisible(true);
      lastDayPress.current = null;
    } else {
      lastDayPress.current = {
        dateString: day.dateString,
        timestamp: now,
      };
    }
  };

  events
    .filter(event => event.tripId === selectedTripId)
    .forEach(event => {
    markedDates[event.date] = {
      marked: true,
      dotColor: '#995C54',
    };
  });

  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: '#EC9E4C',
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header and shared trip selector */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoBackground}>
            <Image
              source={require('../../assets/images/appIcon120.png')}
              style={styles.logo} resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Travel Planner</Text>
        </View>

        <View style={styles.tripMenuContainer}>
          <Pressable
            style={styles.tripSelector}
            onPress={() => setTripMenuVisible(currentValue => !currentValue)}
          >
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
                  <Pressable
                    style={styles.tripOption}
                    onPress={() => {
                      setSelectedTripId(trip.id);
                      setTripMenuVisible(false);
                    }}
                  >
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

      {/* Calendar and events for the selected day */}
      <View style={styles.container}>
        <Calendar
        style={{
          width: '100%',
          height: 380,
        }}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          theme={{
            arrowColor: '#41B8AA',
            todayTextColor: '#41B8AA',
            textDayFontSize: 18,
            textMonthFontSize: 22,
            textDayHeaderFontSize: 14,
          }}
        />

        <View style={styles.selectedDayEvents}>
          <ScrollView
            style={styles.eventsScrollView}
            contentContainerStyle={styles.eventsScrollContent}
            showsVerticalScrollIndicator
          >
            {selectedEvents.length === 0 ? (
              <Text style={styles.noEventsText}>No events for this day.</Text>
            ) : (
              selectedEvents.map(event => (
                <View style={styles.calendarEvent} key={event.id}>
                  <Text style={styles.calendarEventTitle}>{event.title}</Text>
                  <Text>{event.time}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Events on {formattedSelectedDate}
            </Text>

            <ScrollView>
              {selectedEvents.length === 0 && (
                <Text>No events for this day.</Text>
              )}

              {selectedEvents.map(item => (
                <View style={styles.event} key={item.id}>
                  {editingDay ? (
                    <>
                      <TextInput
                        style={styles.input}
                        value={item.title}
                        onChangeText={value => updateEvent(item.id, 'title', value)}
                        placeholder="Event title"
                      />
                      <TextInput
                        style={styles.input}
                        value={item.time}
                        onChangeText={value => updateEvent(item.id, 'time', value)}
                        placeholder="Time"
                      />
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => deleteEvent(item.id)}
                      >
                        <Text style={styles.deleteButtonText}>Delete event</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Text style={styles.titleC}>{item.title}</Text>
                      <Text>{item.time}</Text>
                    </>
                  )}
                </View>
              ))}

              {editingDay && (
                <View style={styles.addEventSection}>
                  <Text style={styles.sectionTitle}>Add event</Text>
                  <TextInput
                    style={styles.input}
                    value={newEventTitle}
                    onChangeText={setNewEventTitle}
                    placeholder="Event title"
                  />
                  <TextInput
                    style={styles.input}
                    value={newEventTime}
                    onChangeText={setNewEventTime}
                    placeholder="Time (optional)"
                  />
                  <Pressable style={styles.addButton} onPress={addEvent}>
                    <Text style={styles.buttonText}>Add event</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>

            <View style={styles.buttonRow}>
              <Pressable
                style={styles.editButton}
                onPress={() => setEditingDay(currentValue => !currentValue)}
              >
                <Text style={styles.buttonText}>
                  {editingDay ? 'Done editing' : 'Edit day'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setEditingDay(false);
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
              autoFocus
            />

            <View style={styles.buttonRow}>
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
  header: {
    height: 100,
    backgroundColor: '#DA6555',
    zIndex: 10,
    // height: 64,
    // paddingHorizontal: 16,
    // flexDirection: 'row',
    // alignItems: 'center',
    // backgroundColor: '#FFFFFF',
    // borderBottomWidth: 1,
    // borderBottomColor: '#e5e5e5',
  },
  headerContent: {
    marginTop: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBackground: {
    height: 35,
    width: 36,
    backgroundColor: '#41B8AA',
    marginRight: 12,
    borderRadius: 10,
  },
  logo: {
    width: 60,
    height: 60,
    // transform: [
    //   { translateX: -12}, // right
    //   { translateY: -16}, // down
    // ],
    position: 'relative',
    right: 12,
    bottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222222',
  },
  tripMenuContainer: {
    position: 'absolute',
    top: 50,
    right: -50,
    width: 160,
    zIndex: 20,
  },
  tripSelector: {
    minHeight: 36,
    paddingHorizontal: 10,
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  tripSelectorText: {
    flex: 1,
    color: '#194454',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  tripSelectorArrow: {
    marginLeft: 6,
    fontSize: 24,
    lineHeight: 24,
    color: '#194454',
  },
  tripDropdown: {
    position: 'absolute',
    top: 40,
    right: 60,
    width: 160,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  createTripOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  createTripOptionText: {
    color: '#194454',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tripOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tripOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripOptionText: {
    color: '#222222',
    flex: 1,
    textAlign: 'center',
  },
  trashIcon: {
    width: 18,
    height: 18,
    marginLeft: 8,
  },

  container: {
    flex: 1,
    padding: 16,
  },
  selectedDayEvents: {
    marginTop: 16,
  },
  selectedDayTitle: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventsScrollView: {
    maxHeight: 220,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  eventsScrollContent: {
    paddingBottom: 4,
  },
  noEventsText: {
    fontSize: 16,
    color: '#666666',
  },
  calendarEvent: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  calendarEventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  event: {
    padding: 16,
    marginTop: 10,
    backgroundColor: '#eeeeee',
    borderRadius: 8,
  },
  titleC: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 6,
  },
  addEventSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#41B8AA',
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#41B8AA',
    borderRadius: 8,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#d9534f',
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 10,
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#194454',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

// function getDevMenuHint() {
//   if (Platform.OS === 'web') {
//     return <ThemedText type="small">use browser devtools</ThemedText>;
//   }
//   if (Device.isDevice) {
//     return (
//       <ThemedText type="small">
//         shake device or press <ThemedText type="code">m</ThemedText> in terminal
//       </ThemedText>
//     );
//   }
//   const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
//   return (
//     <ThemedText type="small">
//       press <ThemedText type="code">{shortcut}</ThemedText>
//     </ThemedText>
//   );
// }

// export default function HomeScreen() {
//   return (
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={styles.safeArea}>
//         <ThemedView style={styles.heroSection}>
//           {/* <AnimatedIcon /> */}
//           <Image source={require("../../assets/images/appIcon120.png")} style={styles.image} />
//           <ThemedText type="title" style={styles.title}>
//             Welcome to&nbsp;Expo
//           </ThemedText>
//         </ThemedView>

//         <ThemedText type="code" style={styles.code}>
//           get started
//         </ThemedText>

//         <ThemedView type="backgroundElement" style={styles.stepContainer}>
//           <HintRow
//             title="Try editing"
//             hint={<ThemedText type="code">src/app/index.tsx</ThemedText>}
//           />
//           <HintRow title="Dev tools" hint={getDevMenuHint()} />
//           <HintRow
//             title="Fresh start"
//             hint={<ThemedText type="code">npm run reset-project</ThemedText>}
//           />
//         </ThemedView>

//         {Platform.OS === 'web' && <WebBadge />}
//       </SafeAreaView>
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     flexDirection: 'row',
//   },
//   safeArea: {
//     flex: 1,
//     paddingHorizontal: Spacing.four,
//     alignItems: 'center',
//     gap: Spacing.three,
//     paddingBottom: BottomTabInset + Spacing.three,
//     maxWidth: MaxContentWidth,
//   },
//   heroSection: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     flex: 1,
//     paddingHorizontal: Spacing.four,
//     gap: Spacing.four,
//   },
//   title: {
//     textAlign: 'center',
//   },
//   code: {
//     textTransform: 'uppercase',
//   },
//   stepContainer: {
//     gap: Spacing.three,
//     alignSelf: 'stretch',
//     paddingHorizontal: Spacing.three,
//     paddingVertical: Spacing.four,
//     borderRadius: Spacing.four,
//   },

//   image: {
//     width: 300,
//     height: 200,
//     resizeMode: "cover",
//   },
// });
