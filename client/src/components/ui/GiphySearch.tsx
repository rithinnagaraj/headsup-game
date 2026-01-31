'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface GiphyGif {
  id: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    fixed_height_still: {
      url: string;
    };
    original: {
      url: string;
    };
  };
  title: string;
}

interface GiphySearchProps {
  searchTerm: string;
  selectedUrl: string;
  onSelect: (url: string) => void;
}

// GIPHY API key from environment variable
const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

export function GiphySearch({ searchTerm, selectedUrl, onSelect }: GiphySearchProps) {
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  const searchGiphy = useCallback(async (query: string) => {
    if (!query.trim() || !GIPHY_API_KEY) {
      setGifs([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=12&rating=pg`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('GIPHY search error:', error);
      setGifs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (debouncedSearch) {
      searchGiphy(debouncedSearch);
    } else {
      setGifs([]);
    }
  }, [debouncedSearch, searchGiphy]);
  
  const handleSelect = (gif: GiphyGif) => {
    onSelect(gif.images.fixed_height.url);
    setIsOpen(false);
  };
  
  const handleClear = () => {
    onSelect('');
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm text-gray-400">
          Choose a GIF (optional)
        </label>
        {selectedUrl && (
          <button
            onClick={handleClear}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Clear
          </button>
        )}
      </div>
      
      {/* Selected GIF Preview */}
      {selectedUrl && (
        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-purple-500">
          <img
            src={selectedUrl}
            alt="Selected GIF"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-game-bg border border-game-border rounded-lg text-left text-gray-400 hover:border-purple-500 transition-colors flex items-center justify-between"
      >
        <span>{selectedUrl ? 'Change GIF' : 'Search for a GIF...'}</span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* GIF Grid */}
      {isOpen && (
        <div className="bg-game-bg border border-game-border rounded-lg p-3">
          {!GIPHY_API_KEY ? (
            <p className="text-gray-500 text-sm text-center py-4">
              GIF search is not configured. Contact the admin.
            </p>
          ) : !searchTerm.trim() ? (
            <p className="text-gray-500 text-sm text-center py-4">
              Start typing the personality name above to search for GIFs
            </p>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : gifs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No GIFs found for "{searchTerm}"
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleSelect(gif)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    selectedUrl === gif.images.fixed_height.url
                      ? 'border-purple-500'
                      : 'border-transparent hover:border-gray-500'
                  }`}
                >
                  <img
                    src={gif.images.fixed_height.url}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
          
          {/* GIPHY Attribution */}
          <div className="mt-3 pt-3 border-t border-game-border flex items-center justify-center">
            <span className="text-xs text-gray-500">Powered by</span>
            <img
              src="https://giphy.com/static/img/giphy_logo_square_social.png"
              alt="GIPHY"
              className="h-4 ml-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
