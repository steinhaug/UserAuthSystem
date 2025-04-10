import { useState } from 'react';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchHistory } from '@/components/search/SearchHistory';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';
import { PersonalizedSearchSuggestions } from '@/components/search/PersonalizedSearchSuggestions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, History, Brain, Info } from 'lucide-react';

export default function SearchPage() {
  const [currentSearch, setCurrentSearch] = useState('');
  const [activeTab, setActiveTab] = useState('personalized');
  
  const handleSearch = (query: string) => {
    setCurrentSearch(query);
    
    // In a real application, you would:
    // 1. Navigate to search results page
    // 2. Filter data based on the query
    // 3. Update the UI accordingly
    
    console.log("Searching for:", query);
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">ComeMingel Søk</h1>
      
      <div className="flex justify-center mb-10">
        <SearchBar
          placeholder="Søk etter aktiviteter, interesser eller personer..."
          onSearch={handleSearch}
          className="w-full max-w-2xl"
        />
      </div>
      
      {currentSearch && (
        <div className="mb-8 text-center">
          <h2 className="text-xl font-semibold">Søkeresultater for: "{currentSearch}"</h2>
          <p className="text-gray-500 mt-2">
            Her ville søkeresultatene vises i en faktisk implementasjon
          </p>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
          <TabsTrigger value="personalized" className="flex items-center gap-2">
            <Brain className="h-4 w-4" /> 
            <span>Personalisert</span>
          </TabsTrigger>
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Search className="h-4 w-4" /> 
            <span>Generelle</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> 
            <span>Historikk</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {activeTab === 'personalized' ? (
          <>
            <PersonalizedSearchSuggestions 
              onSelectSuggestion={handleSearch}
              title="Smarte søkeforslag" 
            />
            <div>
              <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
                <h3 className="text-blue-700 flex items-center gap-2 font-medium mb-2">
                  <Info className="h-5 w-5" />
                  Om smarte søkeforslag
                </h3>
                <p className="text-sm text-blue-600">
                  Søkeforslagene er basert på din søkehistorikk, preferanser, tidspunkt på dagen, 
                  og populære søk fra andre brukere. Favoritter søk for å se dem her!
                </p>
              </div>
              <SearchHistory 
                onSelectSearch={handleSearch}
                limit={5}
              />
            </div>
          </>
        ) : activeTab === 'basic' ? (
          <>
            <SearchSuggestions 
              onSelectSuggestion={handleSearch}
              title="Generelle søkeforslag"
            />
            <SearchHistory 
              onSelectSearch={handleSearch}
            />
          </>
        ) : (
          <>
            <SearchHistory 
              onSelectSearch={handleSearch}
              limit={20}
            />
            <SearchSuggestions 
              onSelectSuggestion={handleSearch}
              title="Prøv også"
              showTrending={true}
            />
          </>
        )}
      </div>
    </div>
  );
}