import React from 'react';
import {
  CheckIcon,
  CheckCheckIcon,
  EyeIcon,
  LoaderIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MessageStatus = 'sent' | 'delivered' | 'read' | 'pending' | 'failed';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  className?: string;
}

export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status,
  className,
}) => {
  return (
    <span 
      className={cn(
        "inline-flex items-center text-xs ml-1", 
        status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
        className
      )}
    >
      {status === 'sent' && (
        <span className="flex items-center">
          <CheckIcon size={12} className="mr-0.5" />
          <span className="sr-only md:not-sr-only md:inline text-[10px]">Sent</span>
        </span>
      )}
      
      {status === 'delivered' && (
        <span className="flex items-center">
          <CheckCheckIcon size={12} className="mr-0.5" />
          <span className="sr-only md:not-sr-only md:inline text-[10px]">Delivered</span>
        </span>
      )}
      
      {status === 'read' && (
        <span className="flex items-center text-primary/70">
          <EyeIcon size={12} className="mr-0.5" />
          <span className="sr-only md:not-sr-only md:inline text-[10px]">Read</span>
        </span>
      )}
      
      {status === 'pending' && (
        <span className="flex items-center animate-pulse">
          <LoaderIcon size={12} className="mr-0.5 animate-spin" />
          <span className="sr-only md:not-sr-only md:inline text-[10px]">Sending</span>
        </span>
      )}
      
      {status === 'failed' && (
        <span className="flex items-center">
          <AlertCircleIcon size={12} className="mr-0.5" />
          <span className="sr-only md:not-sr-only md:inline text-[10px]">Failed</span>
        </span>
      )}
    </span>
  );
};

export default MessageStatusIndicator;