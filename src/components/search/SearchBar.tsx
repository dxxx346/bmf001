'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value?: string;
  placeholder?: string;
  suggestions?: string[];
  recentSearches?: string[];
  trendingSearches?: string[];
  isLoadingSuggestions?: boolean;
  onSearch: (query: string) => void;
  onSuggestionRequest?: (query: string) => void;
  onClearSuggestions?: () => void;
  className?: string;
  showSuggestions?: boolean;
  autoFocus?: boolean;
}

export function SearchBar({
  value = '',
  placeholder = 'Search for digital products...',
  suggestions = [],
  recentSearches = [],
  trendingSearches = [],
  isLoadingSuggestions = false,
  onSearch,
  onSuggestionRequest,
  onClearSuggestions,
  className,
  showSuggestions = true,
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update local state when value prop changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Handle suggestion requests
  useEffect(() => {
    if (query.trim() && onSuggestionRequest && isFocused) {
      onSuggestionRequest(query);
    } else if (!query.trim() && onClearSuggestions) {
      onClearSuggestions();
    }
  }, [query, onSuggestionRequest, onClearSuggestions, isFocused]);

  // Get all available suggestions
  const allSuggestions = [
    ...suggestions.map(s => ({ text: s, type: 'suggestion' as const })),
    ...recentSearches.map(s => ({ text: s, type: 'recent' as const })),
    ...trendingSearches.map(s => ({ text: s, type: 'trending' as const })),
  ];

  // Filter duplicates and limit results
  const uniqueSuggestions = allSuggestions
    .filter((item, index, self) => 
      self.findIndex(s => s.text.toLowerCase() === item.text.toLowerCase()) === index
    )
    .slice(0, 8);

  const showSuggestionDropdown = showSuggestions && isFocused && (
    query.trim() || recentSearches.length > 0 || trendingSearches.length > 0
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedIndex(-1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    setSelectedIndex(-1);
    inputRef.current?.focus();
    if (onClearSuggestions) {
      onClearSuggestions();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestionDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < uniqueSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        if (selectedIndex >= 0 && uniqueSuggestions[selectedIndex]) {
          e.preventDefault();
          handleSuggestionClick(uniqueSuggestions[selectedIndex].text);
        }
        break;
      case 'Escape':
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  const getSuggestionIcon = (type: 'suggestion' | 'recent' | 'trending') => {
    switch (type) {
      case 'recent':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSuggestionLabel = (type: 'suggestion' | 'recent' | 'trending') => {
    switch (type) {
      case 'recent':
        return 'Recent';
      case 'trending':
        return 'Trending';
      default:
        return null;
    }
  };

  return (
    <div className={cn('relative w-full max-w-2xl', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="pl-10 pr-10 h-12 text-base border-2 focus:border-blue-500 focus:ring-blue-500"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestionDropdown && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {isLoadingSuggestions ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading suggestions...
            </div>
          ) : uniqueSuggestions.length > 0 ? (
            <>
              {/* Group suggestions by type */}
              {recentSearches.length > 0 && (
                <div className="border-b border-gray-100">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Recent Searches
                  </div>
                  {uniqueSuggestions
                    .filter(s => s.type === 'recent')
                    .slice(0, 3)
                    .map((suggestion, index) => (
                      <button
                        key={`recent-${index}`}
                        onClick={() => handleSuggestionClick(suggestion.text)}
                        className={cn(
                          'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors',
                          selectedIndex === index && 'bg-blue-50'
                        )}
                      >
                        {getSuggestionIcon(suggestion.type)}
                        <span className="flex-1">{suggestion.text}</span>
                      </button>
                    ))
                  }
                </div>
              )}

              {trendingSearches.length > 0 && (
                <div className="border-b border-gray-100">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Trending
                  </div>
                  {uniqueSuggestions
                    .filter(s => s.type === 'trending')
                    .slice(0, 3)
                    .map((suggestion, index) => (
                      <button
                        key={`trending-${index}`}
                        onClick={() => handleSuggestionClick(suggestion.text)}
                        className={cn(
                          'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors',
                          selectedIndex === index + (recentSearches.length > 0 ? 3 : 0) && 'bg-blue-50'
                        )}
                      >
                        {getSuggestionIcon(suggestion.type)}
                        <span className="flex-1">{suggestion.text}</span>
                        <Badge variant="outline" size="sm" className="text-green-600 border-green-200">
                          Hot
                        </Badge>
                      </button>
                    ))
                  }
                </div>
              )}

              {/* Regular suggestions */}
              {suggestions.length > 0 && (
                <div>
                  {suggestions.slice(0, 5).map((suggestion, index) => (
                    <button
                      key={`suggestion-${index}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors',
                        selectedIndex === index + (recentSearches.length > 0 ? 3 : 0) + (trendingSearches.length > 0 ? 3 : 0) && 'bg-blue-50'
                      )}
                    >
                      <Search className="h-4 w-4 text-gray-400" />
                      <span className="flex-1">
                        {/* Highlight matching text */}
                        {query ? (
                          <span>
                            {suggestion.split(new RegExp(`(${query})`, 'gi')).map((part, i) =>
                              part.toLowerCase() === query.toLowerCase() ? (
                                <mark key={i} className="bg-yellow-200 px-0">{part}</mark>
                              ) : (
                                part
                              )
                            )}
                          </span>
                        ) : (
                          suggestion
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : query.trim() ? (
            <div className="p-4 text-center text-gray-500">
              No suggestions found for "{query}"
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              Start typing to search for products
            </div>
          )}
        </div>
      )}

      {/* Click outside to close suggestions */}
      {showSuggestionDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsFocused(false)}
        />
      )}
    </div>
  );
}
