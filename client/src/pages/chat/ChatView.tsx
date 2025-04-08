import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { DEVELOPMENT_MODE } from '@/lib/constants';
import EnhancedChatView from './index';
import SimpleChatThread from './SimpleChatThread';

export default function ChatView() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("conversations");
  const { toast } = useToast();

  // Redirect if not authenticated
  if (!currentUser && !DEVELOPMENT_MODE) {
    setLocation('/');
    return null;
  }
  
  return (
    <div className="h-full">
      <Tabs 
        defaultValue="conversations" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="h-full"
      >
        <div className="border-b px-4">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="enhanced">Enhanced Chat</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent 
          value="conversations" 
          className="h-full overflow-auto"
        >
          <div className="p-4">
            <p className="text-muted-foreground">
              This is the legacy chat view with multiple threads.
            </p>
            <p className="text-sm mt-4">
              Try the "Enhanced Chat" tab to see the improved message delivery tracking features.
            </p>
          </div>
        </TabsContent>

        <TabsContent 
          value="enhanced" 
          className="h-full"
        >
          <SimpleChatThread />
        </TabsContent>
      </Tabs>
    </div>
  );
}
