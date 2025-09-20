

'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Scan } from 'lucide-react'
import { ScanItemButton } from '@/components/scanning'
import MobileRoomOptimizer from '@/components/mobile-room-optimizer'
import { RoomHeader } from '@/components/rooms/room-header'
import { StagingArea } from '@/components/rooms/staging-area'
import { RackVisualization } from '@/components/rooms/rack-visualization'
import { ItemManagementDialogs } from '@/components/rooms/item-management-dialogs'
import { useRoomData } from '@/hooks/use-room-data'
import RoomBreadcrumbNavigation from '@/components/room-breadcrumb-navigation'
import { toast } from 'react-hot-toast'

// Type definitions for the interfaces
interface Room {
  id: string
  name: string
  description?: string
  color?: string
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

interface Position {
  id: string
  shelfNumber: number
  positionNumber: number
  capacity: number
  boxPositions: BoxPosition[]
  looseItems?: Item[]
  virtualContainer?: VirtualContainer
}

interface VirtualContainer {
  id: string
  name: string
  description?: string
  category?: string
  items: Item[]
  itemCount: number
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

export default function RoomDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string
  
  // Use the custom hook for room data management
  const {
    room,
    racks,
    boxes,
    stagingBoxes,
    looseItems,
    loading,
    error,
    fetchRoomData,
    markDataStale,
    setRacks
  } = useRoomData(roomId)
  
  // Local state for UI interactions
  const [searchQuery, setSearchQuery] = useState('')
  const [isRackFormOpen, setIsRackFormOpen] = useState(false)
  const [isSubmittingRack, setIsSubmittingRack] = useState(false)
  const [isDeletingRack, setIsDeletingRack] = useState(false)
  const [editingRack, setEditingRack] = useState<Rack | null>(null)
  const [isBoxFormOpen, setIsBoxFormOpen] = useState(false)
  const [isSubmittingBox, setIsSubmittingBox] = useState(false)
  const [editingBox, setEditingBox] = useState<Box | null>(null)
  const [placementDialogOpen, setPlacementDialogOpen] = useState(false)
  const [boxToPlace, setBoxToPlace] = useState<Box | null>(null)
  
  // Shelf Space Popup State
  const [shelfSpaceDialogOpen, setShelfSpaceDialogOpen] = useState(false)
  const [selectedShelfSpace, setSelectedShelfSpace] = useState<{
    rack: Rack,
    shelfNumber: number,
    positionNumber: number,
    position?: Position
  } | null>(null)

  // Staging Area State  
  const [stagingCollapsed, setStagingCollapsed] = useState(true)
  const [stagingFilter, setStagingFilter] = useState<'all' | 'boxes' | 'items'>('all')
  
  // Collapsible Racks State
  const [collapsedRacks, setCollapsedRacks] = useState<Set<string>>(new Set())

  // Position Capacity Configuration State
  const [isCapacityConfigOpen, setIsCapacityConfigOpen] = useState(false)
  const [configuringRack, setConfiguringRack] = useState<Rack | null>(null)

  // Add Item Form State
  const [isItemFormOpen, setIsItemFormOpen] = useState(false)
  const [isSubmittingItem, setIsSubmittingItem] = useState(false)
  const [itemFormContext, setItemFormContext] = useState<any>(null)
  const [nextAvailableRackNumber, setNextAvailableRackNumber] = useState<number>(1)

  // Initialize component when session and roomId are available
  useEffect(() => {
    console.log('🔐 Session check:', { hasSession: !!session, userId: session?.user?.id, roomId })
    if (session && roomId) {
      fetchRoomData()
    } else {
      console.log('⏸️ Not fetching room data - missing session or roomId')
    }
  }, [session, roomId, fetchRoomData])

  // Initialize collapsed racks when racks are loaded
  useEffect(() => {
    if (racks.length > 0) {
      setCollapsedRacks(prev => {
        const newSet = new Set(prev)
        if (racks.length > 1) {
          racks.forEach(rack => {
            if (!prev.has(rack.id)) {
              newSet.add(rack.id)
            }
          })
        }
        return newSet
      })
    }
    
    if (roomId) {
      fetchNextAvailableRackNumber()
    }
  }, [racks.length, roomId])

  // Fetch next available rack number from API
  const fetchNextAvailableRackNumber = async () => {
    try {
      const response = await fetch(`/api/racks?roomId=${roomId}&nextNumber=true`)
      if (response.ok) {
        const data = await response.json()
        setNextAvailableRackNumber(data.nextAvailableRackNumber)
      }
    } catch (error) {
      console.error('Error fetching next available rack number:', error)
      setNextAvailableRackNumber(1)
    }
  }

  // Event handlers and business logic
  const handleVoiceCommand = () => {
    console.log('Voice command activated')
  }

  // Context-aware Add Item logic
  const openAddItemForm = (contextOverride?: {
    area?: 'staging' | 'shelf' | 'box' | 'room'
    rackId?: string
    rackName?: string
    rackNumber?: number
    shelfNumber?: number
    positionNumber?: number
    boxId?: string
    boxName?: string
    boxNumber?: number
  }) => {
    if (!room) return

    const autoDetectedArea: 'staging' | 'shelf' | 'box' | 'room' = contextOverride?.area || (
      stagingBoxes.length > 0 ? 'staging' : 'room'
    )

    const smartContext = {
      roomId: room.id,
      roomName: room.name,
      roomColor: room.color,
      area: autoDetectedArea,
      suggestedPlacement: contextOverride?.area === 'box' ? 'box' as const :
                         contextOverride?.area === 'shelf' ? 'position' as const :
                         autoDetectedArea === 'staging' ? 'box' as const :
                         'room' as const,
      ...contextOverride,
      recentlyUsedBoxes: boxes.filter(box => !box.isStaging).slice(0, 3).map(box => ({
        id: box.id,
        name: box.name,
        boxNumber: box.boxNumber
      })),
      availableStagingBoxes: autoDetectedArea === 'staging' || contextOverride?.area === 'staging' 
        ? stagingBoxes.map(box => ({
            id: box.id,
            name: box.name,
            boxNumber: box.boxNumber
          }))
        : [],
      availablePositions: racks.flatMap(rack => 
        rack.positions?.filter(pos => (pos.capacity || 1) > (pos.boxPositions?.length || 0))
          .slice(0, 3).map(pos => ({
            rackId: rack.id,
            rackName: rack.name,
            shelfNumber: pos.shelfNumber,
            positionNumber: pos.positionNumber
          })) || []
      ).slice(0, 5)
    }

    console.log('🧠 Smart Add Item Context:', smartContext)
    setItemFormContext(smartContext)
    setIsItemFormOpen(true)
  }

  const handleAddItem = () => {
    openAddItemForm()
  }

  const handleAddItemToShelf = (rackId: string, rackName: string, rackNumber: number, shelfNumber: number, positionNumber: number) => {
    openAddItemForm({
      area: 'shelf',
      rackId,
      rackName,
      rackNumber,
      shelfNumber,
      positionNumber
    })
  }

  // Room update handler
  const handleUpdateRoom = async (data: { name: string; description: string; color: string }) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update room')
      }

      const updatedRoom = await response.json()
      // Update room data using the hook's setter would go here
      // For now we'll refetch
      await fetchRoomData()
      toast.success('Room updated successfully!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update room'
      toast.error(errorMessage)
      console.error('Error updating room:', error)
    }
  }

  // Item form handlers
  const handleSubmitItem = async (itemData: any) => {
    if (!session?.user?.id) return

    setIsSubmittingItem(true)
    const isEditMode = Boolean(itemData.itemId)
    
    try {
      console.log(`📦 ${isEditMode ? 'Updating' : 'Creating'} item with context:`, {
        isEditMode,
        itemId: itemData.itemId,
        name: itemData.name,
        roomId: itemData.roomId,
        userId: session.user.id
      })
      
      const apiUrl = isEditMode ? `/api/items/${itemData.itemId}` : '/api/items'
      const method = isEditMode ? 'PUT' : 'POST'
      
      const apiData = {
        ...itemData,
        userId: session.user.id,
      }
      
      if (isEditMode) {
        delete apiData.itemId
      }
      
      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorResponse = await response.text()
        console.error(`❌ API ${method} failed:`, {
          status: response.status,
          statusText: response.statusText,
          response: errorResponse
        })
        throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} item: ${response.status} ${response.statusText}`)
      }

      const resultItem = await response.json()
      console.log(`✅ Item ${isEditMode ? 'updated' : 'created'} successfully:`, {
        itemId: resultItem.id,
        name: resultItem.name,
        roomId: resultItem.roomId
      })

      const contextMessage = itemFormContext?.area === 'box' 
        ? ` to ${itemFormContext.boxName} (Box ${itemFormContext.boxNumber})`
        : itemFormContext?.area === 'shelf'
          ? ` to ${itemFormContext.rackName} Shelf ${itemFormContext.shelfNumber} Position ${itemFormContext.positionNumber}`
          : ` in ${room?.name}`

      const actionWord = isEditMode ? 'updated' : 'added'
      toast.success(`✨ Item "${itemData.name}" ${actionWord}${contextMessage}!`)
      
      setIsItemFormOpen(false)
      setItemFormContext(null)
      
      await fetchRoomData()
      markDataStale()
      
    } catch (error) {
      console.error(`❌ Error ${isEditMode ? 'updating' : 'creating'} item:`, error)
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} item. Please try again.`)
    } finally {
      setIsSubmittingItem(false)
    }
  }

  const handleCancelItemForm = () => {
    setIsItemFormOpen(false)
    setItemFormContext(null)
  }

  // Rack handlers
  const handleAddRack = () => {
    setIsRackFormOpen(true)
  }

  const handleCreateRack = async (data: { 
    name: string
    rackNumber: number
    maxShelves: number
    positionsPerShelf: number
    shelfConfig?: any[]
    useAdvancedConfig: boolean
  }) => {
    setIsSubmittingRack(true)
    
    try {
      const isEditMode = !!editingRack
      const url = isEditMode ? `/api/racks/${editingRack.id}` : '/api/racks'
      const method = isEditMode ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          ...(isEditMode ? {} : { roomId })
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Failed to ${isEditMode ? 'update' : 'create'} rack: ${response.status}`)
      }

      const rackData = await response.json()
      
      if (!rackData || !rackData.id) {
        throw new Error('Invalid response from server')
      }

      await fetchRoomData()
      setIsRackFormOpen(false)
      setEditingRack(null)
      toast.success(`Rack ${isEditMode ? 'updated' : 'created'} successfully!`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(errorMessage)
      console.error(`Error ${editingRack ? 'updating' : 'creating'} rack:`, error)
    } finally {
      setIsSubmittingRack(false)
    }
  }

  const handleCancelRackForm = () => {
    setIsRackFormOpen(false)
    setEditingRack(null)
  }

  const handleConfigureRack = (rack: Rack) => {
    setEditingRack(rack)
    setIsRackFormOpen(true)
  }

  const handleConfigureCapacity = (rack: Rack) => {
    setConfiguringRack(rack)
    setIsCapacityConfigOpen(true)
  }

  const handleUpdatePositionCapacities = async (capacities: { [positionId: string]: number }) => {
    if (!configuringRack) return
    
    try {
      const response = await fetch(`/api/racks/${configuringRack.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCapacities',
          capacities
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update position capacities')
      }

      const updatedRack = await response.json()
      const updatedRacks = racks.map(r => r.id === configuringRack.id ? updatedRack : r)
      setRacks(updatedRacks)
      
      setIsCapacityConfigOpen(false)
      setConfiguringRack(null)
      toast.success('Position capacities updated successfully!')
    } catch (error) {
      console.error('Error updating position capacities:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update position capacities'
      toast.error(errorMessage)
    }
  }

  const handleCancelCapacityConfig = () => {
    setIsCapacityConfigOpen(false)
    setConfiguringRack(null)
  }

  const handleDeleteRack = async () => {
    if (!editingRack) return
    
    setIsDeletingRack(true)
    
    try {
      const response = await fetch(`/api/racks/${editingRack.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete rack')
      }

      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        await fetchRoomData()
        setIsRackFormOpen(false)
        setEditingRack(null)
        toast.success('Rack deleted successfully!')
      } catch (refreshError) {
        console.warn('Error refreshing room data after rack deletion:', refreshError)
        setIsRackFormOpen(false)
        setEditingRack(null)
        toast.success('Rack deleted successfully!')
        
        setTimeout(() => {
          toast('Redirecting to dashboard...', { icon: 'ℹ️' })
          router.push('/')
        }, 2000)
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(errorMessage)
      console.error('Error deleting rack:', error)
    } finally {
      setIsDeletingRack(false)
    }
  }

  // Box handlers
  const handleAddBox = () => {
    setIsBoxFormOpen(true)
  }

  const handleCreateBox = async (data: { 
    boxNumber: number
    name: string
    description: string
    size: string
    type: string
    roomId?: string
  }) => {
    setIsSubmittingBox(true)
    
    try {
      const isEditMode = !!editingBox
      const url = isEditMode ? `/api/boxes/${editingBox.id}` : '/api/boxes'
      const method = isEditMode ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          roomId: data.roomId || roomId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Failed to ${isEditMode ? 'update' : 'create'} box: ${response.status}`)
      }

      const boxData = await response.json()
      
      if (!boxData || !boxData.id) {
        throw new Error('Invalid response from server')
      }

      await fetchRoomData()
      setIsBoxFormOpen(false)
      setEditingBox(null)
      toast.success(`Box ${isEditMode ? 'updated' : 'created'} successfully! It's now in the staging area.`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(errorMessage)
      console.error(`Error ${editingBox ? 'updating' : 'creating'} box:`, error)
    } finally {
      setIsSubmittingBox(false)
    }
  }

  const handleCancelBoxForm = () => {
    setIsBoxFormOpen(false)
    setEditingBox(null)
  }

  const handleEditBox = (box: Box) => {
    setEditingBox(box)
    setIsBoxFormOpen(true)
  }

  const handlePlaceBox = (box: Box) => {
    setBoxToPlace(box)
    setPlacementDialogOpen(true)
  }

  const handlePlacementComplete = async () => {
    await fetchRoomData()
  }

  const handleClosePlacementDialog = () => {
    setPlacementDialogOpen(false)
    setBoxToPlace(null)
  }

  // Shelf space handlers
  const handleShelfSpaceClick = (rack: Rack, shelfNumber: number, positionNumber: number) => {
    const shelfPositions = rack.positions?.filter(p => p.shelfNumber === shelfNumber) || []
    const position = shelfPositions.find(p => p.positionNumber === positionNumber)
    
    setSelectedShelfSpace({
      rack,
      shelfNumber,
      positionNumber,
      position
    })
    setShelfSpaceDialogOpen(true)
  }

  const handleCloseShelfSpaceDialog = () => {
    setShelfSpaceDialogOpen(false)
    setSelectedShelfSpace(null)
  }

  const handleManagePosition = (positionId: string) => {
    const position = racks.flatMap(r => r.positions).find(p => p.id === positionId)
    const rack = racks.find(r => r.positions.some(p => p.id === positionId))
    
    if (rack && position) {
      setConfiguringRack(rack)
      setIsCapacityConfigOpen(true)
    }
  }

  const handleMoveAllBoxesToStaging = async (positionId: string) => {
    const position = racks.flatMap(r => r.positions).find(p => p.id === positionId)
    
    if (!position || !position.boxPositions?.length) return

    try {
      const movePromises = position.boxPositions.map(async (bp) => {
        const response = await fetch(`/api/boxes/${bp.box.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'move',
            toStaging: true
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to move Box ${bp.box.boxNumber}`)
        }

        return response.json()
      })

      await Promise.all(movePromises)
      await fetchRoomData()
      toast.success(`Moved ${position.boxPositions.length} boxes to staging`)
    } catch (error) {
      console.error('Error moving boxes to staging:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to move boxes'
      toast.error(errorMessage)
    }
  }

  const handleViewBoxContents = (boxId: string) => {
    router.push(`/items?boxId=${boxId}`)
  }

  // Staging area handlers
  const handleToggleStagingCollapse = () => {
    setStagingCollapsed(!stagingCollapsed)
  }

  const handleStagingFilterChange = (filter: 'all' | 'boxes' | 'items') => {
    setStagingFilter(filter)
  }

  // Loose item handlers
  const handleMoveItemToBox = async (itemId: string) => {
    const item = looseItems.find(i => i.id === itemId)
    if (item) {
      setItemFormContext({
        mode: 'move-to-box',
        itemId: item.id,
        itemName: item.name,
        roomId: room?.id
      })
      setIsItemFormOpen(true)
    }
  }

  const handleEditLooseItem = (itemId: string) => {
    const item = looseItems.find(i => i.id === itemId)
    if (item) {
      setItemFormContext({
        mode: 'edit',
        itemId: item.id,
        itemData: item,
        roomId: room?.id
      })
      setIsItemFormOpen(true)
    }
  }

  const handleDeleteLooseItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        await fetchRoomData()
        markDataStale()
        toast.success('Item deleted successfully!')
      } catch (refreshError) {
        console.warn('Error refreshing room data after item deletion:', refreshError)
        markDataStale()
        toast.success('Item deleted successfully!')
        
        setTimeout(() => {
          toast('Redirecting to dashboard...', { icon: 'ℹ️' })
          router.push('/?refresh=rooms')
        }, 2000)
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  const handleQuickAddToNewBox = async (itemId: string) => {
    try {
      const item = looseItems.find(i => i.id === itemId)
      if (!item) return

      const boxData = {
        boxNumber: Math.max(0, ...stagingBoxes.map(b => b.boxNumber || 0)) + 1,
        name: `Box for ${item.name}`,
        description: `Auto-created box for ${item.name}`,
        size: 'M',
        type: 'standard'
      }

      await handleCreateBox(boxData)
      await fetchRoomData()
      
      const newBox = stagingBoxes[stagingBoxes.length - 1]
      if (newBox) {
        const moveResponse = await fetch(`/api/items/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boxId: newBox.id })
        })

        if (moveResponse.ok) {
          await fetchRoomData()
          toast.success(`Item moved to new box: ${newBox.name}`)
        } else {
          throw new Error('Failed to move item to new box')
        }
      }
    } catch (error) {
      console.error('Error creating box and moving item:', error)
      toast.error('Failed to create box and move item')
    }
  }

  // Rack collapse handlers
  const toggleRackCollapse = (rackId: string) => {
    setCollapsedRacks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rackId)) {
        newSet.delete(rackId)
      } else {
        newSet.add(rackId)
      }
      return newSet
    })
  }

  const isRackCollapsed = (rack: Rack): boolean => {
    return collapsedRacks.has(rack.id)
  }

  // Scanning handlers
  const handleScannedItems = async (scannedItems: any[]) => {
    try {
      console.log('📦 Processing scanned items with placement:', scannedItems)
      
      const itemPromises = scannedItems.map(async (scannedItem) => {
        const { placement, ...itemData } = scannedItem
        
        let apiData = {
          ...itemData,
          roomId,
        }
        
        if (placement?.mode === 'direct') {
          console.log('🎯 Direct placement:', placement)
          apiData = {
            ...apiData,
            rackId: placement.rackId,
            shelfNumber: placement.shelfNumber,
            positionNumber: placement.positionNumber,
          }
        } else if (placement?.mode === 'staging' && placement.boxId) {
          console.log('📦 Staging placement:', placement)
          apiData = {
            ...apiData,
            boxId: placement.boxId,
          }
        } else {
          console.log('📦 Fallback: Using default staging placement')
          let targetBox = stagingBoxes[stagingBoxes.length - 1]
          
          if (!targetBox) {
            const defaultBoxData = {
              boxNumber: 1,
              name: 'Scanned Items Box',
              description: 'Auto-created box for scanned items',
              size: 'L',
              type: 'standard'
            }
            
            await handleCreateBox(defaultBoxData)
            await fetchRoomData()
            targetBox = stagingBoxes[stagingBoxes.length - 1]
          }

          if (!targetBox) {
            throw new Error('Could not create or find a box for scanned items')
          }
          
          apiData.boxId = targetBox.id
        }

        console.log('🚀 Creating item with data:', apiData)
        
        const response = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error('❌ API Error:', errorData)
          throw new Error(`Failed to create item: ${scannedItem.name}`)
        }

        const result = await response.json()
        console.log('✅ Item created successfully:', result)
        return result
      })

      await Promise.all(itemPromises)
      await fetchRoomData()
      
      const placementInfo = scannedItems[0]?.placement
      let successMessage = `${scannedItems.length} item${scannedItems.length !== 1 ? 's' : ''} added successfully!`
      
      if (placementInfo?.mode === 'direct') {
        successMessage += ' Items placed directly on rack.'
      } else {
        successMessage += ' Items added to staging area.'
      }
      
      toast.success(successMessage)
      
    } catch (error) {
      console.error('Error processing scanned items:', error)
      toast.error('Failed to add scanned items. Please try again.')
    }
  }

  const handleItemsScannedForBox = async (boxId: string, scannedItems: any[]) => {
    try {
      console.log('🔍 Scanning items for box:', boxId, 'Items:', scannedItems)
      
      const itemPromises = scannedItems.map(async (scannedItem) => {
        console.log('📦 Creating item:', scannedItem.name, 'for box:', boxId)
        const response = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...scannedItem,
            roomId,
            boxId: boxId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ Failed to create item:', errorData)
          throw new Error(errorData.error || `Failed to create item: ${scannedItem.name}`)
        }

        const createdItem = await response.json()
        console.log('✅ Item created successfully:', createdItem)
        return createdItem
      })

      const createdItems = await Promise.all(itemPromises)
      console.log('🎉 All items created:', createdItems)
      
      console.log('🔄 Refreshing room data...')
      await fetchRoomData()
      
      const targetBox = stagingBoxes.find(box => box.id === boxId)
      console.log('📋 Target box after refresh:', targetBox)
      toast.success(`Successfully added ${scannedItems.length} items to ${targetBox?.name || 'the box'}!`)
    } catch (error) {
      console.error('❌ Error adding scanned items to box:', error)
      toast.error('Failed to add scanned items. Please try again.')
    }
  }

  // Utility functions
  const getTotalItems = () => {
    const boxItems = boxes.reduce((total, box) => total + (box.items?.length || box._count?.items || 0), 0)
    const positionItems = racks.reduce((total, rack) => {
      return total + (rack.positions?.reduce((posTotal, pos) => 
        posTotal + (pos.looseItems?.length || 0), 0) || 0)
    }, 0)
    return boxItems + looseItems.length + positionItems
  }

  const getPlacedBoxes = () => {
    return boxes.filter(box => !box.isStaging).length
  }

  // Loading and error states
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Room</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => fetchRoomData()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Room Not Found</h1>
          <p className="text-gray-600 mb-6">This room does not exist or has been deleted.</p>
          <Button onClick={() => router.push('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileRoomOptimizer>
        <div />
      
      {/* Room Header */}
      <RoomHeader
        room={room}
        totalItems={getTotalItems()}
        placedBoxes={getPlacedBoxes()}
        stagingBoxCount={stagingBoxes.length}
        onUpdateRoom={handleUpdateRoom}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <Button onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            
            <ScanItemButton
              onItemsScanned={handleScannedItems}
              variant="outline"
              className="border-blue-300 hover:bg-blue-50"
            />
          </div>

          <div className="flex items-center space-x-3">
            <Button onClick={handleAddBox} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Box
            </Button>
            
            <Button onClick={handleAddRack} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Rack
            </Button>
          </div>
        </div>

        {/* Staging Area */}
        <StagingArea
          stagingBoxes={stagingBoxes}
          looseItems={looseItems}
          roomId={roomId}
          collapsed={stagingCollapsed}
          filter={stagingFilter}
          onToggleCollapse={handleToggleStagingCollapse}
          onFilterChange={handleStagingFilterChange}
          onEditBox={handleEditBox}
          onPlaceBox={handlePlaceBox}
          onViewBoxContents={handleViewBoxContents}
          onItemsScannedForBox={handleItemsScannedForBox}
          onMoveItemToBox={handleMoveItemToBox}
          onEditLooseItem={handleEditLooseItem}
          onDeleteLooseItem={handleDeleteLooseItem}
          onQuickAddToNewBox={handleQuickAddToNewBox}
          onAddBox={handleAddBox}
        />

        {/* Racks Section */}
        {racks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Storage Racks</h2>
            {racks.map((rack) => (
              <RackVisualization
                key={rack.id}
                rack={rack}
                isCollapsed={isRackCollapsed(rack)}
                onToggleCollapse={() => toggleRackCollapse(rack.id)}
                onConfigureRack={() => handleConfigureRack(rack)}
                onConfigureCapacity={() => handleConfigureCapacity(rack)}
                onShelfSpaceClick={(shelfNumber, positionNumber) => 
                  handleShelfSpaceClick(rack, shelfNumber, positionNumber)
                }
                onAddItemToShelf={handleAddItemToShelf}
              />
            ))}
          </div>
        )}

        {/* Empty State for Racks */}
        {racks.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Storage Racks Yet</h3>
            <p className="text-gray-500 mb-6">Create your first rack to organize your items efficiently</p>
            <Button onClick={handleAddRack} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create First Rack
            </Button>
          </div>
        )}
      </div>

      {/* All Management Dialogs */}
      <ItemManagementDialogs
        // Item Form
        isItemFormOpen={isItemFormOpen}
        itemFormContext={itemFormContext}
        isSubmittingItem={isSubmittingItem}
        onSubmitItem={handleSubmitItem}
        onCancelItemForm={handleCancelItemForm}
        
        // Box Form
        isBoxFormOpen={isBoxFormOpen}
        editingBox={editingBox}
        isSubmittingBox={isSubmittingBox}
        onCreateBox={handleCreateBox}
        onCancelBoxForm={handleCancelBoxForm}
        
        // Rack Form
        isRackFormOpen={isRackFormOpen}
        editingRack={editingRack}
        isSubmittingRack={isSubmittingRack}
        isDeletingRack={isDeletingRack}
        nextAvailableRackNumber={nextAvailableRackNumber}
        onCreateRack={handleCreateRack}
        onCancelRackForm={handleCancelRackForm}
        onDeleteRack={handleDeleteRack}
        
        // Box Placement
        placementDialogOpen={placementDialogOpen}
        boxToPlace={boxToPlace}
        racks={racks}
        onPlacementComplete={handlePlacementComplete}
        onClosePlacementDialog={handleClosePlacementDialog}
        
        // Shelf Space
        shelfSpaceDialogOpen={shelfSpaceDialogOpen}
        selectedShelfSpace={selectedShelfSpace}
        roomId={roomId}
        onCloseShelfSpaceDialog={handleCloseShelfSpaceDialog}
        onManagePosition={handleManagePosition}
        onMoveAllBoxesToStaging={handleMoveAllBoxesToStaging}
        
        // Position Capacity
        isCapacityConfigOpen={isCapacityConfigOpen}
        configuringRack={configuringRack}
        onUpdatePositionCapacities={handleUpdatePositionCapacities}
        onCancelCapacityConfig={handleCancelCapacityConfig}
      />
      </MobileRoomOptimizer>
    </div>
  )
}
