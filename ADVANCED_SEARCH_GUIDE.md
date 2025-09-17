# Advanced Search System Documentation

## Overview

This document describes the advanced search functionality implemented for the Digital Marketplace. The system provides comprehensive search capabilities with autocomplete, filtering, pagination, and real-time suggestions.

## Components Structure

### 1. Search Hook (`src/hooks/useSearch.ts`)
The main search logic with debouncing and state management.

**Features:**
- Debounced search queries (300ms delay)
- Comprehensive filter management
- Pagination support
- Auto-suggestion handling
- Category loading
- URL synchronization

**Key Functions:**
- `search(query)` - Execute search with current filters
- `setFilters(filters)` - Update search filters
- `updateFilter(key, value)` - Update single filter
- `clearFilters()` - Reset all filters
- `getSuggestions(query)` - Get autocomplete suggestions
- `loadMore()` - Load additional results

### 2. Search Bar (`src/components/search/SearchBar.tsx`)
Advanced search input with autocomplete dropdown.

**Features:**
- Real-time autocomplete suggestions
- Recent searches tracking (localStorage)
- Trending searches display
- Keyboard navigation (arrow keys, enter, escape)
- Suggestion highlighting
- Mobile-responsive design

**Props:**
```typescript
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
```

### 3. Filter Sidebar (`src/components/search/FilterSidebar.tsx`)
Comprehensive filtering interface with multiple filter types.

**Filter Types:**
- **Sort Options**: Relevance, Newest, Popularity, Rating, Price (Low to High/High to Low)
- **Categories**: Hierarchical category selection with checkboxes
- **Price Range**: Min/max price inputs with validation
- **Rating Filter**: Star-based rating filter (4+ stars, 3+ stars, etc.)
- **File Types**: Multiple file type selection (Images, Videos, Audio, Documents, Archives, Code)
- **Special Offers**: Featured products toggle

**Features:**
- Collapsible sections
- Active filters summary with individual removal
- Mobile-responsive with sheet overlay
- Real-time filter application
- Clear all functionality

### 4. Search Results (`src/components/search/SearchResults.tsx`)
Results display with pagination and view modes.

**Features:**
- Grid and list view modes
- Pagination with page numbers
- Load more functionality (alternative to pagination)
- Results count and range display
- Empty state handling
- Error state handling
- Loading skeletons

**View Modes:**
- **Grid View**: Card-based layout (default)
- **List View**: Compact horizontal layout

### 5. Search Page (`src/app/search/page.tsx`)
Main search results page with full functionality.

**Features:**
- URL parameter synchronization
- Mobile filter sheet
- Responsive layout
- SEO-friendly URLs
- Recent searches persistence
- Trending searches display

## API Endpoints

### 1. Search API (`/api/products/search`)
Main product search endpoint with comprehensive filtering.

**Query Parameters:**
- `q` or `query` - Search query string
- `category_id` - Category filter
- `min_price`, `max_price` - Price range
- `min_rating` - Minimum rating filter
- `file_types` - Comma-separated file types
- `sort_by` - Sort option (relevance, newest, popularity, rating, price_asc, price_desc)
- `is_featured` - Featured products filter
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Response:**
```typescript
{
  products: Product[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
  facets?: SearchFacets;
}
```

### 2. Suggestions API (`/api/products/suggestions`)
Autocomplete suggestions endpoint.

**Query Parameters:**
- `q` - Search query string (minimum 2 characters)

**Response:**
```typescript
{
  suggestions: string[];
}
```

**Suggestion Sources:**
- Product titles (exact and partial matches)
- Product tags
- Category names
- Cached for 5 minutes per query

## Usage Examples

### Basic Search Implementation
```tsx
import { useSearch } from '@/hooks/useSearch';
import { SearchBar, SearchResults } from '@/components/search';

function SearchPage() {
  const {
    results,
    suggestions,
    isLoading,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    filters,
    search,
    getSuggestions,
    clearSuggestions,
  } = useSearch();

  return (
    <div>
      <SearchBar
        value={filters.query}
        suggestions={suggestions}
        onSearch={search}
        onSuggestionRequest={getSuggestions}
        onClearSuggestions={clearSuggestions}
      />
      <SearchResults
        results={results}
        isLoading={isLoading}
        error={error}
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        filters={filters}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
```

### Filter Integration
```tsx
import { FilterSidebar } from '@/components/search';

function SearchWithFilters() {
  const { filters, categories, setFilters, clearFilters } = useSearch();

  return (
    <div className="flex">
      <FilterSidebar
        filters={filters}
        categories={categories}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />
      {/* Search results */}
    </div>
  );
}
```

## Search Features

### 1. Autocomplete
- Real-time suggestions as user types
- Debounced API calls (300ms)
- Recent searches from localStorage
- Trending searches display
- Keyboard navigation support

### 2. Filtering
- **Categories**: Single or multiple category selection
- **Price Range**: Min/max price inputs
- **Rating**: Minimum rating filter
- **File Types**: Multiple file type selection
- **Sort Options**: Various sorting methods
- **Featured**: Show only featured products

### 3. Search Results
- **Pagination**: Page-based navigation
- **View Modes**: Grid and list views
- **Loading States**: Skeleton loaders
- **Empty States**: No results messaging
- **Error Handling**: Error state display

### 4. URL Integration
- All filters reflected in URL parameters
- Shareable search URLs
- Browser back/forward support
- SEO-friendly structure

### 5. Performance
- **Caching**: Redis caching for suggestions and popular searches
- **Debouncing**: Reduced API calls for search input
- **Pagination**: Efficient result loading
- **Lazy Loading**: On-demand category loading

## Mobile Responsiveness

### Mobile Features
- Sheet-based filter sidebar
- Touch-friendly interactions
- Responsive grid layouts
- Mobile-optimized search bar
- Gesture navigation support

### Breakpoints
- **Mobile**: < 768px (1 column grid, sheet filters)
- **Tablet**: 768px - 1024px (2 column grid, sidebar filters)
- **Desktop**: > 1024px (3-4 column grid, full sidebar)

## Accessibility

### ARIA Support
- Proper ARIA labels and roles
- Keyboard navigation
- Screen reader compatibility
- Focus management
- High contrast support

### Keyboard Shortcuts
- **Arrow Keys**: Navigate suggestions
- **Enter**: Select suggestion or search
- **Escape**: Close suggestions dropdown
- **Tab**: Navigate between elements

## Caching Strategy

### Redis Caching
- **Suggestions**: 5 minutes TTL
- **Categories**: 1 hour TTL
- **Popular Products**: 30 minutes TTL
- **Search Results**: 10 minutes TTL (for identical queries)

### Client-Side Caching
- Recent searches in localStorage (max 5)
- Component state caching
- Image lazy loading

## SEO Optimization

### URL Structure
```
/search?q=digital+art&category=1&min_price=10&max_price=100&sort=rating
```

### Meta Tags
- Dynamic page titles based on search query
- Meta descriptions for search pages
- Open Graph tags for social sharing
- Structured data for search results

## Performance Metrics

### Target Performance
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Search Response Time**: < 500ms
- **Suggestion Response Time**: < 200ms

### Optimization Techniques
- Code splitting for search components
- Image optimization and lazy loading
- API response compression
- CDN for static assets
- Database query optimization

## Future Enhancements

### Planned Features
1. **Advanced Filters**
   - Date range filters
   - Seller rating filters
   - Download count filters
   - License type filters

2. **Search Analytics**
   - Popular search terms
   - Conversion tracking
   - A/B testing for search UI
   - User behavior analytics

3. **AI-Powered Features**
   - Smart search suggestions
   - Semantic search
   - Visual similarity search
   - Personalized recommendations

4. **Search Personalization**
   - User preference learning
   - Search history analysis
   - Personalized result ranking
   - Saved searches and alerts

## Troubleshooting

### Common Issues
1. **Slow Search**: Check database indexes, Redis connection
2. **No Suggestions**: Verify API endpoint, check query length
3. **Filter Not Working**: Check URL parameters, API mapping
4. **Mobile Issues**: Test responsive breakpoints, touch events

### Debug Tools
- Browser DevTools Network tab
- Redis CLI for cache inspection
- Database query logs
- Application performance monitoring

## Conclusion

The advanced search system provides a comprehensive, performant, and user-friendly search experience for the Digital Marketplace. It combines modern web technologies with best practices for search interfaces, ensuring both functionality and usability across all devices and user scenarios.
