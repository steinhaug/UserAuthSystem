import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useBluetooth } from '@/contexts/BluetothContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Bluetooth } from 'lucide-react';
import { addDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { db, chatThreadsCollection, chatMessagesCollection } from '@/lib/firebase';

export default function NearbyView() {
  const [, setLocation] = useLocation();
  const { isBluetoothAvailable, startScanning, nearbyDevices, error } = useBluetooth();
  const { currentUser } = useAuth();
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setLocation('/');
    }
  }, [currentUser, setLocation]);

  // Initiate a chat with a nearby user
  const initiateChat = async (nearbyUserId: string) => {
    if (!currentUser) return;
    
    setConnecting(nearbyUserId);
    
    try {
      // Check if a thread already exists
      const threadQuery = query(
        chatThreadsCollection,
        where('participants', 'array-contains', currentUser.uid),
        where('isBluetoothChat', '==', true)
      );
      
      const querySnapshot = await getDocs(threadQuery);
      let threadId: string;
      
      // Find the thread with the nearby user
      const existingThread = querySnapshot.docs.find(doc => {
        const threadData = doc.data();
        return threadData.participants.includes(nearbyUserId);
      });
      
      if (existingThread) {
        // Use existing thread
        threadId = existingThread.id;
      } else {
        // Create new thread
        const newThreadRef = await addDoc(chatThreadsCollection, {
          participants: [currentUser.uid, nearbyUserId],
          isBluetoothChat: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        
        threadId = newThreadRef.id;
        
        // Add system message
        await addDoc(chatMessagesCollection, {
          threadId,
          senderId: 'system',
          content: 'You connected via Bluetooth',
          type: 'system',
          read: true,
          createdAt: Date.now()
        });
      }
      
      // Navigate to the chat
      setLocation(`/chat/${threadId}`);
      
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setConnecting(null);
    }
  };

  // Request to scan for Bluetooth devices
  const handleScanForDevices = () => {
    startScanning();
  };

  if (!isBluetoothAvailable) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold font-heading mb-4">Nearby</h1>
        
        <div className="bg-yellow-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-yellow-800">Bluetooth is not available</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Your browser doesn't support the Web Bluetooth API. Try using Chrome or Edge for the full experience.
          </p>
        </div>
        
        {/* Show mock data for testing */}
        <div className="space-y-3">
          {nearbyDevices.map((device) => (
            <div key={device.id} className="bg-white rounded-lg shadow-md p-4 flex items-center">
              <Avatar className="w-14 h-14 mr-4">
                {device.user?.photoURL ? (
                  <AvatarImage src={device.user.photoURL} alt={device.user?.displayName || device.name} />
                ) : (
                  <AvatarFallback>{(device.user?.displayName || device.name).charAt(0)}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="font-medium">{device.user?.displayName || device.name}</h3>
                  <span className={`ml-2 inline-block w-2 h-2 rounded-full ${
                    device.user?.status === 'online' ? 'bg-green-500' : 
                    device.user?.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></span>
                </div>
                <p className="text-gray-500 text-sm">
                  {device.user?.interests?.join(', ') || 'No interests shared'}
                </p>
              </div>
              <Button 
                onClick={() => device.user && initiateChat(device.user.id)} 
                className="bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white py-2 px-4 rounded-full text-sm"
                disabled={connecting === device.user?.id}
              >
                {connecting === device.user?.id ? 'Connecting...' : 'Say Hi'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold font-heading mb-4">Nearby</h1>
      
      {/* Bluetooth Status */}
      <div className="bg-blue-50 rounded-lg p-4 flex items-center mb-6">
        <div className="rounded-full bg-blue-100 p-2 mr-3">
          <Bluetooth className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <h3 className="font-medium">Bluetooth is active</h3>
          <p className="text-sm text-gray-600">Scanning for people nearby...</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}
      
      {/* Scan button */}
      <Button 
        onClick={handleScanForDevices} 
        className="bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white py-2 px-4 rounded-lg text-sm w-full mb-6"
      >
        Scan for Nearby Devices
      </Button>
      
      {/* People Nearby List */}
      <div className="space-y-3">
        {nearbyDevices.length > 0 ? (
          nearbyDevices.map((device) => (
            <div key={device.id} className="bg-white rounded-lg shadow-md p-4 flex items-center">
              <Avatar className="w-14 h-14 mr-4">
                {device.user?.photoURL ? (
                  <AvatarImage src={device.user.photoURL} alt={device.user?.displayName || device.name} />
                ) : (
                  <AvatarFallback>{(device.user?.displayName || device.name).charAt(0)}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="font-medium">{device.user?.displayName || device.name}</h3>
                  <span className={`ml-2 inline-block w-2 h-2 rounded-full ${
                    device.user?.status === 'online' ? 'bg-green-500' : 
                    device.user?.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></span>
                </div>
                <p className="text-gray-500 text-sm">
                  {device.user?.interests?.join(', ') || 'No interests shared'}
                </p>
              </div>
              <Button 
                onClick={() => device.user && initiateChat(device.user.id)} 
                className="bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white py-2 px-4 rounded-full text-sm"
                disabled={connecting === device.user?.id}
              >
                {connecting === device.user?.id ? 'Connecting...' : 'Say Hi'}
              </Button>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No devices found nearby. Try scanning again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
