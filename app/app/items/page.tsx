
'use client'

import { useEffect, useState } from 'react'
import { Item, Room } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { ItemCard } from '@/components/items/item-card'
import { ItemForm } from '@/components/items/item-form'
import { BulkScanDialog } from '@/components/items/bulk-scan-dialog'
import { Plus, Package, ArrowLeft, Filter, MapPin, Home, Grid3X3 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import RoomBreadcrumbNavigation from '@/components/room-breadcrumb-navigation'
import { ItemWithRoom } from '@/types/items'

interface Box {
  id: string
  boxNumber: number
  name?: string
  description?: string
  size: string
  type: string
  isStaging: boolean
}

export default function ItemsPage() {
  const [items, setItems] = useState<ItemWithRoom[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredItems, setFilteredItems] = useState<ItemWithRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemWithRoom | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Box and Room context for breadcrumbs
  const [currentBox, setCurrentBox] = useState<Box | null>(null)
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [roomId, setRoomId] = useState<string>('')
  const [boxId, setBoxId] = useState<string>('')
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [selectedItemType, setSelectedItemType] = useState<string>('') // Food vs Non-Food
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Get unique categories from items grouped by food/non-food
  const foodCategories = Array.from(
    new Set(
      items
        .filter(item => (item as any).isFood)
        .map(item => (item as any).foodCategory || item.category)
        .filter((category): category is string => Boolean(category))
    )
  ).sort()

  const nonFoodCategories = Array.from(
    new Set(
      items
        .filter(item => !(item as any).isFood)
        .map(item => item.category)
        .filter((category): category is string => Boolean(category))
    )
  ).sort()

  // Get categories for current item type filter
  const getFilteredCategories = () => {
    if (selectedItemType === 'food') return foodCategories
    if (selectedItemType === 'non-food') return nonFoodCategories
    return [...foodCategories, ...nonFoodCategories].sort()
  }

  // Fetch items (optionally filtered by boxId)
  const fetchItems = async (boxIdFilter?: string) => {
    try {
      let url = '/api/items'
      if (boxIdFilter) {
        url += `?boxId=${boxIdFilter}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setItems(data)
        setFilteredItems(data)
      } else {
        toast.error('Failed to load items')
      }
    } catch (error) {
      toast.error('Error loading items')
      console.error('Error fetching items:', error)
    }
  }

  // Fetch rooms
  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms')
      if (response.ok) {
        const data = await response.json()
        setRooms(data)
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }

  // Fetch box data
  const fetchBox = async (boxId: string) => {
    try {
      const response = await fetch(`/api/boxes/${boxId}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentBox(data)
        return data
      } else {
        console.error('Failed to load box data')
      }
    } catch (error) {
      console.error('Error fetching box:', error)
    }
    return null
  }

  // Fetch room data  
  const fetchRoom = async (roomId: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentRoom(data)
        return data
      } else {
        console.error('Failed to load room data')
      }
    } catch (error) {
      console.error('Error fetching room:', error)
    }
    return null
  }

  // Load data on mount and handle URL parameters
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      
      // Parse URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const roomParam = urlParams.get('roomId') || urlParams.get('room')
      const boxParam = urlParams.get('boxId')
      
      console.log('📋 Items page URL params:', { roomParam, boxParam })

      // Set URL parameter state
      if (roomParam) {
        setRoomId(roomParam)
        setSelectedRoom(roomParam)
      }
      if (boxParam) {
        setBoxId(boxParam)
      }

      // Fetch data based on context
      if (boxParam) {
        // Viewing items from a specific box
        await Promise.all([
          fetchItems(boxParam),
          fetchRooms(),
          fetchBox(boxParam),
          roomParam ? fetchRoom(roomParam) : Promise.resolve()
        ])
      } else {
        // General items view (may have room context)
        const fetchPromises = [fetchItems(), fetchRooms()]
        
        // If coming from a room (has roomId), fetch room data for breadcrumb context
        if (roomParam && roomParam.trim()) {
          fetchPromises.push(fetchRoom(roomParam))
          setSelectedRoom(roomParam)
        }
        
        await Promise.all(fetchPromises)
      }
      
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = items

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        ((item as any).foodCategory && (item as any).foodCategory.toLowerCase().includes(query)) ||
        item.notes?.toLowerCase().includes(query) ||
        item.room.name.toLowerCase().includes(query)
      )
    }

    // Room filter
    if (selectedRoom && selectedRoom !== 'all') {
      filtered = filtered.filter(item => item.roomId === selectedRoom)
    }

    // Item type filter (Food vs Non-Food)
    if (selectedItemType && selectedItemType !== 'all') {
      if (selectedItemType === 'food') {
        filtered = filtered.filter(item => (item as any).isFood)
      } else if (selectedItemType === 'non-food') {
        filtered = filtered.filter(item => !(item as any).isFood)
      }
    }

    // Category filter (subcategories within food/non-food)
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(item => {
        if ((item as any).isFood) {
          // For food items, check both foodCategory and general category
          return (item as any).foodCategory === selectedCategory || item.category === selectedCategory
        } else {
          // For non-food items, check general category
          return item.category === selectedCategory
        }
      })
    }

    setFilteredItems(filtered)
  }, [items, searchQuery, selectedRoom, selectedItemType, selectedCategory])

  // Create item
  const handleCreateItem = async (data: any) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const newItem = await response.json()
        setItems(prev => [newItem, ...prev])
        setIsFormOpen(false)
        toast.success('Item created successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create item')
      }
    } catch (error) {
      toast.error('Error creating item')
      console.error('Error creating item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update item
  const handleUpdateItem = async (data: any) => {
    if (!editingItem) return
    
    setIsSubmitting(true)
    try {
      console.log('📝 Updating item:', {
        itemId: editingItem.id,
        name: data.name,
        roomId: data.roomId,
        hasItemId: Boolean(data.itemId)
      })
      
      // Remove itemId from body since it's in the URL
      const apiData = { ...data }
      delete apiData.itemId
      
      const response = await fetch(`/api/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      })

      if (response.ok) {
        const updatedItem = await response.json()
        setItems(prev => prev.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        ))
        setEditingItem(null)
        setIsFormOpen(false)
        toast.success('Item updated successfully!')
        console.log('✅ Item updated successfully:', updatedItem.name)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Failed to update item'
        console.error('❌ Item update failed:', errorData)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('❌ Error updating item:', error)
      toast.error('Error updating item')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete item
  const handleDeleteItem = async (item: ItemWithRoom) => {
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setItems(prev => prev.filter(i => i.id !== item.id))
        toast.success('Item deleted successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete item')
      }
    } catch (error) {
      toast.error('Error deleting item')
      console.error('Error deleting item:', error)
    }
  }

  // Checkout item
  const handleCheckoutItem = async (item: ItemWithRoom) => {
    try {
      const response = await fetch(`/api/items/${item.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: `Checked out via items page`
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update the item in local state
        setItems(prev => prev.map(i => 
          i.id === item.id 
            ? { ...i, status: 'CHECKED_OUT', checkedOutBy: result.item.checkedOutBy, checkedOutAt: result.item.checkedOutAt }
            : i
        ))
        
        toast.success(`"${item.name}" checked out successfully!`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to check out item')
      }
    } catch (error) {
      toast.error('Error checking out item')
      console.error('Error checking out item:', error)
    }
  }

  // Return item
  const handleReturnItem = async (item: ItemWithRoom) => {
    try {
      const response = await fetch(`/api/items/${item.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: `Returned via items page`
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update the item in local state
        setItems(prev => prev.map(i => 
          i.id === item.id 
            ? { ...i, status: 'AVAILABLE', returnedBy: result.item.returnedBy, returnedAt: result.item.returnedAt }
            : i
        ))
        
        toast.success(`"${item.name}" returned successfully!`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to return item')
      }
    } catch (error) {
      toast.error('Error returning item')
      console.error('Error returning item:', error)
    }
  }

  // Edit item handler
  const handleEditItem = (item: ItemWithRoom) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  // Cancel form
  const handleCancelForm = () => {
    setIsFormOpen(false)
    setEditingItem(null)
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedRoom('')
    setSelectedItemType('')
    setSelectedCategory('')
  }

  // Handle item type change (clear category when switching between food/non-food)
  const handleItemTypeChange = (value: string) => {
    setSelectedItemType(value)
    setSelectedCategory('') // Clear category selection when changing item type
  }

  // Generate breadcrumb items based on context
  const getBreadcrumbItems = () => {
    const items = [
      { label: 'Home', path: '/', icon: Home }
    ]

    if (currentBox && currentRoom) {
      // Viewing items from a specific box
      items.push(
        { label: 'Rooms', path: '/rooms', icon: Grid3X3 },
        { label: currentRoom.name, path: `/rooms/${currentRoom.id}`, icon: MapPin }
      )
      
      if (currentBox.isStaging) {
        // Add staging area breadcrumb for staging boxes
        items.push({ 
          label: 'Staging Area', 
          path: `/rooms/${currentRoom.id}`, 
          icon: Package 
        })
      }
      
      items.push({ 
        label: `Box ${currentBox.boxNumber} Contents${currentBox.name ? ` (${currentBox.name})` : ''}`, 
        path: `/items?roomId=${currentRoom.id}&boxId=${currentBox.id}`, 
        icon: Package 
      })
    } else if (currentRoom && roomId) {
      // Viewing items from a specific room (came from "+Item" button)
      items.push(
        { label: 'Rooms', path: '/rooms', icon: Grid3X3 },
        { label: currentRoom.name, path: `/rooms/${currentRoom.id}`, icon: MapPin },
        { label: 'My Items', path: `/items?roomId=${currentRoom.id}`, icon: Package }
      )
    } else {
      // General items view (no specific room context)
      items.push({ label: 'My Items', path: '/items', icon: Package })
    }

    return items
  }

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

  // Get page title and description based on context
  const getPageTitle = () => {
    if (currentBox && currentRoom) {
      return `Box ${currentBox.boxNumber} Contents${currentBox.name ? ` (${currentBox.name})` : ''}`
    } else if (currentRoom && roomId) {
      return `${currentRoom.name} Items`
    }
    return 'My Items'
  }

  const getPageDescription = () => {
    if (currentBox && currentRoom) {
      const boxType = currentBox.isStaging ? 'staging' : 'placed'
      return `Items in ${boxType} box ${currentBox.boxNumber} • ${currentRoom.name}`
    } else if (currentRoom && roomId) {
      return `Manage items in ${currentRoom.name}. Add, edit, and organize your inventory for this room.`
    }
    return 'Manage your garage inventory. Track items across all your rooms and spaces.'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Enhanced Navigation with Breadcrumbs */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/app-icon.png?v=4" 
                alt="GarageGrid Logo" 
                className="w-8 h-8 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-black">GarageGrid Pro</h1>
                <p className="text-xs text-gray-500 -mt-1">Smart Storage.</p>
                <p className="text-xs text-gray-500 -mt-0.5">Effortless Retrieval.</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto">
          <RoomBreadcrumbNavigation items={getBreadcrumbItems()} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Dynamic Header */}
        <div className="mb-8 mt-4">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{getPageTitle()}</h1>
            {currentBox && (
              <div className="flex items-center gap-2 ml-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  currentBox.isStaging 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentBox.isStaging ? 'Staging' : 'Placed'}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  Size {currentBox.size}
                </span>
              </div>
            )}
          </div>
          <p className="text-gray-600">
            {getPageDescription()}
          </p>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search items, descriptions, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>

            {/* Room Filter */}
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Item Type Filter (Food vs Non-Food) */}
            <Select value={selectedItemType} onValueChange={handleItemTypeChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="food">🍎 Food Items</SelectItem>
                <SelectItem value="non-food">🔧 Non-Food Items</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter (Dynamic based on item type) */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={
                  selectedItemType === 'food' ? 'All Food Categories' :
                  selectedItemType === 'non-food' ? 'All Non-Food Categories' :
                  'All Categories'
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {selectedItemType === 'food' ? 'All Food Categories' :
                   selectedItemType === 'non-food' ? 'All Non-Food Categories' :
                   'All Categories'}
                </SelectItem>
                {getFilteredCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(searchQuery || selectedRoom || selectedItemType || selectedCategory) && (
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filter Summary */}
          {(selectedItemType || selectedCategory || selectedRoom || searchQuery) && (
            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
              <span>Filters applied:</span>
              {selectedItemType && selectedItemType !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {selectedItemType === 'food' ? '🍎 Food Items' : '🔧 Non-Food Items'}
                </span>
              )}
              {selectedCategory && selectedCategory !== 'all' && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  {selectedCategory}
                </span>
              )}
              {selectedRoom && selectedRoom !== 'all' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                  {rooms.find(room => room.id === selectedRoom)?.name}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                  Search: "{searchQuery}"
                </span>
              )}
            </div>
          )}
        </div>

        {/* Create Item Buttons */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          {/* Add Box Contents (bulk scan) - only show when viewing a specific box */}
          {currentBox && (
            <BulkScanDialog
              boxId={currentBox.id}
              boxName={currentBox.name || `Box ${currentBox.boxNumber}`}
              onItemsAdded={() => {
                // Refresh items when bulk scanning is complete
                fetchItems(boxId)
              }}
            />
          )}
          
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingItem(null)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <ItemForm
                item={editingItem}
                onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
                onCancel={handleCancelForm}
                isLoading={isSubmitting}
                defaultRoomId={roomId}
                defaultBoxId={boxId}
                contextInfo={{
                  boxName: currentBox?.name,
                  boxNumber: currentBox?.boxNumber,
                  roomName: currentRoom?.name
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Items Summary */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>Total Items: {items.length}</span>
            {filteredItems.length !== items.length && (
              <span>• Showing: {filteredItems.length}</span>
            )}
            <span>• 🍎 Food: {items.filter(item => (item as any).isFood).length}</span>
            <span>• 🔧 Non-Food: {items.filter(item => !(item as any).isFood).length}</span>
            <span>• Total Value: ${items.reduce((sum, item) => sum + (item.value || 0), 0).toLocaleString()}</span>
            {/* Show food expiration warnings */}
            {(() => {
              const foodItems = items.filter(item => (item as any).isFood && (item as any).expirationDate)
              const today = new Date()
              const expiringSoon = foodItems.filter(item => {
                const expirationDate = new Date((item as any).expirationDate)
                const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                return daysUntilExpiration <= 7 && daysUntilExpiration >= 0
              })
              const expired = foodItems.filter(item => {
                const expirationDate = new Date((item as any).expirationDate)
                const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                return daysUntilExpiration < 0
              })

              return (
                <>
                  {expired.length > 0 && (
                    <span className="text-red-600 font-medium">• ⚠️ {expired.length} Expired</span>
                  )}
                  {expiringSoon.length > 0 && (
                    <span className="text-orange-600 font-medium">• ⏰ {expiringSoon.length} Expiring Soon</span>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {/* Items Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onCheckout={handleCheckoutItem}
                onReturn={handleReturnItem}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle className="text-gray-500">No Items Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">
                Add your first item to start tracking your garage inventory.
              </p>
              {rooms.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-orange-600">
                    You need to create at least one room before adding items.
                  </p>
                  <Link href="/rooms">
                    <Button variant="outline">
                      Create Rooms First
                    </Button>
                  </Link>
                </div>
              ) : (
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingItem(null)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Your First Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <ItemForm
                      item={editingItem}
                      onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
                      onCancel={handleCancelForm}
                      isLoading={isSubmitting}
                      defaultRoomId={roomId}
                      defaultBoxId={boxId}
                      contextInfo={{
                        boxName: currentBox?.name,
                        boxNumber: currentBox?.boxNumber,
                        roomName: currentRoom?.name
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle className="text-gray-500">No Items Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">
                No items match your current filters. Try adjusting your search criteria.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
