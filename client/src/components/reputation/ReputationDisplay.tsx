import React from 'react';
import { User, UserReputation } from '@shared/schema';
import { 
  Shield, 
  ShieldCheck, 
  Shield as ShieldAlert, 
  Award, 
  Clock, 
  Users, 
  Zap,
  BadgeCheck
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ReputationDisplayProps {
  reputation: UserReputation;
  user?: User;
  showDetails?: boolean;
  className?: string;
}

export function ReputationDisplay({ 
  reputation, 
  user, 
  showDetails = false,
  className
}: ReputationDisplayProps) {
  // Function to get the color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-emerald-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  // Function to get the badge variant based on score
  const getBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    if (score >= 40) return 'outline';
    if (score >= 20) return 'destructive';
    return 'destructive';
  };

  // Function to get progress color
  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-emerald-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Function to get verification badge
  const getVerificationBadge = () => {
    if (reputation.isVerified) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="ml-2 bg-blue-50">
                <BadgeCheck className="h-3.5 w-3.5 text-blue-500 mr-1" />
                <span className="text-xs">Verifisert</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Denne brukeren er verifisert (Nivå {reputation.verificationLevel})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  };

  // For compact display (used in cards, lists)
  if (!showDetails) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center">
                <Shield className={cn("h-4 w-4 mr-1", getScoreColor(reputation.overallScore))} />
                <span className={cn("text-sm font-medium", getScoreColor(reputation.overallScore))}>
                  {Math.round(reputation.overallScore)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs">
                <p>Omdømmepoeng: {Math.round(reputation.overallScore)}/100</p>
                <p>Pålitelighet: {Math.round(reputation.reliabilityScore)}/100</p>
                <p>Trygghet: {Math.round(reputation.safetyScore)}/100</p>
                <p>Fellesskap: {Math.round(reputation.communityScore)}/100</p>
                <p>Aktiviteter: {reputation.activityCount}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {reputation.isVerified && (
          <BadgeCheck className="h-4 w-4 text-blue-500" />
        )}
      </div>
    );
  }

  // For detailed display (profile page)
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              Omdømme
              {getVerificationBadge()}
            </CardTitle>
            <CardDescription>Omdømmepoeng basert på aktiviteter og vurderinger</CardDescription>
          </div>
          <div className="flex items-center bg-secondary p-2 rounded-md">
            <Shield className={cn("h-5 w-5 mr-1", getScoreColor(reputation.overallScore))} />
            <span className={cn("text-xl font-bold", getScoreColor(reputation.overallScore))}>
              {Math.round(reputation.overallScore)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Pålitelighet</span>
            </div>
            <Badge variant={getBadgeVariant(reputation.reliabilityScore)}>
              {Math.round(reputation.reliabilityScore)}
            </Badge>
          </div>
          <Progress 
            value={reputation.reliabilityScore} 
            max={100} 
            className="h-2" 
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <ShieldCheck className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Trygghet</span>
            </div>
            <Badge variant={getBadgeVariant(reputation.safetyScore)}>
              {Math.round(reputation.safetyScore)}
            </Badge>
          </div>
          <Progress 
            value={reputation.safetyScore} 
            max={100} 
            className="h-2" 
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Fellesskap</span>
            </div>
            <Badge variant={getBadgeVariant(reputation.communityScore)}>
              {Math.round(reputation.communityScore)}
            </Badge>
          </div>
          <Progress 
            value={reputation.communityScore} 
            max={100} 
            className="h-2" 
          />
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex w-full justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Award className="h-4 w-4 mr-1" />
            <span>{reputation.activityCount} aktiviteter</span>
          </div>
          <div className="flex items-center">
            <Zap className="h-4 w-4 mr-1" />
            <span>Nivå {reputation.verificationLevel}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}