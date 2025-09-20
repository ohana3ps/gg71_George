
'use client'

import { Item, Room } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  MapPin, 
  DollarSign, 
  Package, 
  Calendar,
  Hash,
  ImageIcon,
  Camera,
  Utensils,
  AlertTriangle,
  LogOut,
  LogIn
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useState } from 'react'
import Image from 'next/image'

interface ItemWithRoom extends Item {
  room: {
    id: string
    name: string
    color: string
  }
}

interface ItemCardProps {
  item: ItemWithRoom
  onEdit: (item: ItemWithRoom) => void
  onDelete: (item: ItemWithRoom) => void
  onCheckout?: (item: ItemWithRoom) => void
  onReturn?: (item: ItemWithRoom) => void
}

export function ItemCard({ item, onEdit, onDelete, onCheckout, onReturn }: ItemCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

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

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{item.name}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{ 
                  backgroundColor: `${item.room.color}15`,
                  color: item.room.color,
                  borderColor: `${item.room.color}30`
                }}
              >
                {item.room.name}
              </Badge>
              {item.category && (
                <Badge variant="outline" className="text-xs">
                  {item.category}
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Item
              </DropdownMenuItem>
              
              {/* Checkout/Return Actions */}
              {item.status === 'AVAILABLE' && onCheckout && (
                <DropdownMenuItem onClick={() => onCheckout(item)}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Check Out
                </DropdownMenuItem>
              )}
              
              {item.status === 'CHECKED_OUT' && onReturn && (
                <DropdownMenuItem onClick={() => onReturn(item)}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Return Item
                </DropdownMenuItem>
              )}
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Item
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Item</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{item.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDelete(item)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Image */}
        <div className="relative w-full aspect-video mb-4 rounded-md overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          {item.photoUrl && !imageError ? (
            <>
              <Image
                src={item.photoUrl}
                alt={item.name}
                fill
                className="object-cover transition-opacity duration-300"
                onError={() => setImageError(true)}
                onLoad={() => setImageLoading(false)}
                style={{ opacity: imageLoading ? 0 : 1 }}
              />
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <div className="p-3 rounded-full bg-white/80 mb-2">
                <Camera className="h-8 w-8" />
              </div>
              <span className="text-xs font-medium">No photo</span>
            </div>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Item Details Grid */}
        <div className="space-y-2 text-sm">
          {/* Quantity */}
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400" />
            <span className="font-medium">Qty: {item.quantity}</span>
            {item.condition && (
              <Badge variant="outline" className="text-xs ml-auto">
                {item.condition}
              </Badge>
            )}
          </div>

          {/* Value */}
          {item.value && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span>{formatValue(item.value)}</span>
            </div>
          )}

          {/* Location */}
          {item.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="truncate">{item.location}</span>
            </div>
          )}

          {/* Serial Number */}
          {item.serialNumber && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-mono truncate">{item.serialNumber}</span>
            </div>
          )}

          {/* Purchase Date */}
          {item.purchaseDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs">{formatDate(item.purchaseDate)}</span>
            </div>
          )}

          {/* Food-specific information */}
          {(item as any).isFood && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="h-4 w-4 text-green-500" />
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Food Item
                </Badge>
                {(item as any).foodCategory && (
                  <Badge variant="outline" className="text-xs">
                    {(item as any).foodCategory}
                  </Badge>
                )}
              </div>
              
              {/* Expiration Date */}
              {(item as any).expirationDate && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const expirationDate = new Date((item as any).expirationDate)
                    const today = new Date()
                    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    const isExpiringSoon = daysUntilExpiration <= 7 && daysUntilExpiration >= 0
                    const isExpired = daysUntilExpiration < 0
                    
                    return (
                      <>
                        {isExpired || isExpiringSoon ? (
                          <AlertTriangle className={`h-4 w-4 ${isExpired ? 'text-red-500' : 'text-orange-500'}`} />
                        ) : (
                          <Calendar className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-xs ${
                          isExpired ? 'text-red-600 font-medium' : 
                          isExpiringSoon ? 'text-orange-600 font-medium' : 
                          'text-gray-600'
                        }`}>
                          Expires: {formatDate(expirationDate)}
                          {isExpired && ' (Expired)'}
                          {isExpiringSoon && !isExpired && ` (${daysUntilExpiration} days left)`}
                        </span>
                      </>
                    )
                  })()}
                </div>
              )}
              
              {/* Food Unit */}
              {(item as any).foodUnit && (
                <div className="flex items-center gap-2 mt-1">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-600">
                    Unit: {(item as any).foodUnit}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 line-clamp-2">
                {item.notes}
              </p>
            </div>
          )}

          {/* Enhanced Audit Information */}
          <div className="pt-2 border-t border-gray-50 space-y-1">
            {/* Created By */}
            {(item as any).createdBy && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Added by:</span>
                <span className="text-xs text-gray-600 font-medium">
                  {(item as any).createdBy.split('@')[0]}
                </span>
              </div>
            )}
            
            {/* Created Date */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Added on:</span>
              <span className="text-xs text-gray-600">
                {formatDate(item.createdAt)}
              </span>
            </div>

            {/* Checkout Status */}
            {item.checkedOutBy && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Checked out by:</span>
                <span className="text-xs text-orange-600 font-medium">
                  {item.checkedOutBy.split('@')[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
