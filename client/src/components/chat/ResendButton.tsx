import React from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ResendButtonProps {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export function ResendButton({ onClick, className, disabled = false }: ResendButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className={className}
            onClick={onClick}
            disabled={disabled}
            aria-label="Resend message"
            title="Resend message"
          >
            <RefreshCwIcon size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Resend message</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ResendButtonWithStatusProps {
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
  onResend: () => void;
  className?: string;
}

export function ResendButtonWithStatus({ 
  status, 
  onResend, 
  className 
}: ResendButtonWithStatusProps) {
  // Only show the resend button if the message failed to send
  if (status !== 'failed') {
    return null;
  }
  
  return (
    <ResendButton 
      onClick={onResend} 
      className={className} 
    />
  );
}