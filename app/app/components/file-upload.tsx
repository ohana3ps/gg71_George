
'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from './button'
import { Progress } from './progress'
import { Card } from './card'
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface FileUploadProps {
  onUpload: (url: string) => void
  currentImage?: string | null
  className?: string
  accept?: string
  maxSize?: number // in MB
}

export function FileUpload({ 
  onUpload, 
  currentImage, 
  className = '',
  accept = 'image/*',
  maxSize = 5 
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file'
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSize) {
      return `File size must be less than ${maxSize}MB`
    }

    return null
  }

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Create preview URL
      const localPreviewUrl = URL.createObjectURL(file)
      setPreviewUrl(localPreviewUrl)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 100)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      if (result.success) {
        setPreviewUrl(result.url)
        onUpload(result.url)
        toast.success('Image uploaded successfully!')
      } else {
        throw new Error(result.error || 'Upload failed')
      }

    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image'
      setError(errorMessage)
      toast.error(errorMessage)
      setPreviewUrl(currentImage || null)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  const removeImage = () => {
    setPreviewUrl(null)
    setError(null)
    onUpload('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewUrl ? (
        <Card className="relative group">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <Button
                variant="destructive"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card 
          className={`
            border-2 border-dashed cursor-pointer transition-all duration-200 hover:border-blue-400 hover:bg-blue-50
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${error ? 'border-red-300 bg-red-50' : ''}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <div className="p-8 text-center">
            {isUploading ? (
              <div className="space-y-4">
                <div className="animate-spin mx-auto h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-600">Uploading image...</p>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-gray-500">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {error ? (
                  <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <ImageIcon className="mx-auto h-8 w-8 text-blue-500" />
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className={`text-sm font-medium ${error ? 'text-red-600' : 'text-gray-700'}`}>
                    {error || 'Drop an image here or click to select'}
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, GIF, WebP up to {maxSize}MB
                  </p>
                </div>

                {!error && (
                  <Button variant="outline" size="sm" type="button">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {error && !isUploading && (
        <p className="mt-2 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  )
}
