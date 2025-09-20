
'use client'

import { useState } from 'react'
import { Item, Room } from '@prisma/client'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog'
import { 
  Camera, 
  MapPin, 
  Package, 
  DollarSign, 
  Hash,
  Calendar,
  X,
  Edit,
  Trash2
} from 'lucide-react'

interface ItemWithRoom extends Item {
  room: {
    id: string
    name: string
    color: string
  }
}

interface ImageGalleryProps {
  items: ItemWithRoom[]
  onEdit?: (item: ItemWithRoom) => void
  onDelete?: (item: ItemWithRoom) => void
}

export function ImageGallery({ items, onEdit, onDelete }: ImageGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<ItemWithRoom | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const handleImageError = (itemId: string) => {
    setImageErrors(prev => new Set(prev).add(itemId))
  }

  const formatValue = (value: number | null) => {
    if (!value) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date))
  }

  // Filter items that have photos or show placeholders for all
  const displayItems = items

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Camera className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Found</h3>
        <p className="text-gray-500">Add some items to see them in the gallery.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {displayItems.map((item) => {
          const hasImage = item.photoUrl && !imageErrors.has(item.id)
          
          return (
            <Card 
              key={item.id} 
              className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => setSelectedItem(item)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  {hasImage ? (
                    <Image
                      src={item.photoUrl!}
                      alt={item.name}
                      fill
                      className="object-cover"
                      onError={() => handleImageError(item.id)}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <div className="p-2 rounded-full bg-white/80 mb-1">
                        <Camera className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium">No photo</span>
                    </div>
                  )}
                  
                  {/* Overlay with item info */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex flex-col justify-end p-3">
                    <div className="transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                      <h3 className="text-white font-medium text-sm truncate mb-1">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant="secondary" 
                          className="text-xs opacity-90"
                          style={{ 
                            backgroundColor: `${item.room.color}`,
                            color: 'white'
                          }}
                        >
                          {item.room.name}
                        </Badge>
                        {item.quantity > 1 && (
                          <Badge variant="outline" className="text-xs text-white border-white">
                            {item.quantity}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detailed View Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl mb-2">{selectedItem.name}</DialogTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        style={{ 
                          backgroundColor: `${selectedItem.room.color}15`,
                          color: selectedItem.room.color,
                          borderColor: `${selectedItem.room.color}30`
                        }}
                      >
                        {selectedItem.room.name}
                      </Badge>
                      {selectedItem.category && (
                        <Badge variant="outline">
                          {selectedItem.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {(onEdit || onDelete) && (
                    <div className="flex gap-2">
                      {onEdit && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            onEdit(selectedItem)
                            setSelectedItem(null)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            onDelete(selectedItem)
                            setSelectedItem(null)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </DialogHeader>

              {/* Image */}
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                {selectedItem.photoUrl && !imageErrors.has(selectedItem.id) ? (
                  <Image
                    src={selectedItem.photoUrl}
                    alt={selectedItem.name}
                    fill
                    className="object-cover"
                    onError={() => handleImageError(selectedItem.id)}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <div className="p-4 rounded-full bg-white/80 mb-2">
                      <Camera className="h-12 w-12" />
                    </div>
                    <span className="font-medium">No photo available</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-gray-600">{selectedItem.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">Quantity: {selectedItem.quantity}</span>
                  </div>

                  {selectedItem.value && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>Value: {formatValue(selectedItem.value)}</span>
                    </div>
                  )}

                  {selectedItem.condition && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Condition:</span>
                      <Badge variant="outline">{selectedItem.condition}</Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedItem.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>Location: {selectedItem.location}</span>
                    </div>
                  )}

                  {selectedItem.serialNumber && (
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <span className="font-mono text-sm">S/N: {selectedItem.serialNumber}</span>
                    </div>
                  )}

                  {selectedItem.purchaseDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Purchased: {formatDate(selectedItem.purchaseDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedItem.notes && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium mb-2">Notes</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedItem.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
