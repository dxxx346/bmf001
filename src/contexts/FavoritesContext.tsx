'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuthContext } from './AuthContext';

// Types
export interface ProductList {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  is_default: boolean;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  item_count?: number;
  total_value?: number;
  last_added?: string;
}

export interface ProductListItem {
  id: string;
  list_id: string;
  product_id: string;
  added_at: string;
  notes?: string;
  priority: number;
  product?: {
    id: string;
    title: string;
    price: number;
    thumbnail_url?: string;
    seller_id: string;
    shop_id: string;
  };
}

export interface CreateListRequest {
  name: string;
  description?: string;
  is_public?: boolean;
  color?: string;
  icon?: string;
}

export interface UpdateListRequest {
  id: string;
  name?: string;
  description?: string;
  is_public?: boolean;
  color?: string;
  icon?: string;
}

// State types
interface FavoritesState {
  lists: ProductList[];
  favorites: ProductListItem[];
  favoriteProductIds: Set<string>;
  loading: boolean;
  error: string | null;
}

// Action types
type FavoritesAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LISTS'; payload: ProductList[] }
  | { type: 'ADD_LIST'; payload: ProductList }
  | { type: 'UPDATE_LIST'; payload: ProductList }
  | { type: 'DELETE_LIST'; payload: string }
  | { type: 'SET_FAVORITES'; payload: ProductListItem[] }
  | { type: 'ADD_FAVORITE'; payload: ProductListItem }
  | { type: 'REMOVE_FAVORITE'; payload: string }
  | { type: 'UPDATE_FAVORITE_PRODUCT_IDS'; payload: string[] };

// Initial state
const initialState: FavoritesState = {
  lists: [],
  favorites: [],
  favoriteProductIds: new Set(),
  loading: false,
  error: null,
};

// Reducer
function favoritesReducer(state: FavoritesState, action: FavoritesAction): FavoritesState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_LISTS':
      return { ...state, lists: action.payload };
    
    case 'ADD_LIST':
      return { ...state, lists: [...state.lists, action.payload] };
    
    case 'UPDATE_LIST':
      return {
        ...state,
        lists: state.lists.map(list =>
          list.id === action.payload.id ? action.payload : list
        ),
      };
    
    case 'DELETE_LIST':
      return {
        ...state,
        lists: state.lists.filter(list => list.id !== action.payload),
      };
    
    case 'SET_FAVORITES':
      return {
        ...state,
        favorites: action.payload,
        favoriteProductIds: new Set(action.payload.map(item => item.product_id)),
      };
    
    case 'ADD_FAVORITE':
      return {
        ...state,
        favorites: [...state.favorites, action.payload],
        favoriteProductIds: new Set([...state.favoriteProductIds, action.payload.product_id]),
      };
    
    case 'REMOVE_FAVORITE':
      const updatedFavorites = state.favorites.filter(item => item.product_id !== action.payload);
      return {
        ...state,
        favorites: updatedFavorites,
        favoriteProductIds: new Set(updatedFavorites.map(item => item.product_id)),
      };
    
    case 'UPDATE_FAVORITE_PRODUCT_IDS':
      return {
        ...state,
        favoriteProductIds: new Set(action.payload),
      };
    
    default:
      return state;
  }
}

// Context type
interface FavoritesContextType {
  // State
  lists: ProductList[];
  favorites: ProductListItem[];
  favoriteProductIds: Set<string>;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadLists: () => Promise<void>;
  createList: (data: CreateListRequest) => Promise<ProductList | null>;
  updateList: (data: UpdateListRequest) => Promise<ProductList | null>;
  deleteList: (listId: string) => Promise<boolean>;
  
  loadFavorites: () => Promise<void>;
  toggleFavorite: (productId: string) => Promise<boolean>;
  addToList: (listId: string, productId: string, notes?: string) => Promise<boolean>;
  removeFromList: (listId: string, productId: string) => Promise<boolean>;
  
  getListItems: (listId: string) => Promise<ProductListItem[]>;
  isFavorite: (productId: string) => boolean;
  getFavoritesList: () => ProductList | null;
}

// Create context
const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

// Provider component
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(favoritesReducer, initialState);
  const { user } = useAuthContext();
  const supabase = createClientComponentClient();

  // Load user's lists
  const loadLists = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const { data, error } = await supabase
        .from('product_lists')
        .select(`
          *,
          product_list_items(count)
        `)
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Transform data to include item count
      const listsWithStats = data?.map(list => ({
        ...list,
        item_count: list.product_list_items?.[0]?.count || 0,
      })) || [];

      dispatch({ type: 'SET_LISTS', payload: listsWithStats });
    } catch (error) {
      console.error('Error loading lists:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load lists' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, supabase]);

  // Load favorites (items from default list)
  const loadFavorites = useCallback(async () => {
    if (!user) return;

    try {
      // Get the default favorites list
      const { data: favoritesList } = await supabase
        .from('product_lists')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (!favoritesList) return;

      // Get items from favorites list with product details
      const { data, error } = await supabase
        .from('product_list_items')
        .select(`
          *,
          products (
            id,
            title,
            price,
            thumbnail_url,
            seller_id,
            shop_id
          )
        `)
        .eq('list_id', favoritesList.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      dispatch({ type: 'SET_FAVORITES', payload: data || [] });
    } catch (error) {
      console.error('Error loading favorites:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load favorites' });
    }
  }, [user, supabase]);

  // Create a new list
  const createList = useCallback(async (data: CreateListRequest): Promise<ProductList | null> => {
    if (!user) return null;

    try {
      const { data: newList, error } = await supabase
        .from('product_lists')
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description,
          is_public: data.is_public || false,
          color: data.color || '#3B82F6',
          icon: data.icon || 'list',
          sort_order: state.lists.length,
        })
        .select()
        .single();

      if (error) throw error;

      const listWithStats = { ...newList, item_count: 0 };
      dispatch({ type: 'ADD_LIST', payload: listWithStats });
      
      return listWithStats;
    } catch (error) {
      console.error('Error creating list:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create list' });
      return null;
    }
  }, [user, supabase, state.lists.length]);

  // Update a list
  const updateList = useCallback(async (data: UpdateListRequest): Promise<ProductList | null> => {
    if (!user) return null;

    try {
      const { data: updatedList, error } = await supabase
        .from('product_lists')
        .update({
          name: data.name,
          description: data.description,
          is_public: data.is_public,
          color: data.color,
          icon: data.icon,
        })
        .eq('id', data.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      const existingList = state.lists.find(l => l.id === data.id);
      const listWithStats = { ...updatedList, item_count: existingList?.item_count || 0 };
      
      dispatch({ type: 'UPDATE_LIST', payload: listWithStats });
      
      return listWithStats;
    } catch (error) {
      console.error('Error updating list:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update list' });
      return null;
    }
  }, [user, supabase, state.lists]);

  // Delete a list
  const deleteList = useCallback(async (listId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('product_lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', user.id);

      if (error) throw error;

      dispatch({ type: 'DELETE_LIST', payload: listId });
      return true;
    } catch (error) {
      console.error('Error deleting list:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete list' });
      return false;
    }
  }, [user, supabase]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (productId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('toggle_product_favorite', {
        user_id: user.id,
        product_id: productId,
      });

      if (error) throw error;

      const result = data?.[0];
      if (result?.is_favorited) {
        // Product was added to favorites - we need to fetch the full item
        const { data: newItem } = await supabase
          .from('product_list_items')
          .select(`
            *,
            products (
              id,
              title,
              price,
              thumbnail_url,
              seller_id,
              shop_id
            )
          `)
          .eq('list_id', result.list_id)
          .eq('product_id', productId)
          .single();

        if (newItem) {
          dispatch({ type: 'ADD_FAVORITE', payload: newItem });
        }
      } else {
        // Product was removed from favorites
        dispatch({ type: 'REMOVE_FAVORITE', payload: productId });
      }

      return result?.is_favorited || false;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to toggle favorite' });
      return false;
    }
  }, [user, supabase]);

  // Add product to a specific list
  const addToList = useCallback(async (listId: string, productId: string, notes?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('product_list_items')
        .insert({
          list_id: listId,
          product_id: productId,
          notes,
        });

      if (error) throw error;

      // If adding to favorites list, update favorites state
      const favoritesList = state.lists.find(list => list.is_default);
      if (favoritesList && listId === favoritesList.id) {
        await loadFavorites();
      }

      return true;
    } catch (error) {
      console.error('Error adding to list:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add product to list' });
      return false;
    }
  }, [user, supabase, state.lists, loadFavorites]);

  // Remove product from a list
  const removeFromList = useCallback(async (listId: string, productId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('product_list_items')
        .delete()
        .eq('list_id', listId)
        .eq('product_id', productId);

      if (error) throw error;

      // If removing from favorites list, update favorites state
      const favoritesList = state.lists.find(list => list.is_default);
      if (favoritesList && listId === favoritesList.id) {
        dispatch({ type: 'REMOVE_FAVORITE', payload: productId });
      }

      return true;
    } catch (error) {
      console.error('Error removing from list:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove product from list' });
      return false;
    }
  }, [user, supabase, state.lists]);

  // Get items for a specific list
  const getListItems = useCallback(async (listId: string): Promise<ProductListItem[]> => {
    try {
      const { data, error } = await supabase
        .from('product_list_items')
        .select(`
          *,
          products (
            id,
            title,
            price,
            thumbnail_url,
            seller_id,
            shop_id
          )
        `)
        .eq('list_id', listId)
        .order('added_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading list items:', error);
      return [];
    }
  }, [supabase]);

  // Check if product is favorited
  const isFavorite = useCallback((productId: string): boolean => {
    return state.favoriteProductIds.has(productId);
  }, [state.favoriteProductIds]);

  // Get the favorites list
  const getFavoritesList = useCallback((): ProductList | null => {
    return state.lists.find(list => list.is_default) || null;
  }, [state.lists]);

  // Load initial data when user changes
  useEffect(() => {
    if (user) {
      loadLists();
      loadFavorites();
    } else {
      // Clear state when user logs out
      dispatch({ type: 'SET_LISTS', payload: [] });
      dispatch({ type: 'SET_FAVORITES', payload: [] });
    }
  }, [user, loadLists, loadFavorites]);

  const contextValue: FavoritesContextType = {
    // State
    lists: state.lists,
    favorites: state.favorites,
    favoriteProductIds: state.favoriteProductIds,
    loading: state.loading,
    error: state.error,
    
    // Actions
    loadLists,
    createList,
    updateList,
    deleteList,
    loadFavorites,
    toggleFavorite,
    addToList,
    removeFromList,
    getListItems,
    isFavorite,
    getFavoritesList,
  };

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
}

// Hook to use the favorites context
export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

export default FavoritesContext;
