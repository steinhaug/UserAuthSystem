import React from 'react';
import { format } from 'date-fns';
import { ReputationEvent, ReputationEventType } from '@shared/schema';
import { 
  ArrowUp, 
  ArrowDown, 
  ChevronDown, 
  Check, 
  X, 
  Activity,
  BellRing,
  User,
  Calendar,
  Handshake,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ReputationHistoryProps {
  events: ReputationEvent[];
  eventTypes: ReputationEventType[];
  className?: string;
  maxEvents?: number;
}

export function ReputationHistory({ 
  events, 
  eventTypes,
  className,
  maxEvents = 10
}: ReputationHistoryProps) {
  const sortedEvents = [...events]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxEvents);

  // Get event type details
  const getEventType = (eventTypeId: number) => {
    return eventTypes.find(type => type.id === eventTypeId);
  };

  // Get icon based on event category
  const getEventIcon = (eventType: ReputationEventType | undefined) => {
    if (!eventType) return <Activity className="h-4 w-4" />;
    
    switch (eventType.category) {
      case 'activity':
        return <Calendar className="h-4 w-4" />;
      case 'reliability':
        return <Check className="h-4 w-4" />;
      case 'safety':
        return <ShieldCheck className="h-4 w-4" />;
      case 'community':
        return <Handshake className="h-4 w-4" />;
      case 'verification':
        return <BellRing className="h-4 w-4" />;
      case 'rating':
        return <User className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Determine if the event had a positive or negative impact
  const getImpactType = (value: number) => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  // Get impact icon and class
  const getImpactIcon = (value: number) => {
    const type = getImpactType(value);
    
    if (type === 'positive') {
      return <ArrowUp className="h-3 w-3 text-green-500" />;
    } else if (type === 'negative') {
      return <ArrowDown className="h-3 w-3 text-red-500" />;
    }
    
    return null;
  };

  const getImpactClass = (value: number) => {
    const type = getImpactType(value);
    
    if (type === 'positive') {
      return 'text-green-500';
    } else if (type === 'negative') {
      return 'text-red-500';
    }
    
    return 'text-muted-foreground';
  };

  // Event details display
  const renderEventDetails = (event: ReputationEvent) => {
    // Get the details as any because it could have different shapes
    const details = event.details as any;
    
    if (!details) return null;
    
    return (
      <div className="text-xs text-muted-foreground mt-2 space-y-1">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="font-medium">{key}:</span>
            <span>{String(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (events.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg">Omdømmehistorikk</CardTitle>
          <CardDescription>
            Ingen omdømmeaktivitet ennå
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8 text-muted-foreground">
            <p>Ingen omdømmehistorikk tilgjengelig</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Omdømmehistorikk</CardTitle>
        <CardDescription>
          De siste {Math.min(maxEvents, events.length)} omdømmeaktivitetene
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <Accordion type="single" collapsible className="w-full">
          {sortedEvents.map((event, index) => {
            const eventType = getEventType(event.eventTypeId);
            return (
              <AccordionItem value={`event-${event.id}`} key={event.id} className="border-b">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-1.5 rounded-full",
                        event.value > 0 ? "bg-green-100" : 
                        event.value < 0 ? "bg-red-100" : "bg-gray-100"
                      )}>
                        {getEventIcon(eventType)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{eventType?.name || 'Ukjent hendelse'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.createdAt), 'dd.MM.yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={event.value > 0 ? 'default' : event.value < 0 ? 'destructive' : 'outline'}
                        className="ml-auto"
                      >
                        <span className="flex items-center">
                          {getImpactIcon(event.value)}
                          <span className={cn("ml-1", getImpactClass(event.value))}>
                            {event.value > 0 ? '+' : ''}{event.value}
                          </span>
                        </span>
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <p className="text-sm">{eventType?.description || 'Ingen beskrivelse tilgjengelig'}</p>
                  {event.details && renderEventDetails(event)}
                  {event.referenceId && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Referanse: </span>
                      <span>{event.referenceType} #{event.referenceId}</span>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}