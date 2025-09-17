'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Heart, List, MoreVertical, Copy, Share2 } from 'lucide-react';
import { useFavorites, ProductList, CreateListRequest, UpdateListRequest } from '@/contexts/FavoritesContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

interface ListManagerProps {
  onListSelect?: (list: ProductList) => void;
  selectedListId?: string;
  showCreateButton?: boolean;
  className?: string;
}

interface ListFormData {
  name: string;
  description: string;
  is_public: boolean;
  color: string;
  icon: string;
}

const DEFAULT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E'
];

const DEFAULT_ICONS = [
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'list', label: 'List', icon: List },
  { value: 'star', label: 'Star', icon: '⭐' },
  { value: 'bookmark', label: 'Bookmark', icon: '🔖' },
  { value: 'gift', label: 'Gift', icon: '🎁' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'home', label: 'Home', icon: '🏠' },
];

export function ListManager({ 
  onListSelect, 
  selectedListId, 
  showCreateButton = true,
  className 
}: ListManagerProps) {
  const { lists, loading, createList, updateList, deleteList, loadLists } = useFavorites();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingList, setEditingList] = useState<ProductList | null>(null);
  const [formData, setFormData] = useState<ListFormData>({
    name: '',
    description: '',
    is_public: false,
    color: '#3B82F6',
    icon: 'list',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_public: false,
      color: '#3B82F6',
      icon: 'list',
    });
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newList = await createList({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        is_public: formData.is_public,
        color: formData.color,
        icon: formData.icon,
      });

      if (newList) {
        setShowCreateModal(false);
        resetForm();
        onListSelect?.(newList);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingList || !formData.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updatedList = await updateList({
        id: editingList.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        is_public: formData.is_public,
        color: formData.color,
        icon: formData.icon,
      });

      if (updatedList) {
        setShowEditModal(false);
        setEditingList(null);
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteList = async () => {
    if (!editingList || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await deleteList(editingList.id);
      if (success) {
        setShowDeleteModal(false);
        setEditingList(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (list: ProductList) => {
    setEditingList(list);
    setFormData({
      name: list.name,
      description: list.description || '',
      is_public: list.is_public,
      color: list.color,
      icon: list.icon,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (list: ProductList) => {
    setEditingList(list);
    setShowDeleteModal(true);
  };

  const getIconComponent = (iconName: string): React.ReactNode => {
    const iconConfig = DEFAULT_ICONS.find(i => i.value === iconName);
    if (iconConfig?.icon && typeof iconConfig.icon !== 'string') {
      const IconComponent = iconConfig.icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-4 h-4" />;
    }
    return <span className="text-sm">{String(iconConfig?.icon || '📝')}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Lists</h3>
        {showCreateButton && (
          <Button onClick={openCreateModal} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New List
          </Button>
        )}
      </div>

      {/* Lists */}
      <div className="space-y-3">
        {lists.map((list) => (
          <Card
            key={list.id}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md',
              selectedListId === list.id && 'ring-2 ring-blue-500 shadow-md'
            )}
            onClick={() => onListSelect?.(list)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Icon and Color */}
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg text-white"
                    style={{ backgroundColor: list.color }}
                  >
                    {getIconComponent(list.icon)}
                  </div>

                  {/* List Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 truncate">
                        {list.name}
                      </h4>
                      {list.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                      {list.is_public ? (
                        <Eye className="w-4 h-4 text-gray-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    
                    {list.description && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {list.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{list.item_count || 0} items</span>
                      {list.total_value && (
                        <span>${list.total_value.toFixed(2)} total</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!list.is_default && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(list);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(list);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {lists.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                  <List className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">No lists yet</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Create your first list to organize your favorite products
                  </p>
                </div>
                {showCreateButton && (
                  <Button onClick={openCreateModal} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create List
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create List Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New List"
        description="Organize your products into custom lists"
      >
        <form onSubmit={handleCreateList} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              List Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter list name"
              required
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              rows={3}
              maxLength={200}
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    'w-8 h-8 rounded-lg border-2 transition-all',
                    formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_ICONS.map((iconConfig) => (
                <button
                  key={iconConfig.value}
                  type="button"
                  className={cn(
                    'flex items-center justify-center p-2 rounded-lg border-2 transition-all',
                    formData.icon === iconConfig.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => setFormData({ ...formData, icon: iconConfig.value })}
                >
                  {typeof iconConfig.icon === 'string' ? (
                    <span className="text-lg">{iconConfig.icon}</span>
                  ) : (
                    <iconConfig.icon className="w-5 h-5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_public" className="text-sm text-gray-700">
              Make this list public (others can view it)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Create List'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit List Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit List"
        description="Update your list settings"
      >
        <form onSubmit={handleEditList} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              List Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter list name"
              required
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              rows={3}
              maxLength={200}
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    'w-8 h-8 rounded-lg border-2 transition-all',
                    formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_ICONS.map((iconConfig) => (
                <button
                  key={iconConfig.value}
                  type="button"
                  className={cn(
                    'flex items-center justify-center p-2 rounded-lg border-2 transition-all',
                    formData.icon === iconConfig.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => setFormData({ ...formData, icon: iconConfig.value })}
                >
                  {typeof iconConfig.icon === 'string' ? (
                    <span className="text-lg">{iconConfig.icon}</span>
                  ) : (
                    <iconConfig.icon className="w-5 h-5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Setting (only for non-default lists) */}
          {editingList && !editingList.is_default && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit_is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="edit_is_public" className="text-sm text-gray-700">
                Make this list public (others can view it)
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete List"
        description="Are you sure you want to delete this list? This action cannot be undone."
      >
        <div className="space-y-4">
          {editingList && (
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-white"
                  style={{ backgroundColor: editingList.color }}
                >
                  {getIconComponent(editingList.icon)}
                </div>
                <div>
                  <h4 className="font-medium text-red-900">{editingList.name}</h4>
                  <p className="text-sm text-red-700">
                    {editingList.item_count || 0} items will be removed from this list
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteList}
              disabled={isSubmitting}
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Delete List'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ListManager;
