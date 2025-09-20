
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Package, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Box {
  id: string
  boxNumber: number
  name?: string
  size: string
  type: string
}

interface Rack {
  id: string
  name: string
  rackNumber: number
  maxShelves: number
  positionsPerShelf: number
  positions: Position[]
}

interface Position {
  id: string
  shelfNumber: number
  positionNumber: number
  capacity: number // New multi-capacity support
  boxPositions: BoxPosition[]
  looseItems?: any[] // For future loose items support
  virtualContainer?: any // For future virtual container support
}

interface BoxPosition {
  box: {
    id: string
    boxNumber: number
    name?: string
    size: string
  }
}

interface BoxPlacementDialogProps {
  box: Box | null
  isOpen: boolean
  onClose: () => void
  onPlacementComplete: () => void
  roomId: string
}

export function BoxPlacementDialog({
  box,
  isOpen,
  onClose,
  onPlacementComplete,
  roomId
}: BoxPlacementDialogProps) {
  const [racks, setRacks] = useState<Rack[]>([])
  const [selectedRackId, setSelectedRackId] = useState<string>('')
  const [selectedShelf, setSelectedShelf] = useState<number | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (isOpen && roomId) {
      fetchRacks()
    }
  }, [isOpen, roomId])

  useEffect(() => {
    // Reset selections when dialog opens or box changes
    if (isOpen) {
      setSelectedRackId('')
      setSelectedShelf(null)
      setSelectedPosition(null)
    }
  }, [isOpen, box?.id])

  const fetchRacks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/racks?roomId=${roomId}`)
      if (response.ok) {
        const racksData = await response.json()
        setRacks(racksData)
      }
    } catch (error) {
      console.error('Error fetching racks:', error)
      toast.error('Failed to load racks')
    } finally {
      setLoading(false)
    }
  }

  const selectedRack = racks.find(rack => rack.id === selectedRackId)

  const getAvailablePositions = (shelfNumber: number) => {
    if (!selectedRack) return []
    
    const positions = []
    for (let i = 1; i <= selectedRack.positionsPerShelf; i++) {
      const position = selectedRack.positions.find(
        p => p.shelfNumber === shelfNumber && p.positionNumber === i
      ) || {
        id: `temp-${selectedRack.id}-${shelfNumber}-${i}`,
        shelfNumber,
        positionNumber: i,
        capacity: 4, // Default capacity allows stacking 4 boxes (2 front + 2 back)
        boxPositions: []
      }
      
      const currentBoxCount = position.boxPositions?.length || 0
      const capacity = position.capacity || 4
      const hasSpace = currentBoxCount < capacity
      const occupyingBoxes = position.boxPositions?.map(bp => bp.box) || []
      
      positions.push({
        number: i,
        currentBoxCount,
        capacity,
        hasSpace,
        isOccupied: currentBoxCount > 0,
        isFull: currentBoxCount >= capacity,
        occupyingBoxes,
        occupyingBox: occupyingBoxes[0] // For backward compatibility
      })
    }
    return positions
  }

  const handlePlaceBox = async () => {
    if (!box || !selectedRackId || selectedShelf === null || selectedPosition === null) {
      return
    }

    try {
      setPlacing(true)
      
      const response = await fetch(`/api/boxes/${box.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          rackId: selectedRackId,
          shelfNumber: selectedShelf,
          positionNumber: selectedPosition
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to place box')
      }

      toast.success(`Box ${box.boxNumber} placed successfully!`)
      onPlacementComplete()
      onClose()
      
    } catch (error) {
      console.error('Error placing box:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to place box'
      toast.error(errorMessage)
    } finally {
      setPlacing(false)
    }
  }

  const getSizeInfo = (size: string) => {
    switch (size) {
      case 'S': return { label: 'Small', positions: '1 position' }
      case 'L': return { label: 'Large', positions: '2-3 positions' }
      case 'XL': return { label: 'Extra Large', positions: '4+ positions' }
      default: return { label: size, positions: 'Unknown size' }
    }
  }

  if (!box) return null

  const sizeInfo = getSizeInfo(box.size)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Place Box on Rack
          </DialogTitle>
          <DialogDescription>
            Choose a rack, shelf, and position for Box {box.boxNumber}
            {box.name && ` (${box.name})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Box Information */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Box {box.boxNumber}</div>
                  {box.name && <div className="text-sm text-gray-600">{box.name}</div>}
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-white">
                    {sizeInfo.label} ({sizeInfo.positions})
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading racks...
            </div>
          ) : racks.length === 0 ? (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4 text-center">
                <Package className="h-12 w-12 text-orange-400 mx-auto mb-2" />
                <p className="text-orange-800 font-medium">No racks available</p>
                <p className="text-orange-600 text-sm">Create a rack first to place boxes</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Rack Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Rack</label>
                <Select value={selectedRackId} onValueChange={setSelectedRackId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a rack" />
                  </SelectTrigger>
                  <SelectContent>
                    {racks.map((rack) => (
                      <SelectItem key={rack.id} value={rack.id}>
                        Rack {rack.rackNumber} - {rack.name} ({rack.maxShelves} shelves, {rack.positionsPerShelf} positions each)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shelf Selection */}
              {selectedRack && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Shelf</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {Array.from({ length: selectedRack.maxShelves }, (_, i) => i + 1).map((shelfNum) => {
                      return (
                        <Button
                          key={shelfNum}
                          variant={selectedShelf === shelfNum ? "default" : "outline"}
                          onClick={() => {
                            setSelectedShelf(shelfNum)
                            setSelectedPosition(null)
                          }}
                          className="h-auto py-2 px-3"
                        >
                          <div className="text-center">
                            <div className="font-medium">Shelf {shelfNum}</div>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Position Selection */}
              {selectedRack && selectedShelf !== null && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Position on Shelf {selectedShelf}</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {getAvailablePositions(selectedShelf).map((pos) => {
                      const getPositionDisplay = () => {
                        if (pos.currentBoxCount === 0) {
                          return { text: 'open', color: 'text-green-600' }
                        } else if (pos.currentBoxCount >= pos.capacity) {
                          return { text: 'full', color: 'text-red-600' }
                        } else {
                          return { text: `${pos.currentBoxCount}/${pos.capacity}`, color: 'text-blue-600' }
                        }
                      }
                      
                      const display = getPositionDisplay()
                      
                      return (
                        <Button
                          key={pos.number}
                          variant={selectedPosition === pos.number ? "default" : pos.hasSpace ? "outline" : "secondary"}
                          onClick={() => pos.hasSpace && setSelectedPosition(pos.number)}
                          disabled={!pos.hasSpace}
                          className="h-auto py-2 px-2 relative"
                        >
                          <div className="text-center w-full">
                            <div className="font-medium">P{pos.number}</div>
                            <div className={`text-xs font-medium ${display.color}`}>
                              {display.text}
                            </div>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    "open" = Empty position, "1/4" = Boxes stacked/Total capacity, "full" = No space for more boxes
                  </p>
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={placing}>
              Cancel
            </Button>
            <Button
              onClick={handlePlaceBox}
              disabled={!selectedRackId || selectedShelf === null || selectedPosition === null || placing}
            >
              {placing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Place Box
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
