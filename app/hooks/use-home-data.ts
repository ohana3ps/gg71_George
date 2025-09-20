
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
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

export function useHomeData() {
  const { data: session, status } = useSession()
  
  // Core data state
  const [rooms, setRooms] = useState<Room[]>([])
  const [allItems, setAllItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // UI state
  const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(false)
  const [isUniversalSearchOpen, setIsUniversalSearchOpen] = useState(false)
  
  // Search and recent activity
  const [recentRooms, setRecentRooms] = useState<Room[]>([])
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // Load stored data from localStorage
  useEffect(() => {
    try {
      const storedRooms = localStorage.getItem('garagegrid_recent_rooms')
      if (storedRooms) {
        const parsed = JSON.parse(storedRooms)
        setRecentRooms(Array.isArray(parsed) ? parsed : [])
      }
      
      const storedHistory = localStorage.getItem('garagegrid_search_history')
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory)
        setSearchHistory(Array.isArray(parsed) ? parsed : [])
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error)
    }
  }, [])

  // Track room visits
  const trackRoomVisit = useCallback((room: Room) => {
    try {
      const updatedRecent = [
        room,
        ...recentRooms.filter(r => r.id !== room.id)
      ].slice(0, 5)
      
      setRecentRooms(updatedRecent)
      localStorage.setItem('garagegrid_recent_rooms', JSON.stringify(updatedRecent))
    } catch (error) {
      console.error('Error tracking room visit:', error)
    }
  }, [recentRooms])

  // Track search history
  const addToSearchHistory = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) return
    
    try {
      const updatedHistory = [
        query,
        ...searchHistory.filter(h => h.toLowerCase() !== query.toLowerCase())
      ].slice(0, 10)
      
      setSearchHistory(updatedHistory)
      localStorage.setItem('garagegrid_search_history', JSON.stringify(updatedHistory))
    } catch (error) {
      console.error('Error tracking search history:', error)
    }
  }, [searchHistory])

  // Fetch rooms
  const fetchRooms = useCallback(async (bustCache = false) => {
    if (!session) return
    
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
      setRooms(fetchedRooms)
      return fetchedRooms
    } catch (error) {
      console.error('Error fetching rooms:', error)
      toast.error('Failed to load rooms')
      return []
    }
  }, [session])

  // Fetch all items for search
  const fetchAllItems = useCallback(async (bustCache = false) => {
    if (!session) return
    
    try {
      const url = bustCache 
        ? `/api/items/search?_t=${Date.now()}` 
        : '/api/items/search'
      
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
      
      const items = await response.json()
      setAllItems(items)
      return items
    } catch (error) {
      console.error('Error fetching items:', error)
      return []
    }
  }, [session])

  // Manual refresh function
  const handleForceRefresh = useCallback(async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchRooms(true),
        fetchAllItems(true)
      ])
      toast.success('Data refreshed successfully!')
    } catch (error) {
      console.error('Force refresh failed:', error)
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchRooms, fetchAllItems, isRefreshing])

  // Initial data load
  useEffect(() => {
    if (status === 'loading') return
    if (!session) return

    const loadInitialData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchRooms(),
          fetchAllItems()
        ])
      } catch (error) {
        console.error('Initial data load failed:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [session, status, fetchRooms, fetchAllItems])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Command/Ctrl + K for universal search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsUniversalSearchOpen(true)
        return
      }

      // Command/Ctrl + J for quick actions
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setIsQuickAccessOpen(true)
        return
      }

      // Escape to close overlays
      if (e.key === 'Escape') {
        setIsUniversalSearchOpen(false)
        setIsQuickAccessOpen(false)
        return
      }
    }

    document.addEventListener('keydown', handleGlobalShortcuts)
    return () => document.removeEventListener('keydown', handleGlobalShortcuts)
  }, [])

  // Check for stale data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading) {
        const lastRefresh = localStorage.getItem('garagegrid_last_refresh')
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000

        if (!lastRefresh || now - parseInt(lastRefresh) > fiveMinutes) {
          handleForceRefresh()
          localStorage.setItem('garagegrid_last_refresh', now.toString())
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [loading, handleForceRefresh])

  return {
    // Data
    rooms,
    allItems,
    loading,
    isRefreshing,
    recentRooms,
    searchHistory,
    
    // UI state
    isQuickAccessOpen,
    setIsQuickAccessOpen,
    isUniversalSearchOpen,
    setIsUniversalSearchOpen,
    
    // Actions
    trackRoomVisit,
    addToSearchHistory,
    handleForceRefresh,
    
    // Session
    session,
    status
  }
}
