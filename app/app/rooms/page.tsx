
'use client'

import { useEffect, useState, useRef } from 'react'
import { Room } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RoomCard } from '@/components/rooms/room-card'
import { RoomForm } from '@/components/rooms/room-form'
import { Plus, Home, ArrowLeft, Search, MoreHorizontal, User, Trash2, Edit } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function RoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set())
  const mountedRef = useRef(true)

  // Fetch rooms with better error handling
  const fetchRooms = async () => {
    try {
      setError(null)
      const response = await fetch('/api/rooms', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rooms: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Ensure data is an array and component is still mounted
      if (!mountedRef.current) return
      
      if (Array.isArray(data)) {
        setRooms(data)
      } else {
        console.error('Invalid data format received:', data)
        setRooms([])
        toast.error('Invalid data format received from server')
      }
    } catch (error) {
      if (!mountedRef.current) return
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      toast.error('Error loading rooms')
      console.error('Error fetching rooms:', error)
      setRooms([])
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  // Create room with better error handling
  const handleCreateRoom = async (data: { name: string; description: string; color: string }) => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Failed to create room: ${response.status}`)
      }

      const newRoom = await response.json()
      
      // Validate the response
      if (!newRoom || !newRoom.id) {
        throw new Error('Invalid response from server')
      }

      setRooms(prev => [newRoom, ...prev])
      setIsFormOpen(false)
      toast.success('Room created successfully!')
      
      // Navigate directly to the new room
      router.push(`/rooms/${newRoom.id}`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error creating room:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update room
  const handleUpdateRoom = async (data: { name: string; description: string; color: string }) => {
    if (!editingRoom) return
    
    console.log('Updating room with data:', { 
      roomId: editingRoom.id, 
      data,
      editingRoom: { id: editingRoom.id, name: editingRoom.name, color: editingRoom.color }
    })
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const updatedRoom = await response.json()
        console.log('Room update response:', { updatedRoom })
        setRooms(prev => prev.map(room => 
          room.id === updatedRoom.id ? updatedRoom : room
        ))
        setEditingRoom(null)
        setIsFormOpen(false)
        toast.success('Room updated successfully!')
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || 'Failed to update room'
        toast.error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating room'
      toast.error(errorMessage)
      console.error('Error updating room:', error)
    } finally {
      setIsSubmitting(false)
    }
  }



  // Selection handlers
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedRoomIds(new Set()) // Clear selections when toggling mode
  }

  const toggleRoomSelection = (roomId: string) => {
    const newSelected = new Set(selectedRoomIds)
    if (newSelected.has(roomId)) {
      newSelected.delete(roomId)
    } else {
      newSelected.add(roomId)
    }
    setSelectedRoomIds(newSelected)
  }

  const selectAllRooms = () => {
    const allRoomIds = new Set(rooms.map(room => room.id))
    setSelectedRoomIds(allRoomIds)
  }

  const clearSelection = () => {
    setSelectedRoomIds(new Set())
  }

  // Edit room handler
  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setIsFormOpen(true)
  }

  // Cancel form
  const handleCancelForm = () => {
    setIsFormOpen(false)
    setEditingRoom(null)
  }

  useEffect(() => {
    let isMounted = true
    
    const loadRooms = async () => {
      if (!isMounted) return
      
      try {
        await fetchRooms()
      } catch (error) {
        if (isMounted) {
          console.error('Error in useEffect fetchRooms:', error)
        }
      }
    }
    
    // Initial load
    loadRooms()
    
    // Refresh data when page becomes visible (fixes navigation back issue)
    const handleFocus = () => {
      if (isMounted && !isLoading) {
        loadRooms()
      }
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted && !isLoading) {
        loadRooms()
      }
    }
    
    // Add event listeners for page focus and visibility changes
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      isMounted = false
      mountedRef.current = false
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Clean Task-Focused Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Back button and title */}
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              {/* Search - Collapsible on mobile */}
              <div className="flex items-center">
                {isSearchExpanded ? (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search rooms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
                        autoFocus
                        onBlur={() => {
                          if (!searchQuery) {
                            setIsSearchExpanded(false)
                          }
                        }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsSearchExpanded(false)
                        setSearchQuery('')
                      }}
                      className="h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSearchExpanded(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Master Menu - New 3-dot menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => {
                    setEditingRoom(null)
                    setIsFormOpen(true)
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Room
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={toggleSelectionMode}>
                    <Search className="mr-2 h-4 w-4" />
                    {isSelectionMode ? 'Exit Selection' : 'Select Rooms'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Profile/User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Page Title and Description */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-2">
          <Home className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">My Rooms</h1>
        </div>
        <p className="text-gray-600 mb-6">
          Manage your garage rooms and spaces. Each room can contain multiple items and inventory.
        </p>

        {/* Selection Mode Banner */}
        {isSelectionMode && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Search className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900">Selection Mode</h3>
                  <p className="text-sm text-blue-700">
                    {selectedRoomIds.size > 0 
                      ? `${selectedRoomIds.size} room${selectedRoomIds.size !== 1 ? 's' : ''} selected`
                      : 'Tap rooms to select them'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Selection Controls */}
                {selectedRoomIds.size > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearSelection}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Clear
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllRooms}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Select All
                </Button>
                
                {/* Action Buttons - Show when rooms are selected */}
                {selectedRoomIds.size > 0 && (
                  <>
                    <div className="h-4 w-px bg-blue-300 mx-1"></div>
                    
                    {/* Delete Selected - Greyed until Phase 4 */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="opacity-50 cursor-not-allowed text-red-600 border-red-200"
                      onClick={(e) => {
                        e.preventDefault()
                        toast.error('🔒 Admin Feature - Contact admin')
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete ({selectedRoomIds.size})
                      <span className="ml-1 text-xs">🔒</span>
                    </Button>
                    
                    {/* Bulk Edit - Greyed until Phase 4 */}
                    <Button
                      variant="outline" 
                      size="sm"
                      className="opacity-50 cursor-not-allowed border-gray-300"
                      onClick={(e) => {
                        e.preventDefault()
                        toast.error('🔒 Admin Feature - Contact admin')
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit ({selectedRoomIds.size})
                      <span className="ml-1 text-xs">🔒</span>
                    </Button>
                  </>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleSelectionMode}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Exit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Room Button - Only show when there are existing rooms */}
        {rooms.length > 0 && (
          <div className="mb-6">
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingRoom(null)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <RoomForm
                  room={editingRoom}
                  onSubmit={editingRoom ? handleUpdateRoom : handleCreateRoom}
                  onCancel={handleCancelForm}
                  isLoading={isSubmitting}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Rooms Grid */}
        {rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onEdit={handleEditRoom}
                isSelectionMode={isSelectionMode}
                isSelected={selectedRoomIds.has(room.id)}
                onToggleSelection={toggleRoomSelection}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle className="text-gray-500">No Rooms Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">
                Create your first room to start organizing your garage inventory.
              </p>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingRoom(null)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Room
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <RoomForm
                    room={editingRoom}
                    onSubmit={editingRoom ? handleUpdateRoom : handleCreateRoom}
                    onCancel={handleCancelForm}
                    isLoading={isSubmitting}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
