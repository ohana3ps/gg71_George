
'use client'

import { useEffect, useState } from 'react'
import { Item, Room } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageGallery } from '@/components/items/image-gallery'
import { ItemForm } from '@/components/items/item-form'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  Images, 
  Search, 
  Filter,
  Plus,
  Camera
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface ItemWithRoom extends Item {
  room: {
    id: string
    name: string
    color: string
  }
}

export default function GalleryPage() {
  const [items, setItems] = useState<ItemWithRoom[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredItems, setFilteredItems] = useState<ItemWithRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemWithRoom | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoom, setSelectedRoom] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'all' | 'photos-only'>('all')

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsResponse, roomsResponse] = await Promise.all([
          fetch('/api/items'),
          fetch('/api/rooms')
        ])
        
        if (itemsResponse.ok && roomsResponse.ok) {
          const itemsData = await itemsResponse.json()
          const roomsData = await roomsResponse.json()
          setItems(itemsData)
          setRooms(roomsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter items
  useEffect(() => {
    let filtered = items

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search) ||
        item.room.name.toLowerCase().includes(search)
      )
    }

    // Room filter
    if (selectedRoom !== 'all') {
      filtered = filtered.filter(item => item.roomId === selectedRoom)
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    // View mode filter
    if (viewMode === 'photos-only') {
      filtered = filtered.filter(item => item.photoUrl)
    }

    setFilteredItems(filtered)
  }, [items, searchTerm, selectedRoom, selectedCategory, viewMode])

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true)
    try {
      const url = editingItem ? `/api/items/${editingItem.id}` : '/api/items'
      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedItem = await response.json()
        
        if (editingItem) {
          setItems(prev => prev.map(item => 
            item.id === editingItem.id ? updatedItem : item
          ))
          toast.success('Item updated successfully!')
        } else {
          setItems(prev => [updatedItem, ...prev])
          toast.success('Item created successfully!')
        }
        
        setIsFormOpen(false)
        setEditingItem(null)
      } else {
        throw new Error('Failed to save item')
      }
    } catch (error) {
      console.error('Error saving item:', error)
      toast.error('Failed to save item')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (item: ItemWithRoom) => {
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setItems(prev => prev.filter(i => i.id !== item.id))
        toast.success('Item deleted successfully!')
      } else {
        throw new Error('Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  const handleEdit = (item: ItemWithRoom) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean))) as string[]
  const itemsWithPhotos = items.filter(item => item.photoUrl).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="h-6 border-l border-gray-300" />
              <div className="flex items-center space-x-2">
                <Images className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Photo Gallery</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingItem(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <ItemForm
                    item={editingItem}
                    onSubmit={handleSubmit}
                    onCancel={() => {
                      setIsFormOpen(false)
                      setEditingItem(null)
                    }}
                    isLoading={isSubmitting}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-blue-600">{items.length}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Images className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">With Photos</p>
                  <p className="text-2xl font-bold text-green-600">{itemsWithPhotos}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <Camera className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rooms</p>
                  <p className="text-2xl font-bold text-purple-600">{rooms.length}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <Images className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Categories</p>
                  <p className="text-2xl font-bold text-orange-600">{categories.length}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-100">
                  <Filter className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters & Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
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

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="photos-only">Photos Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Showing {filteredItems.length} of {items.length} items</span>
              {viewMode === 'photos-only' && (
                <Badge variant="outline">Photos Only</Badge>
              )}
              {selectedRoom !== 'all' && (
                <Badge variant="outline">
                  Room: {rooms.find(r => r.id === selectedRoom)?.name}
                </Badge>
              )}
              {selectedCategory !== 'all' && (
                <Badge variant="outline">Category: {selectedCategory || 'Unknown'}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gallery */}
        <ImageGallery 
          items={filteredItems}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </main>
    </div>
  )
}
