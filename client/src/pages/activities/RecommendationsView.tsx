import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcwIcon } from 'lucide-react';

// En forenklet versjon av RecommendationsView
export default function RecommendationsView() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Simuler en refresh-handler
  const handleRefresh = () => {
    toast({
      title: 'Refresh forsøkt',
      description: 'Vi jobber med å fikse anbefalinger. Dette er en midlertidig enkel visning.',
    });
  };
  
  // Forenklet visning mens vi fikser problemer med komponenten
  return (
    <div className="p-4 pb-16">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Anbefalinger for deg</h1>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
        >
          <RefreshCcwIcon className="h-4 w-4 mr-2" />
          Oppdater
        </Button>
      </div>
      
      <div className="text-center py-12 bg-gray-50 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Anbefalinger kommer snart</h3>
        <p className="text-gray-500 mb-4">
          Vi jobber med å forbedre anbefalingssystemet for å gi deg personlige forslag basert på dine preferanser.
        </p>
        <Button 
          onClick={() => setLocation('/map')} 
          variant="default"
          className="mr-2"
        >
          Gå til kart
        </Button>
        
        <Button 
          onClick={() => setLocation('/activities')} 
          variant="outline"
        >
          Se aktiviteter
        </Button>
      </div>
    </div>
  );
}