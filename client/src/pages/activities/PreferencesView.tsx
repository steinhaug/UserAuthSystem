import React from "react";
import { ActivityPreferencesForm } from "@/components/activities/ActivityPreferencesForm";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react";

export default function PreferencesView() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const handlePreferencesUpdated = () => {
    toast({
      title: "Preferanser oppdatert",
      description: "Dine aktivitetspreferanser har blitt lagret og nye anbefalinger vil bli generert basert på disse.",
    });
    
    // Redirect to recommendations page after a short delay
    setTimeout(() => {
      setLocation('/activities/recommendations');
    }, 1500);
  };
  
  return (
    <div className="p-4 pb-20">
      <div className="flex items-center mb-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/activities/recommendations')}
          className="mr-2"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Tilbake
        </Button>
        <h1 className="text-2xl font-bold">Dine aktivitetspreferanser</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Hvorfor sette preferanser?</CardTitle>
          <CardDescription>
            Ved å sette dine aktivitetspreferanser hjelper du oss å finne de beste aktivitetene for deg.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Jo mer informasjon du deler om dine preferanser, desto bedre kan vi tilpasse anbefalingene våre. 
            Oppgi dine foretrukne:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-500 mb-4 space-y-1">
            <li>Aktivitetskategorier</li>
            <li>Dager i uken</li>
            <li>Tidspunkter på dagen</li>
            <li>Hvor langt du er villig til å reise</li>
          </ul>
        </CardContent>
      </Card>
      
      <ActivityPreferencesForm onSuccess={handlePreferencesUpdated} />
      
      <div className="mt-6 text-center">
        <Button 
          variant="outline"
          onClick={() => setLocation('/activities/recommendations')}
          className="mx-auto"
        >
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Gå til anbefalinger
        </Button>
      </div>
    </div>
  );
}