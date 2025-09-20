
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Command, Search, Filter, SortAsc, History, ArrowRight, X, Loader2 } from 'lucide-react'

interface SearchFilters {
  roomStatus: string
  itemCategory: string
  dateRange: string
}

interface SearchResults {
  rooms: any[]
  actions: any[]
  items: any[]
  recent: any[]
}

interface UniversalSearchProps {
  isOpen: boolean
  onClose: () => void
  rooms: any[]
  allItems: any[]
  recentRooms: any[]
  searchHistory: string[]
  onTrackRoomVisit: (room: any) => void
  onAddToSearchHistory: (query: string) => void
}

export function UniversalSearch({
  isOpen,
  onClose,
  rooms,
  allItems,
  recentRooms,
  searchHistory,
  onTrackRoomVisit,
  onAddToSearchHistory
}: UniversalSearchProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResults>({
    rooms: [],
    actions: [],
    items: [],
    recent: []
  })
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
  const [searchSortBy, setSearchSortBy] = useState<'relevance' | 'recency' | 'alphabetical'>('relevance')
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    roomStatus: 'all',
    itemCategory: 'all',
    dateRange: 'all'
  })
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)

  // Define quick actions for search
  const quickActions = [
    {
      id: 'scan-receipt',
      label: 'Scan Receipt',
      description: 'Add items by scanning a receipt',
      path: '/receipt-scanner',
      keywords: ['scan', 'receipt', 'add', 'camera', 'photo']
    },
    {
      id: 'create-room',
      label: 'Create Room',
      description: 'Add a new room to organize items',
      action: () => {
        onClose()
        // This would trigger the room form dialog
      },
      keywords: ['create', 'new', 'room', 'add', 'space']
    },
    {
      id: 'generate-recipe',
      label: 'Generate Recipe',
      description: 'Create recipes from available food items',
      path: '/recipe-generator',
      keywords: ['recipe', 'food', 'cook', 'generate', 'meal']
    },
    {
      id: 'analytics',
      label: 'Analytics Dashboard',
      description: 'View detailed analytics and insights',
      path: '/analytics',
      keywords: ['analytics', 'stats', 'insights', 'dashboard']
    },
    {
      id: 'expiration-dashboard',
      label: 'Expiration Dashboard',
      description: 'Check items nearing expiration',
      path: '/expiration-dashboard',
      keywords: ['expiration', 'expire', 'dates', 'spoil', 'fresh']
    },
    {
      id: 'export-data',
      label: 'Export Data',
      description: 'Export inventory data in various formats',
      path: '/export',
      keywords: ['export', 'backup', 'download', 'data', 'csv']
    },
    {
      id: 'insurance-report',
      label: 'Insurance Report',
      description: 'Generate insurance reports for items',
      path: '/insurance-report',
      keywords: ['insurance', 'report', 'claims', 'coverage']
    },
    {
      id: 'view-gallery',
      label: 'Item Gallery',
      description: 'Browse all items in a visual gallery',
      path: '/gallery',
      keywords: ['gallery', 'visual', 'browse', 'photos']
    }
  ]

  // Fuzzy search function
  const fuzzySearch = (query: string, text: string): boolean => {
    const queryLower = query.toLowerCase()
    const textLower = text.toLowerCase()
    
    // Exact match gets highest priority
    if (textLower.includes(queryLower)) return true
    
    // Character matching with gaps allowed
    let queryIndex = 0
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++
      }
    }
    return queryIndex === queryLower.length
  }

  // Advanced search with debouncing
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({
        rooms: [],
        actions: [],
        items: [],
        recent: recentRooms.slice(0, 3)
      })
      return
    }

    setIsLoadingSearch(true)

    try {
      // Search rooms
      let filteredRooms = rooms.filter(room => {
        const matchesQuery = fuzzySearch(query, room.name) || 
                           (room.description && fuzzySearch(query, room.description))
        
        // Apply room status filter
        if (searchFilters.roomStatus !== 'all') {
          const itemCount = room._count?.items || 0
          const rackCount = room._count?.racks || 0
          
          switch (searchFilters.roomStatus) {
            case 'active':
              return matchesQuery && itemCount > 3
            case 'ready':
              return matchesQuery && itemCount === 0 && rackCount > 0
            case 'empty':
              return matchesQuery && itemCount === 0 && rackCount === 0
            case 'low':
              return matchesQuery && itemCount > 0 && itemCount <= 3
            default:
              return matchesQuery
          }
        }
        
        return matchesQuery
      })

      // Search actions
      const filteredActions = quickActions.filter(action => 
        fuzzySearch(query, action.label) || 
        fuzzySearch(query, action.description) ||
        action.keywords.some(keyword => fuzzySearch(query, keyword))
      )

      // Search items
      let filteredItems = allItems.filter(item => {
        const matchesQuery = fuzzySearch(query, item.name) || 
                           (item.description && fuzzySearch(query, item.description)) ||
                           (item.brand && fuzzySearch(query, item.brand)) ||
                           (item.category && fuzzySearch(query, item.category))
        
        // Apply category filter
        if (searchFilters.itemCategory !== 'all' && item.category) {
          return matchesQuery && item.category.toLowerCase().includes(searchFilters.itemCategory.toLowerCase())
        }
        
        return matchesQuery
      })

      // Apply sorting
      const sortResults = (results: any[], type: 'rooms' | 'items' | 'actions') => {
        switch (searchSortBy) {
          case 'alphabetical':
            return results.sort((a, b) => (a.name || a.label).localeCompare(b.name || b.label))
          case 'recency':
            if (type === 'items') {
              return results.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
            }
            return results
          default: // relevance
            return results
        }
      }

      filteredRooms = sortResults(filteredRooms, 'rooms').slice(0, 4)
      filteredItems = sortResults(filteredItems, 'items').slice(0, 6)

      setSearchResults({
        rooms: filteredRooms,
        actions: filteredActions.slice(0, 4),
        items: filteredItems,
        recent: []
      })
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoadingSearch(false)
    }
  }, [rooms, allItems, searchFilters, searchSortBy, recentRooms])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      const totalResults = searchResults.rooms.length + searchResults.actions.length + searchResults.items.length + searchResults.recent.length

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedResultIndex(prev => (prev + 1) % totalResults)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedResultIndex(prev => prev <= 0 ? totalResults - 1 : prev - 1)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedResultIndex >= 0) {
            handleResultSelect(selectedResultIndex)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, searchResults, selectedResultIndex])

  const handleResultSelect = (index: number) => {
    let currentIndex = 0
    
    // Check rooms
    if (index < searchResults.rooms.length) {
      const room = searchResults.rooms[index]
      onTrackRoomVisit(room)
      router.push(`/rooms/${room.id}`)
      onClose()
      return
    }
    currentIndex += searchResults.rooms.length

    // Check actions
    if (index < currentIndex + searchResults.actions.length) {
      const action = searchResults.actions[index - currentIndex]
      if (action.path) {
        router.push(action.path)
      } else if (action.action) {
        action.action()
      }
      onClose()
      return
    }
    currentIndex += searchResults.actions.length

    // Check items
    if (index < currentIndex + searchResults.items.length) {
      const item = searchResults.items[index - currentIndex]
      router.push(`/rooms/${item.roomId}?itemId=${item.id}`)
      onClose()
      return
    }
    currentIndex += searchResults.items.length

    // Check recent
    if (index < currentIndex + searchResults.recent.length) {
      const room = searchResults.recent[index - currentIndex]
      onTrackRoomVisit(room)
      router.push(`/rooms/${room.id}`)
      onClose()
      return
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onAddToSearchHistory(searchQuery.trim())
      if (selectedResultIndex >= 0) {
        handleResultSelect(selectedResultIndex)
      } else if (searchResults.rooms.length > 0) {
        handleResultSelect(0)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <CardContent className="p-0">
          {/* Search Header */}
          <div className="p-4 border-b bg-gray-50">
            <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rooms, items, or actions... (Cmd+K)"
                  className="pl-10 pr-4"
                  autoFocus
                />
                {isLoadingSearch && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              
              {/* Search Filters */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="p-2 border-b">
                    <p className="text-xs font-medium text-gray-600 mb-2">Room Status</p>
                    {['all', 'active', 'ready', 'empty', 'low'].map(status => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => setSearchFilters(prev => ({ ...prev, roomStatus: status }))}
                        className={searchFilters.roomStatus === status ? 'bg-blue-50' : ''}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-600 mb-2">Sort By</p>
                    {(['relevance', 'recency', 'alphabetical'] as const).map(sort => (
                      <DropdownMenuItem
                        key={sort}
                        onClick={() => setSearchSortBy(sort)}
                        className={searchSortBy === sort ? 'bg-blue-50' : ''}
                      >
                        <SortAsc className="h-4 w-4 mr-2" />
                        {sort.charAt(0).toUpperCase() + sort.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchQuery.trim() === '' && (
              <div className="p-4">
                {/* Recent Rooms */}
                {searchResults.recent.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                      <History className="h-4 w-4 mr-1" />
                      Recent Rooms
                    </p>
                    <div className="space-y-1">
                      {searchResults.recent.map((room, index) => (
                        <div
                          key={room.id}
                          className={`p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${selectedResultIndex === index ? 'bg-blue-50' : ''}`}
                          onClick={() => handleResultSelect(index)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{room.name}</span>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search History */}
                {searchHistory.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Recent Searches</p>
                    <div className="space-y-1">
                      {searchHistory.slice(0, 5).map((query, index) => (
                        <div
                          key={index}
                          className="p-2 rounded-lg cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                          onClick={() => setSearchQuery(query)}
                        >
                          <span className="text-sm text-gray-600">{query}</span>
                          <Search className="h-3 w-3 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {searchQuery.trim() !== '' && (
              <>
                {/* Rooms Results */}
                {searchResults.rooms.length > 0 && (
                  <div className="p-4 border-b">
                    <p className="text-sm font-medium text-gray-600 mb-2">Rooms</p>
                    <div className="space-y-1">
                      {searchResults.rooms.map((room, index) => (
                        <div
                          key={room.id}
                          className={`p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${selectedResultIndex === index ? 'bg-blue-50' : ''}`}
                          onClick={() => handleResultSelect(index)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{room.name}</span>
                              <p className="text-sm text-gray-600">{room._count?.items || 0} items</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Results */}
                {searchResults.actions.length > 0 && (
                  <div className="p-4 border-b">
                    <p className="text-sm font-medium text-gray-600 mb-2">Actions</p>
                    <div className="space-y-1">
                      {searchResults.actions.map((action, index) => {
                        const resultIndex = searchResults.rooms.length + index
                        return (
                          <div
                            key={action.id}
                            className={`p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${selectedResultIndex === resultIndex ? 'bg-blue-50' : ''}`}
                            onClick={() => handleResultSelect(resultIndex)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{action.label}</span>
                                <p className="text-sm text-gray-600">{action.description}</p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Items Results */}
                {searchResults.items.length > 0 && (
                  <div className="p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Items</p>
                    <div className="space-y-1">
                      {searchResults.items.map((item, index) => {
                        const resultIndex = searchResults.rooms.length + searchResults.actions.length + index
                        return (
                          <div
                            key={item.id}
                            className={`p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${selectedResultIndex === resultIndex ? 'bg-blue-50' : ''}`}
                            onClick={() => handleResultSelect(resultIndex)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{item.name}</span>
                                <p className="text-sm text-gray-600">
                                  {item.category && <Badge variant="secondary" className="mr-1 text-xs">{item.category}</Badge>}
                                  in {rooms.find(r => r.id === item.roomId)?.name || 'Unknown Room'}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {searchResults.rooms.length === 0 && searchResults.actions.length === 0 && searchResults.items.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No results found for "{searchQuery}"</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <kbd className="bg-white border rounded px-1 mr-1">↵</kbd>
                to select
              </span>
              <span className="flex items-center">
                <kbd className="bg-white border rounded px-1 mr-1">↑↓</kbd>
                to navigate
              </span>
              <span className="flex items-center">
                <kbd className="bg-white border rounded px-1 mr-1">esc</kbd>
                to close
              </span>
            </div>
            <Command className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
