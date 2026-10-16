import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Trip = {
  id: string;
  name: string;
};

type TripsContextValue = {
  trips: Trip[];
  addTrip: (name: string) => Trip | null;
  removeTrip: (tripId: string) => void;
};

const initialTrips: Trip[] = [{ id: '1', name: 'Personal trip' }];
const TRIPS_STORAGE_KEY = '@travel-planner/trips';

const TripsContext = createContext<TripsContextValue | undefined>(undefined);

export function TripsProvider({ children }: React.PropsWithChildren) {
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(TRIPS_STORAGE_KEY)
      .then(savedTrips => {
        if (!isMounted) return;
        if (savedTrips) {
          try {
            const parsedTrips = JSON.parse(savedTrips) as Trip[];
            if (Array.isArray(parsedTrips) && parsedTrips.length > 0) {
              setTrips(parsedTrips);
            }
          } catch {
            // Fall back to the starter trip if saved data is invalid.
          }
        }
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips)).catch(() => {
        // Keep the app usable if the native storage module is unavailable.
      });
    }
  }, [isLoaded, trips]);

  const value = useMemo<TripsContextValue>(() => ({
    trips,
    addTrip: (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      const trip = { id: `${Date.now()}-${Math.random()}`, name: trimmedName };
      setTrips(currentTrips => [...currentTrips, trip]);
      return trip;
    },
    removeTrip: (tripId: string) => {
      setTrips(currentTrips => currentTrips.filter(trip => trip.id !== tripId));
    },
  }), [trips]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips() {
  const context = useContext(TripsContext);
  if (!context) {
    throw new Error('useTrips must be used inside a TripsProvider');
  }
  return context;
}
