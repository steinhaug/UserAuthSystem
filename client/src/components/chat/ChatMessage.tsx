import React from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessageWithStatus } from '@/hooks/use-chat-websocket';
import MessageStatusIndicator from './MessageStatusIndicator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessageProps {
  message: ChatMessageWithStatus;
  onResend?: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message,
  onResend
}) => {
  const { currentUser } = useAuth();
  
  // Determine if this message is from the current user
  const isSentByCurrentUser = message.senderId === currentUser?.uid || message.senderId === 'current-user';
  
  // Format timestamp
  const formattedTime = formatDistanceToNow(new Date(message.timestamp), {
    addSuffix: true,
    includeSeconds: true
  });
  
  return (
    <div className={cn(
      "flex items-start gap-2 mb-4",
      isSentByCurrentUser ? "justify-end" : "justify-start"
    )}>
      {/* Avatar for messages from others */}
      {!isSentByCurrentUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={`https://avatar.vercel.sh/${message.senderId}`} />
          <AvatarFallback>
            {message.senderName?.charAt(0) || message.senderId.charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Message bubble */}
      <div className={cn(
        "max-w-[80%] px-3 py-2 rounded-lg",
        isSentByCurrentUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        {/* Sender name for messages from others */}
        {!isSentByCurrentUser && message.senderName && (
          <div className="text-xs font-medium mb-1">
            {message.senderName}
          </div>
        )}
        
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        {/* Failed message indicator */}
        {message.status === 'failed' && (
          <div className="flex items-center gap-1 mt-1 text-destructive text-xs">
            <AlertTriangleIcon size={12} />
            <span>Failed to send</span>
            {onResend && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs" 
                onClick={() => onResend(message.id)}
              >
                <RefreshCwIcon size={12} className="mr-1" />
                Retry
              </Button>
            )}
          </div>
        )}
        
        {/* Message timestamp and status */}
        <div className="flex justify-end items-center mt-1 gap-1">
          <span className="text-[10px] opacity-70">
            {formattedTime}
          </span>
          
          {/* Status indicator for sent messages */}
          {isSentByCurrentUser && message.status && (
            <MessageStatusIndicator status={message.status} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;