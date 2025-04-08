import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChatMessageWithStatus } from '@/hooks/use-chat-websocket';
import ChatMessage from './ChatMessage';
import { Button } from '@/components/ui/button';
import { SendIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatThreadProps {
  messages: ChatMessageWithStatus[];
  onSendMessage: (content: string) => void;
  onResendMessage?: (messageId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function ChatThread({
  messages,
  onSendMessage,
  onResendMessage,
  isLoading = false,
  className
}: ChatThreadProps) {
  const [message, setMessage] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                onResend={onResendMessage}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Message input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={!message.trim() || isLoading}>
            <SendIcon size={18} />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ChatThread;