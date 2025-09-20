
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ArrowLeft, Settings, Package, Grid3X3, Layers } from 'lucide-react'
import EnhancedHeader from '@/components/enhanced-header'
import { RoomForm } from '@/components/rooms/room-form'
import RoomBreadcrumbNavigation from '@/components/room-breadcrumb-navigation'

interface Room {
  id: string
  name: string
  description?: string
  color?: string
}

interface RoomHeaderProps {
  room: Room
  totalItems: number
  placedBoxes: number
  stagingBoxCount: number
  onUpdateRoom: (data: { name: string; description: string; color: string }) => void
}

export const RoomHeader = ({ 
  room, 
  totalItems, 
  placedBoxes, 
  stagingBoxCount,
  onUpdateRoom 
}: RoomHeaderProps) => {
  const [isRoomEditOpen, setIsRoomEditOpen] = useState(false)

  const handleUpdateRoom = async (data: { name: string; description: string; color: string }) => {
    await onUpdateRoom(data)
    setIsRoomEditOpen(false)
  }

  const handleCancelRoomEdit = () => {
    setIsRoomEditOpen(false)
  }

  return (
    <>
      {/* Custom Room Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
              {room.description && (
                <p className="text-sm text-gray-500">{room.description}</p>
              )}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRoomEditOpen(true)}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Room Settings</span>
          </Button>
        </div>
      </div>

      <RoomBreadcrumbNavigation 
        items={[
          { label: 'Home', path: '/', icon: undefined },
          { label: room.name, path: `/rooms/${room.id}`, icon: undefined }
        ]}
      />
      
      {/* Room Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Total Items</span>
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{totalItems}</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Grid3X3 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Placed Boxes</span>
          </div>
          <div className="text-2xl font-bold text-green-900 mt-1">{placedBoxes}</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Staging Area</span>
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{stagingBoxCount}</div>
        </div>
      </div>

      {/* Room Edit Dialog */}
      <Dialog open={isRoomEditOpen} onOpenChange={setIsRoomEditOpen}>
        <DialogContent className="max-w-md">
          <RoomForm
            room={room as any}
            onSubmit={handleUpdateRoom}
            onCancel={handleCancelRoomEdit}
            isLoading={false}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
