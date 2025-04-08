import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageStatusIndicator from '@/components/chat/MessageStatusIndicator';
import { formatDistanceToNow } from 'date-fns';
import { DEVELOPMENT_MODE } from '@/lib/constants';

// Message type for this simplified demo
interface SimpleMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
  senderName?: string;
}

export default function SimpleChatThread() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<SimpleMessage[]>([
    {
      id: 'welcome-1',
      content: 'Welcome to Comemingel Chat with real-time message delivery tracking!',
      senderId: 'system',
      timestamp: Date.now() - 3600000, // 1 hour ago
      status: 'delivered',
      senderName: 'Comemingel Assistant'
    },
    {
      id: 'welcome-2',
      content: 'Try sending a message to see the status indicators in action.',
      senderId: 'system',
      timestamp: Date.now() - 1800000, // 30 minutes ago
      status: 'read',
      senderName: 'Comemingel Assistant'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Send a new message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    const newMessageId = `msg-${Date.now()}`;
    
    // Add message with pending status
    const newMessage: SimpleMessage = {
      id: newMessageId,
      content: inputText,
      senderId: currentUser?.uid || 'current-user',
      timestamp: Date.now(),
      status: 'pending',
      senderName: currentUser?.displayName || 'You'
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    
    // Simulate message sent after 1 second
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessageId 
            ? { ...msg, status: 'sent' } 
            : msg
        )
      );
      
      // Simulate message delivered after 2 seconds
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessageId 
              ? { ...msg, status: 'delivered' } 
              : msg
          )
        );
        
        // Simulate message read after 3 seconds
        setTimeout(() => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === newMessageId 
                ? { ...msg, status: 'read' } 
                : msg
            )
          );
        }, 1000);
      }, 1000);
    }, 1000);
  };
  
  // Resend a failed message
  const handleResendMessage = (messageId: string) => {
    // Set status to pending
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'pending' } 
          : msg
      )
    );
    
    // Simulate message sent after 1 second
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'sent' } 
            : msg
        )
      );
      
      // Simulate delivered after another second
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, status: 'delivered' } 
              : msg
          )
        );
      }, 1000);
    }, 1000);
  };

  // Randomly fail a message (for demonstration)
  const handleSendWithRandomFail = () => {
    if (!inputText.trim()) return;
    
    const newMessageId = `msg-${Date.now()}`;
    
    // Add message with pending status
    const newMessage: SimpleMessage = {
      id: newMessageId,
      content: inputText,
      senderId: currentUser?.uid || 'current-user',
      timestamp: Date.now(),
      status: 'pending',
      senderName: currentUser?.displayName || 'You'
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    
    // 50% chance to fail for demo purposes
    if (Math.random() > 0.5) {
      // Simulate message sent
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessageId 
              ? { ...msg, status: 'sent' } 
              : msg
          )
        );
      }, 1000);
    } else {
      // Simulate message failed
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessageId 
              ? { ...msg, status: 'failed' } 
              : msg
          )
        );
      }, 1000);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <Card className="flex flex-col h-full border-0">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src="/assets/avatar.png" />
              <AvatarFallback>CM</AvatarFallback>
            </Avatar>
            <CardTitle>Enhanced Chat Demo</CardTitle>
          </div>
          <div className="text-xs text-muted-foreground">
            Demonstrating real-time message status tracking
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow p-0 relative">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="flex flex-col p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.senderId === (currentUser?.uid || 'current-user') ? 'justify-end' : 'justify-start'} gap-2 max-w-full`}
                >
                  {/* Avatar for other people's messages */}
                  {msg.senderId !== (currentUser?.uid || 'current-user') && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${msg.senderId}`} />
                      <AvatarFallback>{msg.senderName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                  
                  {/* Message bubble */}
                  <div className={`px-3 py-2 rounded-lg max-w-[80%] ${
                    msg.senderId === (currentUser?.uid || 'current-user')
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    {/* Sender name for others' messages */}
                    {msg.senderId !== (currentUser?.uid || 'current-user') && msg.senderName && (
                      <div className="text-xs font-medium mb-1">{msg.senderName}</div>
                    )}
                    
                    {/* Message content */}
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                    
                    {/* Failed message with retry button */}
                    {msg.status === 'failed' && (
                      <div className="flex items-center mt-1 text-destructive text-xs gap-1">
                        <span>Failed to send</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 py-1 text-xs"
                          onClick={() => handleResendMessage(msg.id)}
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                    
                    {/* Message info footer */}
                    <div className="flex justify-end items-center mt-1 text-xs gap-1">
                      <span className="text-[10px] opacity-70">
                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                      </span>
                      
                      {/* Status indicator for your own messages */}
                      {msg.senderId === (currentUser?.uid || 'current-user') && (
                        <MessageStatusIndicator status={msg.status} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="border-t p-4">
          <div className="flex w-full gap-2">
            <Textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[80px] flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="flex flex-col gap-2">
              <Button onClick={handleSendMessage}>
                Send
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSendWithRandomFail}
                title="Demo: Has 50% chance to fail"
              >
                Test Fail
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}