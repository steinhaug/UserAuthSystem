import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  LogOut, 
  Edit, 
  MapPin,
  Clock,
  Tag
} from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, logoutUser, updateUserProfile } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function ProfileView() {
  const [, setLocation] = useLocation();
  const { currentUser, userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string>('');
  const [status, setStatus] = useState<'online' | 'busy' | 'offline'>('online');
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUser) {
      setLocation('/');
      return;
    }

    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setInterests(userProfile.interests?.join(', ') || '');
      setStatus(userProfile.status || 'online');
      setIsLoading(false);
    }
  }, [currentUser, userProfile, setLocation]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      setLocation('/');
    } catch (error: any) {
      toast({
        title: 'Error logging out',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    
    try {
      // Update display name in Firebase Auth
      await updateUserProfile(displayName);
      
      // Update profile in Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      
      await updateDoc(userRef, {
        displayName,
        interests: interests.split(',').map(interest => interest.trim()).filter(Boolean),
        status
      });
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
      
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex-1 flex items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <div className="p-4">
        <h1 className="text-2xl font-bold font-heading mb-4">Profile</h1>
        
        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <Avatar className="w-24 h-24 mb-4">
                {userProfile?.photoURL ? (
                  <AvatarImage src={userProfile.photoURL} alt={userProfile.displayName} />
                ) : (
                  <AvatarFallback className="text-2xl">{userProfile?.displayName.charAt(0) || 'U'}</AvatarFallback>
                )}
              </Avatar>
              
              {isEditing ? (
                <div className="w-full max-w-xs">
                  <div className="mb-4">
                    <Label htmlFor="displayName">Name</Label>
                    <Input 
                      id="displayName" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)} 
                      className="mt-1" 
                    />
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="interests">Interests (comma separated)</Label>
                    <Input 
                      id="interests" 
                      value={interests} 
                      onChange={(e) => setInterests(e.target.value)} 
                      className="mt-1" 
                    />
                  </div>
                  
                  <div className="mb-4">
                    <Label>Status</Label>
                    <div className="flex mt-1 space-x-4">
                      <Button 
                        onClick={() => setStatus('online')} 
                        variant={status === 'online' ? 'default' : 'outline'}
                        size="sm"
                        className={status === 'online' ? 'bg-gradient-to-r from-[#FF5252] to-[#FF1744]' : ''}
                      >
                        Online
                      </Button>
                      <Button 
                        onClick={() => setStatus('busy')} 
                        variant={status === 'busy' ? 'default' : 'outline'}
                        size="sm"
                        className={status === 'busy' ? 'bg-gradient-to-r from-[#FF5252] to-[#FF1744]' : ''}
                      >
                        Busy
                      </Button>
                      <Button 
                        onClick={() => setStatus('offline')} 
                        variant={status === 'offline' ? 'default' : 'outline'}
                        size="sm"
                        className={status === 'offline' ? 'bg-gradient-to-r from-[#FF5252] to-[#FF1744]' : ''}
                      >
                        Offline
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-6">
                    <Button 
                      onClick={() => setIsEditing(false)} 
                      variant="outline" 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveProfile} 
                      className="flex-1 bg-gradient-to-r from-[#FF5252] to-[#FF1744]"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold">{userProfile?.displayName}</h2>
                  <p className="text-gray-500 mt-1">{userProfile?.email}</p>
                  
                  <div className="flex items-center mt-2">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      status === 'online' ? 'bg-green-500' : 
                      status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></span>
                    <span className="text-gray-700 capitalize">{status}</span>
                  </div>
                  
                  {userProfile?.interests && userProfile.interests.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {userProfile.interests.map((interest, index) => (
                        <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    variant="outline" 
                    className="mt-6"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Settings
          </h2>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-600 mr-3" />
                <div>
                  <h3 className="font-medium">Location Sharing</h3>
                  <p className="text-gray-500 text-sm">Allow others to see your location</p>
                </div>
              </div>
              <Switch 
                checked={locationEnabled} 
                onCheckedChange={setLocationEnabled} 
              />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-600 mr-3" />
                <div>
                  <h3 className="font-medium">Notifications</h3>
                  <p className="text-gray-500 text-sm">Push notifications for new messages and activities</p>
                </div>
              </div>
              <Switch 
                checked={notificationsEnabled} 
                onCheckedChange={setNotificationsEnabled} 
              />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-gray-600 mr-3" />
              <div className="flex-1">
                <h3 className="font-medium">Privacy & Security</h3>
                <p className="text-gray-500 text-sm">Manage privacy settings and security options</p>
              </div>
              <Button variant="ghost" size="sm">
                Manage
              </Button>
            </div>
          </div>
        </div>
        
        {/* Logout Button */}
        <Button 
          onClick={handleLogout} 
          variant="outline" 
          className="w-full mt-8 text-red-600 border-red-200 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
