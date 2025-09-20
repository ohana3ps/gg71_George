
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  ChevronUp, 
  ChevronDown, 
  Package, 
  Plus, 
  Filter,
  MoreVertical,
  Edit,
  MapPin,
  FolderOpen,
  Trash2
} from 'lucide-react'
import { BoxForm } from '@/components/boxes/box-form'
import { ScanItemButton } from '@/components/scanning'
import { toast } from 'react-hot-toast'

interface Box {
  id: string
  boxNumber: number
  name?: string
  description?: string
  size: string
  type: string
  isStaging: boolean
  roomId: string
  items?: Item[]
  _count?: {
    items: number
  }
}

interface Item {
  id: string
  name: string
  description?: string
  quantity: number
  value?: number
  condition?: string
  category?: string
  location?: string
  imageUrl?: string
}

interface StagingAreaProps {
  stagingBoxes: Box[]
  looseItems: Item[]
  roomId: string
  collapsed: boolean
  filter: 'all' | 'boxes' | 'items'
  onToggleCollapse: () => void
  onFilterChange: (filter: 'all' | 'boxes' | 'items') => void
  onEditBox: (box: Box) => void
  onPlaceBox: (box: Box) => void
  onViewBoxContents: (boxId: string) => void
  onItemsScannedForBox: (boxId: string, items: any[]) => void
  onMoveItemToBox: (itemId: string) => void
  onEditLooseItem: (itemId: string) => void
  onDeleteLooseItem: (itemId: string) => void
  onQuickAddToNewBox: (itemId: string) => void
  onAddBox: () => void
}

export const StagingArea = ({
  stagingBoxes,
  looseItems,
  roomId,
  collapsed,
  filter,
  onToggleCollapse,
  onFilterChange,
  onEditBox,
  onPlaceBox,
  onViewBoxContents,
  onItemsScannedForBox,
  onMoveItemToBox,
  onEditLooseItem,
  onDeleteLooseItem,
  onQuickAddToNewBox,
  onAddBox
}: StagingAreaProps) => {
  const getStagingItemCount = () => {
    const boxItems = stagingBoxes.reduce((total, box) => total + (box.items?.length || box._count?.items || 0), 0)
    return boxItems + looseItems.length
  }

  const getFilteredStagingContent = () => {
    switch (filter) {
      case 'boxes':
        return { boxes: stagingBoxes, items: [] }
      case 'items':
        return { boxes: [], items: looseItems }
      case 'all':
      default:
        return { boxes: stagingBoxes, items: looseItems }
    }
  }

  const filteredContent = getFilteredStagingContent()

  return (
    <Card className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-amber-800">
                Staging Area ({getStagingItemCount()} items)
              </CardTitle>
              <p className="text-sm text-amber-600">
                Items ready for placement or organization
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Filter Controls */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white">
                  <Filter className="h-4 w-4 mr-2" />
                  {filter === 'all' ? 'All' : filter === 'boxes' ? 'Boxes' : 'Items'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onFilterChange('all')}>
                  All Items & Boxes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('boxes')}>
                  Boxes Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('items')}>
                  Loose Items Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="hover:bg-amber-100"
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent>
          {/* Boxes Section */}
          {filteredContent.boxes.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-amber-800 mb-3 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Staging Boxes ({filteredContent.boxes.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContent.boxes.map((box) => {
                  const itemCount = box.items?.length || box._count?.items || 0
                  
                  return (
                    <Card key={box.id} className="bg-white border-amber-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                              Box {box.boxNumber}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {box.size} • {box.type}
                            </Badge>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditBox(box)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Box
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onPlaceBox(box)}>
                                <MapPin className="mr-2 h-4 w-4" />
                                Place on Rack
                              </DropdownMenuItem>
                              {itemCount > 0 && (
                                <DropdownMenuItem onClick={() => onViewBoxContents(box.id)}>
                                  <FolderOpen className="mr-2 h-4 w-4" />
                                  View Contents
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h3 className="font-medium text-gray-900 mb-1">
                          {box.name || `Box ${box.boxNumber}`}
                        </h3>
                        
                        {box.description && (
                          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                            {box.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </span>
                          
                          <ScanItemButton
                            onItemsScanned={(items) => onItemsScannedForBox(box.id, items)}
                            variant="outline"
                            size="sm"
                            className="bg-white border-amber-300 hover:bg-amber-50"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Loose Items Section */}
          {filteredContent.items.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-amber-800 mb-3 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Loose Items ({filteredContent.items.length})
              </h4>
              <div className="space-y-2">
                {filteredContent.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{item.name}</span>
                        {item.quantity > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            Qty: {item.quantity}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onMoveItemToBox(item.id)}>
                          <Package className="mr-2 h-4 w-4" />
                          Move to Box
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickAddToNewBox(item.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Quick Add to New Box
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditLooseItem(item.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteLooseItem(item.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredContent.boxes.length === 0 && filteredContent.items.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-amber-700 mb-2">
                No {filter === 'all' ? 'items' : filter} in staging area
              </h3>
              <p className="text-amber-600 mb-4">
                Add boxes or scan items to get started organizing
              </p>
              <Button
                onClick={onAddBox}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Box
              </Button>
            </div>
          )}

          {/* Add Box Button (when items exist) */}
          {(filteredContent.boxes.length > 0 || filteredContent.items.length > 0) && (
            <div className="pt-4 border-t border-amber-200">
              <Button
                onClick={onAddBox}
                variant="outline"
                className="w-full bg-white border-amber-300 hover:bg-amber-50 text-amber-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Box
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
