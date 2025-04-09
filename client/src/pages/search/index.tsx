import { useState } from 'react';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchHistory } from '@/components/search/SearchHistory';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';

export default function SearchPage() {
  const [currentSearch, setCurrentSearch] = useState('');
  
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SearchSuggestions 
          onSelectSuggestion={handleSearch}
        />
        <SearchHistory 
          onSelectSearch={handleSearch}
        />
      </div>
    </div>
  );
}