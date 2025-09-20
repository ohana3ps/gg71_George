
'use client'

import { useState } from 'react'
import { Room } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RoomFormProps {
  room?: Room | null
  onSubmit: (data: { name: string; description: string; color: string }) => void
  onCancel: () => void
  isLoading?: boolean
}

const ROOM_COLORS = [
  '#FFFFFF', // white/no color
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
]

export function RoomForm({ room, onSubmit, onCancel, isLoading = false }: RoomFormProps) {
  const [formData, setFormData] = useState({
    name: room?.name || '',
    description: room?.description || '',
    color: room?.color || '#FFFFFF'
  })

  const handleColorSelect = (selectedColor: string) => {
    if (!isLoading) {
      setFormData(prev => ({ ...prev, color: selectedColor }))
    }
  }

  // Mobile keyboard handling - scroll to show buttons when input is focused
  const scrollToButtons = () => {
    setTimeout(() => {
      const buttonsElement = document.querySelector('[data-mobile-form-buttons]')
      if (buttonsElement) {
        buttonsElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        })
      }
    }, 300) // Delay to allow keyboard to appear
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (formData.name.trim() && !isLoading) {
      onSubmit(formData)
    }
  }

  return (
    <div className="w-full flex flex-col max-h-[80vh]">
      <div className="pb-4 border-b flex-shrink-0">
        <h2 className="text-lg font-semibold">
          {room ? 'Edit Room' : 'Create New Room'}
        </h2>
      </div>
      
      {/* Mobile-optimized form */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
          <div className="space-y-2">
            <Label htmlFor="name">Room Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Main Garage, Workshop, Storage"
              disabled={isLoading}
              required
              onFocus={scrollToButtons}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description for this room..."
              disabled={isLoading}
              rows={2}
              onFocus={scrollToButtons}
            />
          </div>

          <div className="space-y-2">
            <Label>Room Color</Label>
            <p className="text-xs text-gray-500 mb-2">
              Selected: 
              {formData.color === '#FFFFFF' ? (
                <span className="ml-1 inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 border">
                  No Color (White)
                </span>
              ) : (
                <span className="inline-block w-3 h-3 rounded-full border ml-1" style={{ backgroundColor: formData.color }}></span>
              )}
            </p>
            <div className="flex flex-wrap gap-3 px-1">
              {ROOM_COLORS.map((color, index) => {
                const isSelected = formData.color === color
                const isWhite = color === '#FFFFFF'
                return (
                  <button
                    key={color}
                    type="button"
                    className={`w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] rounded-full border-2 transition-all touch-manipulation active:scale-95 relative ${
                      isSelected 
                        ? 'border-gray-800 scale-110 shadow-lg ring-2 ring-blue-200' 
                        : isWhite 
                          ? 'border-gray-400 hover:border-gray-600 hover:shadow-md'
                          : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                    }`}
                    style={{ 
                      backgroundColor: color,
                      ...(isWhite && { boxShadow: 'inset 0 0 0 1px #e5e7eb' })
                    }}
                    onClick={() => handleColorSelect(color)}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleColorSelect(color)
                    }}
                    disabled={isLoading}
                    aria-label={isWhite ? 'Select no color (white)' : `Select ${color} color`}
                    title={index === 0 ? 'No Color (White)' : undefined}
                  >
                    {isWhite && !isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-gray-400">∅</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg 
                          className={`w-4 h-4 drop-shadow-md ${isWhite ? 'text-gray-600' : 'text-white'}`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Form buttons - always visible */}
        <div 
          className="border-t pt-4 bg-white flex-shrink-0"
          data-mobile-form-buttons
        >
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : (room ? 'Update Room' : 'Create Room')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                onCancel()
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
