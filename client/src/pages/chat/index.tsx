import React, { useEffect } from 'react';
import { useChatWebSocket } from '@/hooks/use-chat-websocket';
import { useAuth } from '@/contexts/AuthContext';
import ChatThread from '@/components/chat/ChatThread';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightIcon, WifiIcon, WifiOffIcon } from 'lucide-react';

export default function EnhancedChatView() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { 
    messages, 
    sendMessage, 
    resendMessage, 
    isConnected, 
    pendingMessages 
  } = useChatWebSocket();

  // Get the first (or only) thread for demonstration
  const threadId = Object.keys(messages)[0] || 'demo-thread';
  const threadMessages = messages[threadId] || [];
  
  // Notify when a message fails to send
  useEffect(() => {
    const failedMessages = threadMessages.filter(msg => msg.status === 'failed');
    if (failedMessages.length > 0) {
      toast({
        title: 'Message failed to send',
        description: 'Check your connection and try again',
        variant: 'destructive',
      });
    }
  }, [threadMessages, toast]);
  
  // Notify when websocket disconnects
  useEffect(() => {
    if (!isConnected) {
      toast({
        title: 'Disconnected',
        description: 'You are currently offline',
        variant: 'destructive',
      });
    }
  }, [isConnected, toast]);
  
  // Default recipient for demo
  const recipientId = 'demo-user';
  
  // Handler for sending a new message
  const handleSendMessage = (content: string) => {
    sendMessage(threadId, recipientId, content);
  };
  
  // Handler for resending a failed message
  const handleResendMessage = (messageId: string) => {
    const failedMessage = threadMessages.find(msg => msg.id === messageId);
    if (failedMessage) {
      resendMessage(
        messageId,
        threadId,
        recipientId,
        failedMessage.content
      );
    }
  };
  
  return (
    <div className="container py-6 max-w-4xl mx-auto h-[calc(100vh-100px)]">
      <Card className="h-full">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Chat</CardTitle>
            <div className="flex gap-2 items-center text-sm">
              <span className="text-muted-foreground">
                {isConnected ? (
                  <div className="flex items-center gap-1">
                    <WifiIcon size={16} className="text-green-500" />
                    <span>Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <WifiOffIcon size={16} className="text-red-500" />
                    <span>Disconnected</span>
                  </div>
                )}
              </span>
            </div>
          </div>
          {pendingMessages.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {pendingMessages.length} message(s) pending delivery
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-70px)]">
          <ChatThread
            messages={threadMessages}
            onSendMessage={handleSendMessage}
            onResendMessage={handleResendMessage}
            isLoading={!isConnected}
          />
        </CardContent>
      </Card>
    </div>
  );
}