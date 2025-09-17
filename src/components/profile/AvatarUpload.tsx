'use client'

import * as React from "react"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Camera, Upload, X, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/avatar"
import { Modal } from "@/components/ui/modal"
import { Progress } from "@/components/ui/progress"
import { avatarUploadSchema, type AvatarUploadFormData } from "@/lib/validations/auth"
import { useAuthContext } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

interface AvatarUploadProps {
  currentAvatarUrl?: string
  userName?: string
  size?: 'sm' | 'default' | 'lg' | 'xl' | '2xl'
  className?: string
  onUploadComplete?: (avatarUrl: string) => void
  onUploadError?: (error: string) => void
}

export function AvatarUpload({
  currentAvatarUrl,
  userName,
  size = 'xl',
  className,
  onUploadComplete,
  onUploadError
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, updateProfile } = useAuthContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<AvatarUploadFormData>({
    resolver: zodResolver(avatarUploadSchema)
  })

  const selectedFile = watch('file')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setValue('file', file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setIsModalOpen(true)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      setValue('file', file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setIsModalOpen(true)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const uploadToSupabase = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      throw new Error(error.message)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const onSubmit = async (data: AvatarUploadFormData) => {
    if (!data.file || !user) return

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Upload to Supabase
      const avatarUrl = await uploadToSupabase(data.file)
      
      // Update user profile
      const result = await updateProfile({
        avatar_url: avatarUrl
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (result.success) {
        toast.success('Profile picture updated successfully!')
        onUploadComplete?.(avatarUrl)
        setIsModalOpen(false)
        reset()
        setPreviewUrl(null)
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      const message = error?.message || 'Failed to upload profile picture'
      toast.error(message)
      onUploadError?.(message)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      const result = await updateProfile({
        avatar_url: null
      })

      if (result.success) {
        toast.success('Profile picture removed')
        onUploadComplete?.('')
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast.error('Failed to remove profile picture')
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    reset()
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  return (
    <>
      <div className={cn("relative inline-block", className)}>
        <UserAvatar
          src={currentAvatarUrl}
          name={userName}
          size={size}
        />
        
        {/* Upload Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:text-white hover:bg-white/20"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-5 w-5" />
          </Button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Update Profile Picture"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Preview Section */}
          <div className="flex flex-col items-center space-y-4">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Avatar preview"
                  className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <Button
                  type="button"
                  variant="danger"
                  size="icon"
                  className="absolute -top-2 -right-2"
                  onClick={() => {
                    URL.revokeObjectURL(previewUrl)
                    setPreviewUrl(null)
                    reset()
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="h-32 w-32 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click or drag</p>
                </div>
              </div>
            )}

            {/* File Requirements */}
            <div className="text-center text-sm text-gray-600">
              <p>JPEG, PNG, or WebP</p>
              <p>Maximum 5MB</p>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Error Display */}
          {errors.file && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{errors.file.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div>
              {currentAvatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading}
                >
                  Remove Current
                </Button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!previewUrl || isUploading}
                loading={isUploading}
                loadingText="Uploading..."
              >
                <Check className="h-4 w-4 mr-2" />
                Save Picture
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
}

// Simple Avatar Upload Button
interface AvatarUploadButtonProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
  className?: string
}

export function AvatarUploadButton({ 
  onFileSelect, 
  disabled, 
  className 
}: AvatarUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        className={cn("flex items-center space-x-2", className)}
      >
        <Camera className="h-4 w-4" />
        <span>Change Picture</span>
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </>
  )
}
