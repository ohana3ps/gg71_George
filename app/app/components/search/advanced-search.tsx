

'use client'

import { useState, useEffect } from 'react'
import { Item, Room } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ItemCard } from '@/components/items/item-card'
import { Search, Filter, SortAsc, SortDesc, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface ItemWithRoom extends Item {
  room: {
    id: string
    name: string
    color: string
  }
}

interface SearchResults {
  items: ItemWithRoom[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  filters: any
}

export function AdvancedSearch() {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Search filters state
  const [filters, setFilters] = useState({
    query: '',
    category: 'all',
    roomId: 'all',
    condition: 'all',
    minValue: '',
    maxValue: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  // Load rooms for filter dropdown
  useEffect(() => {
    fetchRooms()
    performSearch() // Initial search to show all items
  }, [])

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

  const performSearch = async (offset = 0) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value.toString())
        }
      })
      
      if (offset > 0) {
        params.append('offset', offset.toString())
      }

      const response = await fetch(`/api/search?${params}`)
      if (response.ok) {
        const data = await response.json()
        
        if (offset > 0 && searchResults) {
          // Append to existing results (load more)
          setSearchResults({
            ...data,
            items: [...searchResults.items, ...data.items]
          })
        } else {
          // New search results
          setSearchResults(data)
        }
      } else {
        toast.error('Failed to perform search')
      }
    } catch (error) {
      console.error('Error performing search:', error)
      toast.error('Search error occurred')
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      category: 'all',
      roomId: 'all',
      condition: 'all',
      minValue: '',
      maxValue: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    // Perform search after clearing filters
    setTimeout(() => performSearch(), 100)
  }

  const loadMore = () => {
    if (searchResults && searchResults.pagination.hasMore) {
      performSearch(searchResults.items.length)
    }
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'sortBy' && key !== 'sortOrder' && value && value !== 'all'
  )

  const categories = Array.from(
    new Set(
      searchResults?.items.map(item => item.category).filter(Boolean) || []
    )
  ).sort()

  const conditions = Array.from(
    new Set(
      searchResults?.items.map(item => item.condition).filter(Boolean) || []
    )
  ).sort()

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Advanced Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Query */}
            <div>
              <Label htmlFor="search-query">Search across all items</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="search-query"
                  placeholder="Search by name, description, notes, location, or serial number..."
                  value={filters.query}
                  onChange={(e) => handleFilterChange('query', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter Row */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Room</Label>
                <Select 
                  value={filters.roomId} 
                  onValueChange={(value) => handleFilterChange('roomId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Rooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: room.color || '#3B82F6' }}
                          />
                          {room.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category</Label>
                <Select 
                  value={filters.category} 
                  onValueChange={(value) => handleFilterChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category || 'Unknown'}>
                        {category || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Condition</Label>
                <Select 
                  value={filters.condition} 
                  onValueChange={(value) => handleFilterChange('condition', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    {conditions.map((condition) => (
                      <SelectItem key={condition} value={condition || 'Unknown'}>
                        {condition || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Sort By</Label>
                <div className="flex gap-2">
                  <Select 
                    value={filters.sortBy} 
                    onValueChange={(value) => handleFilterChange('sortBy', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Date Added</SelectItem>
                      <SelectItem value="updatedAt">Last Modified</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="value">Value</SelectItem>
                      <SelectItem value="quantity">Quantity</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleFilterChange('sortOrder', 
                      filters.sortOrder === 'asc' ? 'desc' : 'asc'
                    )}
                  >
                    {filters.sortOrder === 'asc' ? (
                      <SortAsc className="w-4 h-4" />
                    ) : (
                      <SortDesc className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Value Range */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-value">Minimum Value ($)</Label>
                <Input
                  id="min-value"
                  type="number"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={filters.minValue}
                  onChange={(e) => handleFilterChange('minValue', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="max-value">Maximum Value ($)</Label>
                <Input
                  id="max-value"
                  type="number"
                  placeholder="No limit"
                  min="0"
                  step="0.01"
                  value={filters.maxValue}
                  onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Search
              </Button>
              {hasActiveFilters && (
                <Button type="button" variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Search Results ({searchResults.pagination.total} items found)
              </span>
              {hasActiveFilters && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter className="w-4 h-4" />
                  Filters applied
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchResults.items.length > 0 ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {searchResults.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
                
                {searchResults.pagination.hasMore && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                      ) : null}
                      Load More Items
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No items found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search criteria or filters
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

