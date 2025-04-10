import React, { useState } from 'react';
import { User, InsertUserRating } from '@shared/schema';
import { Star, MessageSquare, UserCheck, CheckCircle2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface UserRatingProps {
  currentUser: User;
  userToRate: User;
  context: 'activity' | 'chat' | 'bluetooth_encounter';
  referenceId?: string;
  onSubmitRating?: (rating: Omit<InsertUserRating, 'giverId'>) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function UserRating({ 
  currentUser, 
  userToRate, 
  context, 
  referenceId,
  onSubmitRating,
  onCancel,
  className 
}: UserRatingProps) {
  const { toast } = useToast();
  const [score, setScore] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingSubmit = async () => {
    if (!onSubmitRating) return;
    
    if (score === 0) {
      toast({
        title: 'Velg en vurdering',
        description: 'Du må velge et antall stjerner før du sender inn.',
        variant: 'destructive',
      });
      return;
    }
    
    const ratingData: Omit<InsertUserRating, 'giverId'> = {
      receiverId: userToRate.firebaseId,
      score,
      comment: comment.trim() || undefined,
      context,
      referenceId: referenceId || undefined,
      isAnonymous
    };
    
    try {
      setIsSubmitting(true);
      await onSubmitRating(ratingData);
      
      toast({
        title: 'Vurdering sendt',
        description: `Din vurdering av ${userToRate.displayName} er sendt.`,
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: 'Kunne ikke sende vurdering',
        description: 'Det oppstod en feil ved sending av vurdering.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContextIcon = () => {
    switch (context) {
      case 'activity':
        return <CheckCircle2 className="h-4 w-4 mr-1" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 mr-1" />;
      case 'bluetooth_encounter':
        return <Shield className="h-4 w-4 mr-1" />;
      default:
        return <UserCheck className="h-4 w-4 mr-1" />;
    }
  };

  const getContextLabel = () => {
    switch (context) {
      case 'activity':
        return 'aktivitet';
      case 'chat':
        return 'samtale';
      case 'bluetooth_encounter':
        return 'møte';
      default:
        return 'interaksjon';
    }
  };

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Vurder {userToRate.displayName}</CardTitle>
        <CardDescription className="flex items-center">
          {getContextIcon()}
          <span>Basert på din {getContextLabel()}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src={userToRate.photoURL || undefined} alt={userToRate.displayName} />
              <AvatarFallback>{userToRate.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{userToRate.displayName}</p>
              <p className="text-xs text-muted-foreground">@{userToRate.username}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="rating">Din vurdering</Label>
            <span className="text-sm text-muted-foreground">
              {score > 0 ? `${score} ${score === 1 ? 'stjerne' : 'stjerner'}` : 'Ikke valgt'}
            </span>
          </div>
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setScore(rating)}
                className="focus:outline-none"
                aria-label={`Rate ${rating} stars`}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-all",
                    score >= rating 
                      ? "fill-yellow-400 text-yellow-400" 
                      : "text-gray-300 hover:fill-yellow-200 hover:text-yellow-200"
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="comment">Kommentar (valgfritt)</Label>
          <Textarea
            id="comment"
            placeholder="Legg til en kommentar om din opplevelse..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="anonymousRating" 
            checked={isAnonymous} 
            onCheckedChange={(checked) => setIsAnonymous(checked === true)}
          />
          <Label 
            htmlFor="anonymousRating" 
            className="text-sm cursor-pointer"
          >
            Send vurdering anonymt
          </Label>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Avbryt
        </Button>
        <Button onClick={handleRatingSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Sender...' : 'Send vurdering'}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface UserRatingDisplayProps {
  averageRating?: number;
  ratingCount?: number;
  showCount?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function UserRatingDisplay({ 
  averageRating = 0, 
  ratingCount = 0,
  showCount = true,
  className,
  size = 'md'
}: UserRatingDisplayProps) {
  const starSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const fontSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Star
            key={rating}
            className={cn(
              starSizes[size],
              "transition-colors",
              averageRating >= rating - 0.5
                ? "fill-yellow-400 text-yellow-400"
                : averageRating >= rating - 0.9
                ? "fill-yellow-400/50 text-yellow-400/50"
                : "text-gray-300"
            )}
          />
        ))}
      </div>
      {showCount && ratingCount > 0 && (
        <span className={cn("ml-2 text-muted-foreground", fontSizes[size])}>
          ({ratingCount})
        </span>
      )}
    </div>
  );
}