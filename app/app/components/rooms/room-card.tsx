
'use client'

import { Room } from '@prisma/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreVertical, Edit, Package, Eye, Check, BarChart3, Trash2, AlertCircle } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
// Removed PermissionGate import - using shared household model

interface RoomCardProps {
  room: Room
  onEdit: (room: Room) => void
  onDelete?: () => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelection?: (roomId: string) => void
}

interface SafetyAnalysis {
  canDelete: boolean
  blockers: string[]
  warnings: string[]
  counts: {
    items: number
    boxes: number
    racks: number
    total: number
  }
  dependencies: {
    items: any[]
    boxes: any[]
    racks: any[]
  }
}

export function RoomCard({ room, onEdit, onDelete, isSelectionMode = false, isSelected = false, onToggleSelection }: RoomCardProps) {
  const [itemCount, setItemCount] = useState<number | null>(null)
  const [totalValue, setTotalValue] = useState<number>(0)
  
  // Delete functionality state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSafetyDialog, setShowSafetyDialog] = useState(false)
  const [safetyAnalysis, setSafetyAnalysis] = useState<SafetyAnalysis | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { data: session } = useSession()
  const router = useRouter()
  // In shared household model, all authenticated users can manage rooms

  // Fetch item count for this room
  useEffect(() => {
    const fetchItemCount = async () => {
      try {
        const response = await fetch(`/api/items?roomId=${room.id}`)
        if (response.ok) {
          const items = await response.json()
          setItemCount(items.length)
          const value = items.reduce((sum: number, item: any) => sum + (item.value || 0), 0)
          setTotalValue(value)
        }
      } catch (error) {
        console.error('Error fetching item count:', error)
        setItemCount(0)
      }
    }

    fetchItemCount()
  }, [room.id])

  // Handle card click for selection
  const handleCardClick = () => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection(room.id)
    }
  }

  // Delete functionality
  const handleDeleteRoom = async () => {
    console.log("🚀 handleDeleteRoom called for room:", room.name, room.id)
    // In shared household model, all authenticated users can delete rooms
    setIsDeleting(true)
    try {
      // Perform safety analysis first
      console.log("🔍 Fetching safety analysis for room:", room.id)
      const response = await fetch(`/api/rooms/${room.id}/safety-analysis`)
      console.log("📡 Safety analysis response:", response.status, response.ok)
      if (response.ok) {
        const analysis = await response.json()
        setSafetyAnalysis(analysis.safetyAnalysis)
        
        if (analysis.safetyAnalysis.canDelete) {
          // Room is empty - show confirmation dialog
          setShowDeleteDialog(true)
        } else {
          // Room is not empty - show safety dialog
          setShowSafetyDialog(true)
        }
      } else {
        toast.error('Failed to analyze room for deletion')
      }
    } catch (error) {
      console.error('Error analyzing room:', error)
      toast.error('Failed to analyze room for deletion')
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('✅ Room deleted successfully. Undo available for 30 days.')
        setShowDeleteDialog(false)
        setDeleteConfirmText('')
        if (onDelete) {
          onDelete()
        }
        // Refresh the page or update parent component
        router.refresh()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete room')
      }
    } catch (error) {
      console.error('Error deleting room:', error)
      toast.error('Failed to delete room')
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDelete = () => {
    setShowDeleteDialog(false)
    setShowSafetyDialog(false)
    setDeleteConfirmText('')
    setSafetyAnalysis(null)
  }

  // Helper function to create a visible background version of the room color
  const getLightBackgroundColor = (color: string) => {
    // Handle white/no color case
    if (color === '#FFFFFF') {
      return '#FFFFFF' // Pure white background
    }
    
    // Convert hex to rgb and add more visible transparency
    if (color.startsWith('#')) {
      // Convert hex to rgba with 10% opacity for subtle background
      const hex = color.slice(1)
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16) 
      const b = parseInt(hex.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, 0.10)`
    }
    // Fallback for other color formats
    return `${color}26` // 26 in hex = ~15% opacity
  }

  // Helper function to get border color
  const getBorderColor = (color: string) => {
    if (color === '#FFFFFF') {
      return '#E5E7EB' // Gray border for white rooms
    }
    return `${color}60` // 38% opacity border - more visible
  }

  return (
    <>
    <Card 
      className={`relative transition-all duration-200 border-2 ${
        isSelectionMode 
          ? 'cursor-pointer hover:shadow-lg' 
          : 'hover:shadow-md'
      } ${
        isSelected 
          ? 'border-blue-500 border-2 opacity-70 shadow-lg ring-2 ring-blue-200' 
          : ''
      }`}
      style={{ 
        backgroundColor: getLightBackgroundColor(room.color),
        borderColor: isSelected ? '#3B82F6' : getBorderColor(room.color)
      }}
      onClick={handleCardClick}
    >
      {/* Color accent bar at top - more prominent */}
      <div 
        className={`h-4 w-full ${room.color === '#FFFFFF' ? 'border-b' : ''}`}
        style={{ 
          backgroundColor: room.color === '#FFFFFF' ? '#F3F4F6' : room.color,
          ...(room.color === '#FFFFFF' && { borderBottomColor: '#E5E7EB' })
        }}
      />
      
      {/* Selection Checkmark Overlay */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className={`w-5 h-5 rounded-full border-2 shadow-md ${
                room.color === '#FFFFFF' 
                  ? 'border-gray-300 ring-1 ring-gray-400' 
                  : 'border-white ring-1 ring-gray-200'
              }`}
              style={{ 
                backgroundColor: room.color === '#FFFFFF' ? '#F9FAFB' : room.color
              }}
            >
              {room.color === '#FFFFFF' && (
                <div className="flex items-center justify-center w-full h-full">
                  <span className="text-[8px] text-gray-500">∅</span>
                </div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
          </div>
          {!isSelectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()} // Prevent card click
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* View Items */}
                <DropdownMenuItem asChild>
                  <Link 
                    href={`/rooms/${room.id}`}
                    className="flex items-center w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Items
                  </Link>
                </DropdownMenuItem>
                
                {/* Edit Room */}
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onEdit(room)
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Room
                </DropdownMenuItem>
                
                {/* Room Stats */}
                <DropdownMenuItem asChild>
                  <Link 
                    href={`/analytics?room=${room.id}`}
                    className="flex items-center w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Room Stats
                  </Link>
                </DropdownMenuItem>
                
                {/* In shared household model, all authenticated users can delete rooms */}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log("🗑️ DELETE ROOM BUTTON CLICKED!", { roomId: room.id, roomName: room.name, timestamp: new Date().toISOString() })
                    console.log("🔧 Event details:", e.type, e.target)
                    console.log("🔍 Current session:", session?.user?.email)
                    try {
                      handleDeleteRoom()
                    } catch (error) {
                      console.error("❌ Error in handleDeleteRoom:", error)
                    }
                  }}
                  className="text-red-600 focus:text-red-600"
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  🗑️ DELETE {room.name?.toUpperCase()} 🗑️
                  {isDeleting && <span className="ml-auto text-xs">...</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 text-sm mb-4 font-medium">
          {room.description || 'No description'}
        </p>
        
        {/* Item Stats */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-800 font-medium">
              {itemCount === null ? 'Loading...' : `${itemCount} item${itemCount !== 1 ? 's' : ''}`}
            </span>
          </div>
          {totalValue > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-medium">
                Total value: ${totalValue.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Primary Action */}
        <div className="flex gap-2 items-center">
          <Link href={`/rooms/${room.id}`} className="flex-1">
            <Button 
              size="sm" 
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Eye className="h-4 w-4" />
              Enter Room
            </Button>
          </Link>
          <Badge variant="outline" className="text-xs bg-white/60 border-gray-300 whitespace-nowrap">
            {new Date(room.createdAt).toLocaleDateString()}
          </Badge>
        </div>
      </CardContent>
    </Card>

    {/* Safety Dialog - Room Not Empty */}
    <Dialog open={showSafetyDialog} onOpenChange={setShowSafetyDialog}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Cannot Delete "{room.name}"
          </DialogTitle>
        </DialogHeader>
        
        {safetyAnalysis && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This room contains active items and cannot be deleted.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <p className="font-medium text-gray-900">This room contains:</p>
              <ul className="space-y-1">
                {safetyAnalysis.counts.items > 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-gray-500" />
                    {safetyAnalysis.counts.items} active items
                  </li>
                )}
                {safetyAnalysis.counts.boxes > 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-gray-500" />
                    {safetyAnalysis.counts.boxes} boxes
                  </li>
                )}
                {safetyAnalysis.counts.racks > 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-gray-500" />
                    {safetyAnalysis.counts.racks} rack systems
                  </li>
                )}
              </ul>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Next steps:</strong> First move or remove all items, then try deleting the room again.
              </p>
            </div>
          </div>
        )}
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/rooms/${room.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Items
          </Button>
          <Button onClick={cancelDelete}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog - Room is Empty */}
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete "{room.name}"?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-600">
            This room is empty and safe to delete. This action can be undone for 30 days.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">Type <strong>DELETE</strong> to confirm:</Label>
            <Input
              id="confirm-delete"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              className="font-mono"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={cancelDelete}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={isDeleting || deleteConfirmText.toUpperCase() !== 'DELETE'}
          >
            {isDeleting ? 'Deleting...' : 'Delete Room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}
