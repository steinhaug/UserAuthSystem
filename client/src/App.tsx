import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Auth from "@/pages/auth/Auth";
import AppLayout from "@/components/layout/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { BluetoothProvider } from "@/contexts/BluetothContext";
import { LocationProvider } from "@/contexts/LocationContext";
import MapView from "@/pages/map/MapView";
import NearbyView from "@/pages/nearby/NearbyView";
import ActivitiesView from "@/pages/activities/ActivitiesView";
import CreateActivity from "@/pages/activities/CreateActivity";
import ChatView from "@/pages/chat/ChatView";
import FriendsView from "@/pages/friends/FriendsView";
import ChallengesView from "@/pages/challenges/ChallengesView";
import ProfileView from "@/pages/profile/ProfileView";
import ChatConversation from "@/pages/chat/ChatConversation";

function App() {
  return (
    <AuthProvider>
      <BluetoothProvider>
        <LocationProvider>
          <Switch>
            {/* Auth routes */}
            <Route path="/" component={Auth} />
            <Route path="/login" component={Auth} />
            <Route path="/auth" component={Auth} />
            
            {/* App routes - all wrapped in AppLayout for navigation */}
            <Route path="/map">
              {() => (
                <AppLayout>
                  <MapView />
                </AppLayout>
              )}
            </Route>
            
            <Route path="/nearby">
              {() => (
                <AppLayout>
                  <NearbyView />
                </AppLayout>
              )}
            </Route>
            
            <Route path="/activities">
              {() => (
                <AppLayout>
                  <ActivitiesView />
                </AppLayout>
              )}
            </Route>
            
            <Route path="/activities/create">
              {() => (
                <AppLayout>
                  <CreateActivity />
                </AppLayout>
              )}
            </Route>
            
            <Route path="/chat">
              {() => (
                <AppLayout>
                  <ChatView />
                </AppLayout>
              )}
            </Route>
            
            <Route path="/chat/:id">
              {(params) => (
                <AppLayout>
                  <ChatConversation id={params.id} />
                </AppLayout>
              )}
            </Route>
            
            <Route path="/friends">
              {() => (
                <AppLayout>
                  <FriendsView />
                </AppLayout>
              )}
            </Route>
            
            <Route path="/challenges">
              {() => (
                <AppLayout>
                  <ChallengesView />
                </AppLayout>
              )}
            </Route>
            
            <Route path="/profile">
              {() => (
                <AppLayout>
                  <ProfileView />
                </AppLayout>
              )}
            </Route>
            
            {/* Fallback to 404 */}
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </LocationProvider>
      </BluetoothProvider>
    </AuthProvider>
  );
}

export default App;
