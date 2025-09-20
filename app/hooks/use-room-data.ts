
'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'

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

interface VirtualContainer {
  id: string
  name: string
  description?: string
  category?: string
  items: Item[]
  itemCount: number
}

export const useRoomData = (roomId: string) => {
  const { data: session } = useSession()
  const [room, setRoom] = useState<Room | null>(null)
  const [racks, setRacks] = useState<Rack[]>([])
  const [boxes, setBoxes] = useState<Box[]>([])
  const [stagingBoxes, setStagingBoxes] = useState<Box[]>([])
  const [looseItems, setLooseItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchRoomData = useCallback(async (retryCount = 0): Promise<void> => {
    try {
      setLoading(true)
      setError('')
      
      console.log('🔍 Fetching room data for roomId:', roomId, retryCount > 0 ? `(retry ${retryCount})` : '')
      
      // Fetch room details
      const roomResponse = await fetch(`/api/rooms/${roomId}`)
      console.log('🏠 Room response status:', roomResponse.status)
      
      if (!roomResponse.ok) {
        const roomError = await roomResponse.text()
        console.error('❌ Room fetch failed:', roomError)
        
        if (roomResponse.status === 404) {
          throw new Error('This room no longer exists or has been deleted.')
        } else if (roomResponse.status === 401) {
          throw new Error('You need to sign in to view this room.')
        } else if (roomResponse.status >= 500 && retryCount < 2) {
          console.log(`🔄 Server error (${roomResponse.status}), retrying in ${(retryCount + 1) * 1000}ms...`)
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000))
          return fetchRoomData(retryCount + 1)
        } else {
          throw new Error(`Unable to load room (${roomResponse.status}). Please try again.`)
        }
      }
      
      const roomData = await roomResponse.json()
      console.log('✅ Room data loaded:', roomData.name)
      setRoom(roomData)

      // Fetch racks in this room
      const racksResponse = await fetch(`/api/racks?roomId=${roomId}`)
      console.log('🏗️ Racks response status:', racksResponse.status)
      
      if (racksResponse.ok) {
        const racksData = await racksResponse.json()
        console.log('✅ Racks data loaded:', racksData.length, 'racks')
        setRacks(racksData)
      } else {
        const racksError = await racksResponse.text()
        console.warn('⚠️ Racks fetch failed:', racksError)
      }

      // Fetch all boxes in this room
      const boxesResponse = await fetch(`/api/boxes?roomId=${roomId}&includeItems=true&includePosition=true`)
      console.log('📦 Boxes response status:', boxesResponse.status)
      
      if (boxesResponse.ok) {
        const boxesData = await boxesResponse.json()
        console.log('✅ Boxes data loaded:', boxesData.length, 'boxes')
        setBoxes(boxesData)
        
        // Separate staging boxes from placed boxes
        const staging = boxesData.filter((box: Box) => box.isStaging)
        const placed = boxesData.filter((box: Box) => !box.isStaging)
        setStagingBoxes(staging)
        console.log('📊 Staging boxes:', staging.length, 'Placed boxes:', placed.length)
      } else {
        const boxesError = await boxesResponse.text()
        console.warn('⚠️ Boxes fetch failed:', boxesError)
      }

      // Fetch loose items in this room
      const looseItemsResponse = await fetch(`/api/items?roomId=${roomId}`)
      console.log('📋 Loose items response status:', looseItemsResponse.status)
      
      if (looseItemsResponse.ok) {
        const allItems = await looseItemsResponse.json()
        const loose = allItems.filter((item: any) => !item.boxId && !item.positionId)
        setLooseItems(loose)
        console.log('✅ Loose items loaded:', loose.length, 'items')
      } else {
        const itemsError = await looseItemsResponse.text()
        console.warn('⚠️ Loose items fetch failed:', itemsError)
      }
      
      console.log('🎉 Room data fetch completed successfully')
      
    } catch (error) {
      console.error('💥 Error fetching room data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load room data'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  const markDataStale = useCallback(() => {
    localStorage.setItem('garagegrid_room_data_stale', 'true')
    localStorage.setItem('garagegrid_stale_room_id', roomId)
    console.log('🏠 Marked room data as stale')
  }, [roomId])

  return {
    // Data
    room,
    racks,
    boxes,
    stagingBoxes,
    looseItems,
    loading,
    error,
    
    // Actions
    fetchRoomData,
    markDataStale,
    
    // Setters for local updates
    setRoom,
    setRacks,
    setBoxes,
    setStagingBoxes,
    setLooseItems
  }
}
