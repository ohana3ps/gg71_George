

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Package, Users, Plus, Settings, ArrowRight, Box } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Rack {
  id: string
  name: string
  rackNumber: number
  maxShelves: number
  positionsPerShelf: number
}

interface Position {
  id: string
  shelfNumber: number
  positionNumber: number
  capacity: number
  boxPositions: BoxPosition[]
}

interface BoxPosition {
  box: Box
}

interface Box {
  id: string
  boxNumber: number
  name?: string
  size: string
  type: string
  itemCount?: number
}

interface ShelfSpaceDialogProps {
  isOpen: boolean
  onClose: () => void
  shelfSpace: {
    rack: Rack
    shelfNumber: number
    positionNumber: number
    position?: Position
  } | null
  onAddItem?: () => void
  onManagePosition?: (positionId: string) => void
  onMoveAllToStaging?: (positionId: string) => void
  onViewBoxContents?: (boxId: string) => void
}

export function ShelfSpaceDialog({ 
  isOpen, 
  onClose, 
  shelfSpace, 
  onAddItem, 
  onManagePosition, 
  onMoveAllToStaging, 
  onViewBoxContents 
}: ShelfSpaceDialogProps) {
  const [loading, setLoading] = useState(false)

  if (!shelfSpace) return null

  const { rack, shelfNumber, positionNumber, position } = shelfSpace
  const boxes = position?.boxPositions?.map(bp => bp.box) || []
  const hasContent = boxes.length > 0
  const isMultipleItems = boxes.length > 1

  const handleViewAllContents = async () => {
    if (!hasContent) return
    
    try {
      setLoading(true)
      // Show all boxes' contents in current view (scroll to them or expand all)
      toast.success(`Viewing all ${boxes.length} items in this position`)
      
      // For now, we'll expand the current view to show all contents
      // This could be enhanced to open a separate detailed view
    } catch (error) {
      toast.error('Failed to view contents')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItems = () => {
    if (onAddItem) {
      onAddItem()
      onClose()
    } else {
      toast.error('Add item functionality not available')
    }
  }

  const handleManageSpace = () => {
    if (onManagePosition && position) {
      onManagePosition(position.id)
      onClose()
    } else {
      toast.error('Position management not available')
    }
  }

  const handleMoveAllToStaging = async () => {
    if (!hasContent || !position) return
    
    if (onMoveAllToStaging) {
      try {
        setLoading(true)
        onMoveAllToStaging(position.id)
        toast.success(`Moving ${boxes.length} boxes to staging...`)
        onClose()
      } catch (error) {
        toast.error('Failed to move boxes')
      } finally {
        setLoading(false)
      }
    } else {
      toast.error('Move functionality not available')
    }
  }

  const handleViewBoxContents = (box: Box) => {
    if (onViewBoxContents) {
      onViewBoxContents(box.id)
      onClose()
    } else {
      toast.error('Box contents view not available')
    }
  }

  // Get space status for display
  const getSpaceStatus = () => {
    if (boxes.length === 0) return { status: 'Empty', color: 'bg-gray-100 text-gray-600' }
    if (boxes.length === 1) return { status: 'Occupied', color: 'bg-blue-100 text-blue-700' }
    return { status: 'Multiple Items', color: 'bg-green-100 text-green-700' }
  }

  const spaceStatus = getSpaceStatus()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Shelf Space Details
          </DialogTitle>
          <DialogDescription>
            {rack.name} - Shelf {shelfNumber}, Position {positionNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location Information */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Rack {rack.rackNumber} - {rack.name}</div>
                  <div className="text-sm text-gray-600">Shelf {shelfNumber}, Position {positionNumber}</div>
                  {position && (
                    <div className="text-sm text-blue-700 font-medium mt-1">
                      Space Allocated as: {boxes.length}/{position.capacity}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className={`${spaceStatus.color} border-current`}>
                  {spaceStatus.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Current Contents */}
          {hasContent ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Package className="h-4 w-4 mr-2" />
                  Current Contents ({boxes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {boxes.map((box, index) => (
                  <div
                    key={box.id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors border border-transparent hover:border-blue-200"
                    onClick={() => handleViewBoxContents(box)}
                  >
                    <div className="flex items-center">
                      <Box className="h-4 w-4 mr-2 text-blue-600" />
                      <div>
                        <div className="font-medium text-sm">Box {box.boxNumber}</div>
                        {box.name && (
                          <div className="text-xs text-gray-600">{box.name}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Badge variant="outline" className="mr-2">
                        {box.size}
                      </Badge>
                      {box.itemCount && (
                        <span className="mr-2">{box.itemCount} items</span>
                      )}
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                ))}
                
                {/* Tap to view instruction */}
                <div className="text-xs text-gray-500 text-center pt-2 border-t">
                  💡 Tap any item above to view its contents
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="pt-4 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Empty Space</p>
                <p className="text-gray-500 text-sm">This position is available for placement</p>
              </CardContent>
            </Card>
          )}

          {/* Shelf Space Actions */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-600 text-center border-t pt-3">
              Shelf Space Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleViewAllContents}
                disabled={!hasContent || loading}
                className="flex items-center justify-center"
              >
                <Package className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">View All</span>
                <span className="sm:hidden">View</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAddItems}
                disabled={loading}
                className="flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add</span>
                <span className="sm:hidden">Add</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleManageSpace}
                disabled={loading}
                className="flex items-center justify-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Manage</span>
                <span className="sm:hidden">Manage</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleMoveAllToStaging}
                disabled={!hasContent || loading}
                className="flex items-center justify-center"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Move All to Staging</span>
                <span className="sm:hidden">Staging</span>
              </Button>
            </div>
          </div>

          {/* Position Stats */}
          {hasContent && (
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg text-center">
              <strong>Position Stats:</strong> {boxes.length} box{boxes.length !== 1 ? 'es' : ''} • {boxes.reduce((acc, box) => acc + (box.itemCount || 0), 0)} total items
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

