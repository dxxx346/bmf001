'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, List, Heart, Eye, EyeOff, Save, X } from 'lucide-react';
import { useFavorites, CreateListRequest } from '@/contexts/FavoritesContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { cn } from '@/lib/utils';

const DEFAULT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E'
];

const DEFAULT_ICONS = [
  { value: 'heart', label: 'Heart', icon: Heart, description: 'For favorite items' },
  { value: 'list', label: 'List', icon: List, description: 'General purpose list' },
  { value: 'star', label: 'Star', icon: '⭐', description: 'For top picks' },
  { value: 'bookmark', label: 'Bookmark', icon: '🔖', description: 'To save for later' },
  { value: 'gift', label: 'Gift', icon: '🎁', description: 'Gift ideas' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', description: 'Shopping lists' },
  { value: 'work', label: 'Work', icon: '💼', description: 'Work-related items' },
  { value: 'home', label: 'Home', icon: '🏠', description: 'Home & lifestyle' },
];

interface FormData {
  name: string;
  description: string;
  is_public: boolean;
  color: string;
  icon: string;
}

export default function CreateListPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { createList, loading } = useFavorites();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    is_public: false,
    color: '#3B82F6',
    icon: 'list',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, router]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'List name is required';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'List name must be 50 characters or less';
    }

    if (formData.description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const listData: CreateListRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        is_public: formData.is_public,
        color: formData.color,
        icon: formData.icon,
      };

      const newList = await createList(listData);
      
      if (newList) {
        router.push('/buyer/lists');
      }
    } catch (error) {
      console.error('Error creating list:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/buyer/lists');
  };

  const getIconComponent = (iconName: string, className: string = "w-5 h-5"): React.ReactNode => {
    const iconConfig = DEFAULT_ICONS.find(i => i.value === iconName);
    if (iconConfig?.icon && typeof iconConfig.icon !== 'string') {
      const IconComponent = iconConfig.icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className={className} />;
    }
    return <span className="text-lg">{String(iconConfig?.icon || '📝')}</span>;
  };

  const selectedIcon = DEFAULT_ICONS.find(i => i.value === formData.icon);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New List</h1>
          <p className="text-gray-600">Organize your products into a custom collection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>List Details</CardTitle>
              <CardDescription>
                Give your list a name and customize its appearance
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* List Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    List Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter a name for your list"
                    maxLength={50}
                    className={cn(errors.name && 'border-red-500')}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    {formData.name.length}/50 characters
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description for your list"
                    rows={3}
                    maxLength={200}
                    className={cn(errors.description && 'border-red-500')}
                  />
                  {errors.description && (
                    <p className="text-red-600 text-sm mt-1">{errors.description}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    {formData.description.length}/200 characters
                  </p>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Color Theme
                  </label>
                  <div className="grid grid-cols-8 gap-3">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          'w-10 h-10 rounded-lg border-2 transition-all hover:scale-110',
                          formData.color === color 
                            ? 'border-gray-900 scale-110 shadow-lg' 
                            : 'border-transparent hover:border-gray-300'
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                        title={`Select ${color}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Icon
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {DEFAULT_ICONS.map((iconConfig) => (
                      <button
                        key={iconConfig.value}
                        type="button"
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all hover:bg-gray-50',
                          formData.icon === iconConfig.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                        onClick={() => setFormData({ ...formData, icon: iconConfig.value })}
                      >
                        <div className="flex-shrink-0">
                          {typeof iconConfig.icon === 'string' ? (
                            <span className="text-xl">{iconConfig.icon}</span>
                          ) : (
                            <iconConfig.icon className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{iconConfig.label}</div>
                          <div className="text-xs text-gray-600">{iconConfig.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy Setting */}
                <div className="border-t pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Privacy Settings
                  </label>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        id="private"
                        name="privacy"
                        checked={!formData.is_public}
                        onChange={() => setFormData({ ...formData, is_public: false })}
                        className="mt-1 w-4 h-4 text-blue-600 bg-white border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <label htmlFor="private" className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                          <EyeOff className="w-4 h-4" />
                          Private List
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          Only you can view and manage this list
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        id="public"
                        name="privacy"
                        checked={formData.is_public}
                        onChange={() => setFormData({ ...formData, is_public: true })}
                        className="mt-1 w-4 h-4 text-blue-600 bg-white border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <label htmlFor="public" className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                          <Eye className="w-4 h-4" />
                          Public List
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          Others can discover and view this list
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim()}
                  >
                    {isSubmitting ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create List
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>
                See how your list will appear
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* List Preview Card */}
              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg text-white"
                    style={{ backgroundColor: formData.color }}
                  >
                    {getIconComponent(formData.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {formData.name || 'List Name'}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      {formData.is_public ? (
                        <Eye className="w-3 h-3 text-gray-400" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-gray-400" />
                      )}
                      <span className="text-xs text-gray-500">
                        {formData.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {formData.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {formData.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>0 items</span>
                  <span>$0.00 total</span>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Choose descriptive names for easy organization</li>
                  <li>• Use colors to categorize different types of lists</li>
                  <li>• Public lists can be discovered by other users</li>
                  <li>• You can always edit these settings later</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
