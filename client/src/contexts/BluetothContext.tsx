import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BluetoothDevice } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface BluetoothContextType {
  isScanning: boolean;
  nearbyDevices: BluetoothDevice[];
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  isBluetoothAvailable: boolean;
  error: string | null;
}

const BluetoothContext = createContext<BluetoothContextType>({
  isScanning: false,
  nearbyDevices: [],
  startScanning: async () => {},
  stopScanning: () => {},
  isBluetoothAvailable: false,
  error: null
});

export const useBluetooth = () => useContext(BluetoothContext);

interface BluetoothProviderProps {
  children: ReactNode;
}

export const BluetoothProvider = ({ children }: BluetoothProviderProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [nearbyDevices, setNearbyDevices] = useState<BluetoothDevice[]>([]);
  const [isBluetoothAvailable, setIsBluetoothAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  // Check if Web Bluetooth API is available
  useEffect(() => {
    if (navigator.bluetooth) {
      setIsBluetoothAvailable(true);
    } else {
      setError('Web Bluetooth API is not available in your browser');
    }
  }, []);

  const startScanning = async () => {
    if (!isBluetoothAvailable) {
      setError('Bluetooth is not available');
      return;
    }

    try {
      setIsScanning(true);
      setError(null);

      // Request a Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        // Accept all devices, you could filter for specific services
        acceptAllDevices: true,
        optionalServices: [] // Add service UUIDs if needed
      });

      // When device is connected, add to the list of nearby devices
      const deviceInfo: BluetoothDevice = {
        id: device.id,
        name: device.name || 'Unknown Device',
        rssi: 0, // Signal strength - would need a connected device to get actual value
        lastSeen: Date.now()
      };

      // Add device to list if not already there
      setNearbyDevices(prev => {
        const exists = prev.some(d => d.id === device.id);
        if (!exists) {
          return [...prev, deviceInfo];
        }
        return prev;
      });

      // Check if device is a Comemingel user
      if (currentUser) {
        try {
          // Query Firestore to see if any user has this bluetooth device id
          // Note: In a real app, you'd have a more secure way to identify users
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where("bluetoothDeviceIds", "array-contains", device.id));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Update device with user info
            const userData = querySnapshot.docs[0].data();
            setNearbyDevices(prev => 
              prev.map(d => 
                d.id === device.id 
                  ? { ...d, user: { id: querySnapshot.docs[0].id, ...userData } } 
                  : d
              )
            );
          }
        } catch (err) {
          console.error('Error querying for users by bluetooth ID:', err);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Failed to scan for Bluetooth devices');
      console.error('Bluetooth error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  // Mock data for development purposes when Bluetooth is not available
  useEffect(() => {
    if (!isBluetoothAvailable) {
      const mockDevices: BluetoothDevice[] = [
        {
          id: '1',
          name: 'Sofia Anderson',
          rssi: -65,
          user: {
            id: '1',
            displayName: 'Sofia Anderson',
            email: 'sofia@example.com',
            photoURL: 'https://randomuser.me/api/portraits/women/44.jpg',
            status: 'online',
            interests: ['Photography', 'Travel'],
            createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
            lastSeen: Date.now()
          },
          lastSeen: Date.now()
        },
        {
          id: '2',
          name: 'Jacob Miller',
          rssi: -70,
          user: {
            id: '2',
            displayName: 'Jacob Miller',
            email: 'jacob@example.com',
            photoURL: 'https://randomuser.me/api/portraits/men/32.jpg',
            status: 'busy',
            interests: ['Hiking', 'Coffee'],
            createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
            lastSeen: Date.now() - 20 * 60 * 1000
          },
          lastSeen: Date.now() - 10 * 1000
        },
        {
          id: '3',
          name: 'Alex Johnson',
          rssi: -58,
          user: {
            id: '3',
            displayName: 'Alex Johnson',
            email: 'alex@example.com',
            photoURL: 'https://randomuser.me/api/portraits/men/45.jpg',
            status: 'online',
            interests: ['Music', 'Running'],
            createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
            lastSeen: Date.now() - 5 * 60 * 1000
          },
          lastSeen: Date.now() - 5 * 60 * 1000
        }
      ];
      setNearbyDevices(mockDevices);
    }
  }, [isBluetoothAvailable]);

  const value = {
    isScanning,
    nearbyDevices,
    startScanning,
    stopScanning,
    isBluetoothAvailable,
    error
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
};
