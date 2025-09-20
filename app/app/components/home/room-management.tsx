
'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { RoomForm } from '@/components/rooms/room-form'
import { RoomCard } from '@/components/rooms/room-card'
import { Plus, Grid3X3, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Room {
  id: string
  name: string
  description: string | null
  color: string
  userId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  deletedBy: string | null
  modifiedBy: string | null
  _count?: {
    items: number
    racks: number
  }
}

interface RoomManagementProps {
  rooms: Room[]
  loading: boolean
  isRefreshing: boolean
  onRefresh: () => Promise<void>
  onTrackRoomVisit: (room: Room) => void
}

// Helper function to get room activity status
const getRoomActivityStyle = (itemCount: number, rackCount = 0) => {
  if (itemCount === 0) {
    if (rackCount > 0) {
      return {
        level: 'ready',
        badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
        badgeText: 'Ready',
        statusIcon: 'bg-blue-400',
        textStyle: 'text-blue-600',
        countStyle: 'text-blue-500 font-normal'
      }
    }
    return {
      level: 'empty',
      badgeStyle: 'bg-gray-100 text-gray-500 border-gray-200',
      badgeText: 'Empty',
      statusIcon: 'bg-gray-300',
      textStyle: 'text-gray-500',
      countStyle: 'text-gray-400 font-normal'
    }
  } else if (itemCount <= 3) {
    return {
      level: 'low',
      badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeText: 'Light Use',
      statusIcon: 'bg-amber-400 animate-pulse',
      textStyle: 'text-gray-600',
      countStyle: 'text-amber-600 font-medium'
    }
  } else {
    return {
      level: 'active',
      badgeStyle: 'bg-green-100 text-green-800 border-green-300',
      badgeText: 'Active',
      statusIcon: 'bg-green-500 animate-pulse shadow-sm',
      textStyle: 'text-gray-700',
      countStyle: 'text-green-700 font-bold'
    }
  }
}

export function RoomManagement({ 
  rooms, 
  loading, 
  isRefreshing, 
  onRefresh, 
  onTrackRoomVisit 
}: RoomManagementProps) {
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false)
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  // Fetch rooms function
  const fetchRooms = useCallback(async (bustCache = false) => {
    try {
      const url = bustCache 
        ? `/api/rooms?_t=${Date.now()}` 
        : '/api/rooms'
      
      const response = await fetch(url, {
        cache: bustCache ? 'no-store' : 'default',
        headers: bustCache ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } : {}
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const fetchedRooms = await response.json()
      return fetchedRooms
    } catch (error) {
      console.error('Error fetching rooms:', error)
      toast.error('Failed to load rooms')
      return []
    }
  }, [])

  // Handle room creation/editing
  const handleRoomSubmit = async (data: any) => {
    setIsSubmittingRoom(true)
    try {
      const url = editingRoom ? `/api/rooms/${editingRoom.id}` : '/api/rooms'
      const method = editingRoom ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save room')
      }

      const savedRoom = await response.json()
      
      toast.success(editingRoom ? 'Room updated successfully!' : 'Room created successfully!')
      setIsRoomFormOpen(false)
      setEditingRoom(null)
      
      // Refresh rooms list
      await onRefresh()
    } catch (error) {
      console.error('Error saving room:', error)
      toast.error('Failed to save room')
    } finally {
      setIsSubmittingRoom(false)
    }
  }

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setIsRoomFormOpen(true)
  }

  const handleCancelRoomForm = () => {
    setIsRoomFormOpen(false)
    setEditingRoom(null)
  }

  // Room statistics
  const roomStats = {
    total: rooms.length,
    active: rooms.filter(room => (room._count?.items || 0) > 3).length,
    ready: rooms.filter(room => {
      const itemCount = room._count?.items || 0
      const rackCount = room._count?.racks || 0
      return itemCount === 0 && rackCount > 0
    }).length,
    empty: rooms.filter(room => {
      const itemCount = room._count?.items || 0
      const rackCount = room._count?.racks || 0
      return itemCount === 0 && rackCount === 0
    }).length,
    totalItems: rooms.reduce((sum, room) => sum + (room._count?.items || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Loading your garage...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Room Navigation Header - UPDATED PER CLIENT SPECS */}
      <div className="flex flex-col items-center space-y-4">
        {/* Centered Section Title */}
        <div className="flex items-center justify-center w-full">
          <h2 className="text-lg font-semibold text-center">Manage Rooms</h2>
        </div>
        
        {/* Controls Row */}
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-gray-600 hover:text-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        
          {/* Quick Stats */}
          <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{roomStats.active} Active</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>{roomStats.ready} Ready</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>{roomStats.empty} Empty</span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="font-medium">{roomStats.totalItems} total items</span>
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      {rooms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Grid3X3 className="h-12 w-12 text-gray-400 mb-4" />
            <CardTitle className="text-lg mb-2">No rooms yet</CardTitle>
            <CardDescription className="text-center mb-6">
              Create your first room to start organizing your garage inventory
            </CardDescription>
            
            <Dialog open={isRoomFormOpen} onOpenChange={setIsRoomFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Room
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <RoomForm
                  onSubmit={handleRoomSubmit}
                  onCancel={handleCancelRoomForm}
                  isLoading={isSubmittingRoom}
                  room={editingRoom}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Rooms Grid with Add Room Card - UPDATED PER CLIENT SPECS */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {rooms.map((room) => {
              const itemCount = room._count?.items || 0
              const rackCount = room._count?.racks || 0
              const activityStyle = getRoomActivityStyle(itemCount, rackCount)
              
              return (
                <RoomCard
                  key={room.id}
                  room={room}
                  itemCount={itemCount}
                  rackCount={rackCount}
                  activityStyle={activityStyle}
                  onEdit={handleEditRoom}
                  onVisit={onTrackRoomVisit}
                />
              )
            })}
            
            {/* Add Room Card - positioned as last card in grid */}
            <Dialog open={isRoomFormOpen} onOpenChange={setIsRoomFormOpen}>
              <DialogTrigger asChild>
                <Card className="border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer min-h-[120px] flex items-center justify-center">
                  <CardContent className="p-4 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <Plus className="h-4 w-4 text-gray-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Add Room</span>
                      <span className="text-xs text-gray-500">Create a new storage area</span>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <RoomForm
                  onSubmit={handleRoomSubmit}
                  onCancel={handleCancelRoomForm}
                  isLoading={isSubmittingRoom}
                  room={editingRoom}
                />
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
    </div>
  )
}
