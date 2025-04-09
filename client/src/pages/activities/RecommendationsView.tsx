import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcwIcon, MapIcon, CalendarIcon } from 'lucide-react';

// En supergodkjent versjon av RecommendationsView - ingen API-kall
export default function RecommendationsView() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Simuler en refresh-handler - bare viser toast
  const handleRefresh = () => {
    toast({
      title: 'Melding',
      description: 'Vi jobber med å fikse anbefalingssystemet. Prøv igjen senere.',
    });
  };
  
  // Null API-kall versjon av anbefalingssiden
  return (
    <div className="p-4 pb-20">
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
      
      <div className="text-center py-12 bg-gray-50 rounded-lg border mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Anbefalinger kommer snart</h3>
        <p className="text-gray-500 mb-4">
          Vi jobber med å forbedre anbefalingssystemet for å gi deg personlige forslag basert på dine preferanser.
        </p>
      </div>
      
      {/* Placeholder-anbefalinger */}
      <div className="grid grid-cols-1 gap-6">
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-1">Fjelltur med utsikt</h3>
          <p className="text-sm text-gray-500 mb-3">Aktivitet nær deg</p>
          <p className="text-gray-700 mb-4">
            En vakker fjelltur med fantastisk utsikt over byen og fjorden. Passer for alle nivåer.
          </p>
          <div className="flex justify-between items-center">
            <Button 
              variant="default" 
              onClick={handleRefresh}
              size="sm"
            >
              Se detaljer
            </Button>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-1">Strandrydding</h3>
          <p className="text-sm text-gray-500 mb-3">Miljøaktivitet</p>
          <p className="text-gray-700 mb-4">
            Bli med på vår ukentlige strandrydding for å gjøre en forskjell for miljøet. Utstyr blir delt ut på stedet.
          </p>
          <div className="flex justify-between items-center">
            <Button 
              variant="default" 
              onClick={handleRefresh}
              size="sm"
            >
              Se detaljer
            </Button>
          </div>
        </div>
      </div>
      
      {/* Navigasjonsknapper */}
      <div className="flex justify-center mt-8 space-x-4">
        <Button 
          onClick={() => setLocation('/map')} 
          variant="outline"
          className="w-full"
        >
          <MapIcon className="h-4 w-4 mr-2" />
          Utforsk kartet
        </Button>
        
        <Button 
          onClick={() => setLocation('/activities')} 
          variant="outline"
          className="w-full"
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          Alle aktiviteter
        </Button>
      </div>
    </div>
  );
}