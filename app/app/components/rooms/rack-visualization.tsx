
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
  Settings,
  Sliders,
  MoreVertical,
  Plus,
  Package,
  Grid3X3
} from 'lucide-react'

interface Position {
  id: string
  shelfNumber: number
  positionNumber: number
  capacity: number
  boxPositions: BoxPosition[]
  looseItems?: Item[]
  virtualContainer?: VirtualContainer
}

interface BoxPosition {
  box: Box
}

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

interface VirtualContainer {
  id: string
  name: string
  description?: string
  category?: string
  items: Item[]
  itemCount: number
}

interface Rack {
  id: string
  name: string
  rackNumber: number
  maxShelves: number
  positionsPerShelf: number
  shelfConfig?: any[]
  configLocked?: boolean
  positions: Position[]
}

interface RackVisualizationProps {
  rack: Rack
  isCollapsed: boolean
  onToggleCollapse: () => void
  onConfigureRack: () => void
  onConfigureCapacity: () => void
  onShelfSpaceClick: (shelfNumber: number, positionNumber: number) => void
  onAddItemToShelf: (rackId: string, rackName: string, rackNumber: number, shelfNumber: number, positionNumber: number) => void
}

export const RackVisualization = ({
  rack,
  isCollapsed,
  onToggleCollapse,
  onConfigureRack,
  onConfigureCapacity,
  onShelfSpaceClick,
  onAddItemToShelf
}: RackVisualizationProps) => {
  // Position utility functions
  const getPositionOccupancy = (position: Position) => {
    const boxCount = position.boxPositions?.length || 0
    const looseCount = position.looseItems?.length || 0
    const virtualCount = position.virtualContainer ? 1 : 0
    
    return {
      boxes: boxCount,
      looseItems: looseCount,
      virtualContainer: virtualCount,
      total: boxCount,
      capacity: position.capacity || 1,
      hasSpace: boxCount < (position.capacity || 1)
    }
  }

  const getPositionDisplayText = (position: Position) => {
    const occupancy = getPositionOccupancy(position)
    const looseCount = occupancy.looseItems
    const virtualCount = occupancy.virtualContainer
    
    if (occupancy.total === 0 && looseCount === 0 && virtualCount === 0) {
      return { text: '', isEmpty: true }
    }
    
    if (occupancy.total >= occupancy.capacity && looseCount === 0 && virtualCount === 0) {
      return { text: '', isFull: true }
    }
    
    let displayText = `${occupancy.total}/${occupancy.capacity}`
    if (looseCount > 0) {
      displayText += `+${looseCount}`
    }
    if (virtualCount > 0) {
      displayText += `📁`
    }
    
    return { text: displayText, isPartial: true }
  }

  const getPositionIcon = (position: Position) => {
    const display = getPositionDisplayText(position)
    
    if (display.isEmpty) {
      return { icon: '⬜', color: 'text-gray-300', bg: 'bg-gray-50' }
    } else if (display.isFull) {
      return { icon: '🟦', color: 'text-blue-600', bg: 'bg-blue-100' }
    } else {
      return { icon: '📦', color: 'text-amber-600', bg: 'bg-amber-100' }
    }
  }

  const getTotalRackItems = () => {
    return rack.positions?.reduce((total, pos) => {
      const boxItems = pos.boxPositions?.reduce((boxTotal, bp) => 
        boxTotal + (bp.box.items?.length || bp.box._count?.items || 0), 0) || 0
      const looseItems = pos.looseItems?.length || 0
      const virtualItems = pos.virtualContainer?.itemCount || 0
      return total + boxItems + looseItems + virtualItems
    }, 0) || 0
  }

  const getTotalRackBoxes = () => {
    return rack.positions?.reduce((total, pos) => 
      total + (pos.boxPositions?.length || 0), 0) || 0
  }

  return (
    <Card className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Grid3X3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-blue-800 flex items-center space-x-2">
                <span>{rack.name}</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  Rack #{rack.rackNumber}
                </Badge>
              </CardTitle>
              <p className="text-sm text-blue-600">
                {getTotalRackItems()} items • {getTotalRackBoxes()} boxes • {rack.maxShelves} shelves
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onConfigureRack}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Rack
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onConfigureCapacity}>
                  <Sliders className="mr-2 h-4 w-4" />
                  Position Capacities
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="hover:bg-blue-100"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          <div className="space-y-6">
            {Array.from({ length: rack.maxShelves }, (_, shelfIndex) => {
              const shelfNumber = shelfIndex + 1
              const shelfPositions = rack.positions?.filter(p => p.shelfNumber === shelfNumber) || []
              
              return (
                <div key={shelfIndex} className="bg-white rounded-lg border border-blue-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-blue-800">
                      Shelf {shelfNumber}
                    </h3>
                    <div className="text-sm text-blue-600">
                      {shelfPositions.reduce((total, pos) => {
                        const occupancy = getPositionOccupancy(pos)
                        return total + occupancy.boxes + occupancy.looseItems + occupancy.virtualContainer
                      }, 0)} items
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-3">
                    {Array.from({ length: rack.positionsPerShelf || 6 }, (_, posIndex) => {
                      const positionNumber = posIndex + 1
                      const position = shelfPositions.find(p => p.positionNumber === positionNumber)
                      const display = position ? getPositionDisplayText(position) : { text: '', isEmpty: true }
                      const posIcon = position ? getPositionIcon(position) : { icon: '⬜', color: 'text-gray-300', bg: 'bg-gray-50' }

                      return (
                        <div key={posIndex} className="text-center">
                          <div className="text-xs text-gray-500 mb-2 font-medium">
                            P{positionNumber}
                          </div>
                          
                          <button
                            onClick={() => onShelfSpaceClick(shelfNumber, positionNumber)}
                            className={`
                              w-full h-16 rounded-lg border-2 transition-all duration-200 
                              hover:shadow-md hover:scale-105 cursor-pointer
                              ${posIcon.bg} ${posIcon.color}
                              ${display.isEmpty ? 'border-dashed border-gray-300 hover:border-blue-400' : 'border-solid border-blue-300 hover:border-blue-500'}
                            `}
                            title={`Shelf ${shelfNumber}, Position ${positionNumber}${position ? ` (${display.text || 'occupied'})` : ' (empty)'}`}
                          >
                            <div className="flex flex-col items-center justify-center h-full space-y-1">
                              <span className="text-lg">{posIcon.icon}</span>
                              {display.text && (
                                <span className="text-xs font-medium">
                                  {display.text}
                                </span>
                              )}
                            </div>
                          </button>

                          {display.isEmpty && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddItemToShelf(rack.id, rack.name, rack.rackNumber, shelfNumber, positionNumber)}
                              className="mt-1 h-6 w-full text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
