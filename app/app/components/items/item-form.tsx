
'use client'

import { useState, useEffect } from 'react'
import { Room, Item } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { DateDropdownSelector } from '@/components/ui/date-dropdown-selector'
import { FileUpload } from '@/components/ui/file-upload'
import { ScanItemButton } from '@/components/scanning'
import { Separator } from '@/components/ui/separator'

interface ItemWithRoom extends Item {
  room: {
    id: string
    name: string
    color: string
  }
}

// Enhanced context interface for Phase 2D-style intelligence
interface AddItemContext {
  roomId: string
  roomName: string
  roomColor?: string
  // Shelf/Rack context
  rackId?: string
  rackName?: string
  rackNumber?: number
  shelfNumber?: number
  positionNumber?: number
  positionCapacity?: number
  positionAvailable?: number
  // Box context
  boxId?: string
  boxName?: string
  boxNumber?: number
  boxSize?: string
  // Area context
  area?: 'staging' | 'shelf' | 'box' | 'room'
  // Smart suggestions
  suggestedPlacement?: 'box' | 'position' | 'room'
  recentlyUsedBoxes?: Array<{id: string, name: string, boxNumber: number}>
  availableStagingBoxes?: Array<{id: string, name: string, boxNumber: number}>
  availablePositions?: Array<{rackId: string, rackName: string, shelfNumber: number, positionNumber: number}>
}

interface ItemFormProps {
  item?: ItemWithRoom | null
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading?: boolean
  // Enhanced context support
  context?: AddItemContext
  // Legacy support (deprecated)
  defaultRoomId?: string
  defaultBoxId?: string
  contextInfo?: {
    boxName?: string
    boxNumber?: number
    roomName?: string
  }
}

const CONDITION_OPTIONS = [
  'New',
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Broken'
]

const CATEGORY_OPTIONS = [
  'Tools',
  'Automotive',
  'Sports & Recreation',
  'Garden & Lawn',
  'Storage & Organization',
  'Cleaning Supplies',
  'Home Improvement',
  'Electronics',
  'Seasonal Items',
  'Miscellaneous'
]

const FOOD_CATEGORY_OPTIONS = [
  'Produce - Fresh Fruits',
  'Produce - Fresh Vegetables', 
  'Produce - Herbs & Spices',
  'Meat - Beef',
  'Meat - Pork',
  'Meat - Chicken/Poultry',
  'Meat - Fish/Seafood',
  'Dairy - Milk & Cream',
  'Dairy - Cheese',
  'Dairy - Yogurt & Others',
  'Pantry - Grains & Rice',
  'Pantry - Pasta & Noodles',
  'Pantry - Canned Goods',
  'Pantry - Condiments & Sauces',
  'Pantry - Baking Supplies',
  'Pantry - Snacks',
  'Pantry - Oils & Vinegars',
  'Frozen - Vegetables',
  'Frozen - Fruits',
  'Frozen - Meals & Prepared',
  'Frozen - Ice Cream & Desserts',
  'Beverages - Non-alcoholic',
  'Beverages - Alcoholic',
  'Other Food Items'
]

const FOOD_UNIT_OPTIONS = [
  'pieces',
  'cups',
  'tablespoons',
  'teaspoons',
  'pounds',
  'ounces',
  'grams',
  'kilograms',
  'liters',
  'milliliters',
  'cans',
  'bottles',
  'packages',
  'bags',
  'bunches',
  'heads',
  'cloves',
  'slices'
]

export function ItemForm({ 
  item, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  context,
  // Legacy support
  defaultRoomId,
  defaultBoxId,
  contextInfo
}: ItemFormProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [boxes, setBoxes] = useState<any[]>([])
  const [racks, setRacks] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false)
  const [isLoadingRacks, setIsLoadingRacks] = useState(false)
  const [purchaseDate, setPurchaseDate] = useState<Date>()
  const [showScanning, setShowScanning] = useState(!item) // Show scanning for new items
  
  // Phase 2D-style smart features
  const [isSmartMode, setIsSmartMode] = useState(true)
  const [showContextInfo, setShowContextInfo] = useState(true)
  const [contextApplied, setContextApplied] = useState(false)
  const [userPreferences, setUserPreferences] = useState<{
    preferredPlacement: 'box' | 'position' | 'room'
    recentCategories: string[]
    avgAdditionTime: number
  }>({
    preferredPlacement: 'box',
    recentCategories: [],
    avgAdditionTime: 0
  })

  // Mobile keyboard handling - scroll to show buttons when input is focused
  const scrollToButtons = () => {
    setTimeout(() => {
      const buttonsElement = document.querySelector('[data-mobile-form-buttons]')
      if (buttonsElement) {
        buttonsElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        })
      }
    }, 300) // Delay to allow keyboard to appear
  }
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    quantity: '1',
    value: '',
    condition: '',
    location: '',
    notes: '',
    photoUrl: '',
    serialNumber: '',
    roomId: defaultRoomId || '',
    boxId: defaultBoxId || '',
    // Placement type and loose item fields
    placementType: defaultBoxId ? 'box' : 'room', // 'box', 'room', 'position'
    rackId: '',
    shelfNumber: '',
    positionNumber: '',
    // Food-specific fields
    isFood: false,
    foodCategory: '',
    foodUnit: ''
  })
  
  const [expirationDate, setExpirationDate] = useState<Date>()

  // Load rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/rooms')
        if (response.ok) {
          const data = await response.json()
          setRooms(data)
        }
      } catch (error) {
        console.error('Error fetching rooms:', error)
      } finally {
        setIsLoadingRooms(false)
      }
    }

    fetchRooms()
  }, [])

  // Smart context application - Phase 2D style intelligence
  useEffect(() => {
    if (!context || contextApplied) return

    // Apply smart context pre-population
    const applySmartContext = () => {
      const contextFormData: any = {
        // Always set room from context
        roomId: context.roomId,
        // Smart placement detection
        placementType: context.suggestedPlacement || (
          context.area === 'box' ? 'box' :
          context.area === 'shelf' ? 'position' :
          context.area === 'staging' ? 'box' : 'room'
        )
      }

      // Apply box context if available
      if (context.boxId && context.area === 'box') {
        contextFormData.boxId = context.boxId
        contextFormData.placementType = 'box'
      }

      // Apply shelf/position context if available  
      if (context.rackId && context.shelfNumber && context.positionNumber && context.area === 'shelf') {
        contextFormData.rackId = context.rackId
        contextFormData.shelfNumber = context.shelfNumber.toString()
        contextFormData.positionNumber = context.positionNumber.toString()
        contextFormData.placementType = 'position'
      }

      // Merge with existing form data
      setFormData(prev => ({
        ...prev,
        ...contextFormData
      }))

      setContextApplied(true)

      // Success feedback
      if (isSmartMode) {
        console.log('🧠 Smart context applied:', {
          area: context.area,
          placement: contextFormData.placementType,
          location: context.area === 'box' 
            ? `${context.boxName} (Box ${context.boxNumber})`
            : context.area === 'shelf' 
              ? `${context.rackName} Shelf ${context.shelfNumber} Position ${context.positionNumber}`
              : context.roomName
        })
      }
    }

    // Apply context after a short delay to ensure form is ready
    setTimeout(applySmartContext, 100)
  }, [context, contextApplied, isSmartMode])

  // Load user preferences from localStorage 
  useEffect(() => {
    if (!context?.roomId) return

    const savedPreferences = localStorage.getItem(`garageGrid_itemForm_preferences_${context.roomId}`)
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences)
        setUserPreferences(preferences)
      } catch (error) {
        console.error('Error loading item form preferences:', error)
      }
    }
  }, [context?.roomId])

  // Load boxes and racks when room is selected
  useEffect(() => {
    const fetchBoxes = async () => {
      if (!formData.roomId) {
        setBoxes([])
        return
      }

      setIsLoadingBoxes(true)
      try {
        const response = await fetch(`/api/boxes?roomId=${formData.roomId}`)
        if (response.ok) {
          const data = await response.json()
          
          // If we have staging boxes from context, prioritize them
          if (context?.availableStagingBoxes && context.area === 'staging') {
            // Merge staging boxes with fetched boxes, prioritizing staging boxes
            const stagingBoxIds = new Set(context.availableStagingBoxes.map(b => b.id))
            const nonStagingBoxes = data.filter((box: any) => !stagingBoxIds.has(box.id))
            
            // Convert context staging boxes to full box objects
            const fullStagingBoxes = context.availableStagingBoxes.map(stagingBox => {
              const fullBox = data.find((box: any) => box.id === stagingBox.id)
              return fullBox || {
                id: stagingBox.id,
                boxNumber: stagingBox.boxNumber,
                name: stagingBox.name,
                isStaging: true
              }
            })
            
            setBoxes([...fullStagingBoxes, ...nonStagingBoxes])
          } else {
            setBoxes(data)
          }
        } else {
          setBoxes([])
        }
      } catch (error) {
        console.error('Error fetching boxes:', error)
        setBoxes([])
      } finally {
        setIsLoadingBoxes(false)
      }
    }

    const fetchRacks = async () => {
      if (!formData.roomId) {
        setRacks([])
        return
      }

      setIsLoadingRacks(true)
      try {
        const response = await fetch(`/api/racks?roomId=${formData.roomId}`)
        if (response.ok) {
          const data = await response.json()
          setRacks(data)
        } else {
          setRacks([])
        }
      } catch (error) {
        console.error('Error fetching racks:', error)
        setRacks([])
      } finally {
        setIsLoadingRacks(false)
      }
    }

    fetchBoxes()
    fetchRacks()
  }, [formData.roomId, context?.availableStagingBoxes, context?.area])

  // Load positions when rack is selected
  useEffect(() => {
    const fetchPositions = async () => {
      if (!formData.rackId) {
        setPositions([])
        return
      }

      try {
        const response = await fetch(`/api/racks/${formData.rackId}/positions`)
        if (response.ok) {
          const data = await response.json()
          setPositions(data)
        } else {
          setPositions([])
        }
      } catch (error) {
        console.error('Error fetching positions:', error)
        setPositions([])
      }
    }

    fetchPositions()
  }, [formData.rackId])

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      const itemData = item as any
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        quantity: item.quantity?.toString() || '1',
        value: item.value?.toString() || '',
        condition: item.condition || '',
        location: item.location || '',
        notes: item.notes || '',
        photoUrl: item.photoUrl || '',
        serialNumber: item.serialNumber || '',
        roomId: item.roomId || '',
        boxId: itemData.boxId || '',
        // Placement type logic
        placementType: itemData.boxId ? 'box' : itemData.positionId ? 'position' : 'room',
        rackId: itemData.position?.rackId || '',
        shelfNumber: itemData.position?.shelfNumber?.toString() || '',
        positionNumber: itemData.position?.positionNumber?.toString() || '',
        // Food-specific fields
        isFood: itemData.isFood || false,
        foodCategory: itemData.foodCategory || '',
        foodUnit: itemData.foodUnit || ''
      })
      if (item.purchaseDate) {
        setPurchaseDate(new Date(item.purchaseDate))
      }
      if (itemData.expirationDate) {
        setExpirationDate(new Date(itemData.expirationDate))
      }
    } else {
      // Reset form for new item - support both new context and legacy props
      const initialRoomId = context?.roomId || defaultRoomId || ''
      const initialBoxId = context?.boxId || defaultBoxId || ''
      const initialPlacementType = context?.suggestedPlacement || (initialBoxId ? 'box' : 'room')
      
      setFormData({
        name: '',
        description: '',
        category: userPreferences.recentCategories[0] || '', // Smart category suggestion
        quantity: '1',
        value: '',
        condition: '',
        location: '',
        notes: '',
        photoUrl: '',
        serialNumber: '',
        roomId: initialRoomId,
        boxId: initialBoxId,
        // Placement type and loose item fields with smart defaults
        placementType: initialPlacementType,
        rackId: context?.rackId || '',
        shelfNumber: context?.shelfNumber?.toString() || '',
        positionNumber: context?.positionNumber?.toString() || '',
        // Food-specific fields
        isFood: false,
        foodCategory: '',
        foodUnit: ''
      })
      setPurchaseDate(undefined)
      setExpirationDate(undefined)
      
      // Reset context applied flag for new items
      setContextApplied(false)
    }
  }, [item, defaultRoomId, defaultBoxId, context, userPreferences.recentCategories])

  const handleInputChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  const handleSelectChange = (field: string) => (value: string) => {
    setFormData(prev => {
      // Convert special placeholder/none values to empty strings for storage
      let actualValue = value
      if (value === 'no-box' || value === 'none' || value === 'select-room' || value === 'select-rack') {
        actualValue = ''
      }
      
      const newData = {
        ...prev,
        [field]: actualValue
      }
      
      // Clear dependent fields when parent changes
      if (field === 'roomId' && value !== prev.roomId) {
        newData.boxId = ''
        newData.rackId = ''
        newData.shelfNumber = ''
        newData.positionNumber = ''
      }
      
      if (field === 'placementType') {
        // Reset related fields when placement type changes
        newData.boxId = ''
        newData.rackId = ''
        newData.shelfNumber = ''
        newData.positionNumber = ''
      }
      
      if (field === 'rackId' && value !== prev.rackId) {
        newData.shelfNumber = ''
        newData.positionNumber = ''
      }
      
      if (field === 'shelfNumber' && value !== prev.shelfNumber) {
        newData.positionNumber = ''
      }
      
      return newData
    })
  }

  const handlePhotoUpload = (photoUrl: string) => {
    setFormData(prev => ({
      ...prev,
      photoUrl: photoUrl
    }))
  }

  const handleScannedItems = (scannedItems: any[]) => {
    if (scannedItems.length > 0) {
      const firstItem = scannedItems[0]
      setFormData(prev => ({
        ...prev,
        name: firstItem.name || prev.name,
        description: firstItem.description || prev.description,
        category: firstItem.category || prev.category,
        quantity: firstItem.quantity?.toString() || prev.quantity,
        value: firstItem.value?.toString() || prev.value,
        condition: firstItem.condition || prev.condition,
        notes: firstItem.notes || prev.notes
      }))
      setShowScanning(false)
    }
  }

  const handleCheckboxChange = (field: string) => (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Determine storage type and position based on placement type
    let storageType = 'loose' // Default to loose
    let positionId = null
    let boxId = null

    if (formData.placementType === 'box' && formData.boxId) {
      storageType = 'boxed'
      boxId = formData.boxId
    } else if (formData.placementType === 'position' && formData.rackId && formData.shelfNumber && formData.positionNumber) {
      // Find the position ID based on rack, shelf, and position numbers
      const position = positions.find(p => 
        p.rackId === formData.rackId && 
        p.shelfNumber === parseInt(formData.shelfNumber) && 
        p.positionNumber === parseInt(formData.positionNumber)
      )
      if (position) {
        positionId = position.id
      }
    }
    
    const submitData = {
      ...formData,
      quantity: parseInt(formData.quantity) || 1,
      value: formData.value ? parseFloat(formData.value) : null,
      purchaseDate: purchaseDate?.toISOString() || null,
      // Storage type and placement
      storageType: storageType,
      positionId: positionId,
      boxId: boxId,
      // Food-specific fields
      isFood: formData.isFood,
      foodCategory: formData.isFood && formData.foodCategory ? formData.foodCategory : null,
      foodUnit: formData.isFood && formData.foodUnit ? formData.foodUnit : null,
      expirationDate: formData.isFood && expirationDate ? expirationDate.toISOString() : null
    }
    
    onSubmit(submitData)
  }

  return (
    <>
      <DialogHeader>
        {/* Enhanced Header with smart features */}
        <div className="flex items-center justify-between mb-2">
          <DialogTitle>
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
          
          <div className="flex items-center gap-2">
            {/* Smart Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsSmartMode(!isSmartMode)}
              className={`px-2 py-1 text-xs rounded-full transition-all ${
                isSmartMode 
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isSmartMode ? 'Smart Mode: ON' : 'Smart Mode: OFF'}
            >
              {isSmartMode ? '🧠 Smart' : '⚙️ Basic'}
            </button>

            {/* Context Info Toggle */}
            {context && (
              <button
                type="button"
                onClick={() => setShowContextInfo(!showContextInfo)}
                className={`px-2 py-1 text-xs rounded-full transition-all ${
                  showContextInfo 
                    ? 'bg-green-100 text-green-700 ring-1 ring-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Toggle Context Information"
              >
                📍 Context
              </button>
            )}
          </div>
        </div>

        {/* Smart Context Display */}
        {context && showContextInfo && (
          <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 via-green-50 to-purple-50 border border-blue-200 rounded-xl shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500">
                  <span className="text-white text-sm">
                    {context.area === 'box' ? '📦' : context.area === 'shelf' ? '🗄️' : context.area === 'staging' ? '📋' : '🏠'}
                  </span>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-blue-800 text-sm">
                    📍 Smart Location Context
                  </h4>
                  {isSmartMode && contextApplied && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      ✨ Applied
                    </span>
                  )}
                </div>
                
                {/* Context Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-700">Room:</span>
                    <span className="text-blue-800">{context.roomName}</span>
                    {context.roomColor && (
                      <div 
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: context.roomColor }}
                      />
                    )}
                  </div>

                  {context.area === 'box' && context.boxName && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-700">Target:</span>
                      <span className="text-blue-800">
                        Box {context.boxNumber} - {context.boxName}
                        {context.boxSize && <span className="text-blue-600 ml-1">({context.boxSize})</span>}
                      </span>
                    </div>
                  )}

                  {context.area === 'shelf' && context.rackName && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-700">Target:</span>
                      <span className="text-blue-800">
                        {context.rackName} → Shelf {context.shelfNumber} → Position {context.positionNumber}
                      </span>
                      {context.positionAvailable !== undefined && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {context.positionAvailable} available
                        </span>
                      )}
                    </div>
                  )}

                  {context.area === 'staging' && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-700">Target:</span>
                      <span className="text-blue-800">Staging Area</span>
                    </div>
                  )}
                </div>

                {/* Smart Tip */}
                {isSmartMode && (
                  <div className="mt-3 pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-600">
                      💡 The form has been pre-populated with your current location. 
                      You can change the destination if needed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Legacy context support (fallback) */}
        {!context && contextInfo && (defaultBoxId || defaultRoomId) && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              {defaultBoxId && contextInfo.boxName ? (
                <p>
                  <strong>Adding to Box:</strong> Box {contextInfo.boxNumber} - {contextInfo.boxName}
                  {contextInfo.roomName && <span className="text-blue-600 ml-2">({contextInfo.roomName})</span>}
                </p>
              ) : defaultRoomId && contextInfo.roomName ? (
                <p>
                  <strong>Adding to Room:</strong> {contextInfo.roomName}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </DialogHeader>

      {/* Mobile-optimized form container with proper padding */}
      <div className="max-h-[70vh] sm:max-h-none overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">

      {/* AI Scanning Option */}
      {showScanning && !item && (
        <div className="space-y-4">
          <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              Speed up item entry with AI scanning
            </p>
            <ScanItemButton
              onItemsScanned={handleScannedItems}
              mode="single"
              buttonText="Scan Item Details"
            />
            <p className="text-xs text-gray-500 mt-2">
              Or fill out the form manually below
            </p>
          </div>
          <Separator />
        </div>
      )}

      {/* Manual Entry Option */}
      {!showScanning && !item && (
        <div className="flex justify-end mb-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowScanning(true)}
            className="text-sm"
          >
            Use AI Scanning Instead
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* Basic Information */}
        <div className="space-y-4 md:col-span-2">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Item name"
              required
              onFocus={scrollToButtons}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Brief description of the item"
              rows={2}
              onFocus={scrollToButtons}
            />
          </div>
        </div>

        {/* Room Selection */}
        <div>
          <Label htmlFor="room">Room *</Label>
          <Select
            value={formData.roomId || "select-room"}
            onValueChange={handleSelectChange('roomId')}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="select-room" disabled>Select a room</SelectItem>
              {isLoadingRooms ? (
                <SelectItem value="loading" disabled>Loading rooms...</SelectItem>
              ) : rooms.length === 0 ? (
                <SelectItem value="no-rooms" disabled>No rooms available</SelectItem>
              ) : (
                rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Placement Type Selection */}
        <div className="md:col-span-2">
          <Label htmlFor="placementType">Item Placement</Label>
          <Select
            value={formData.placementType}
            onValueChange={handleSelectChange('placementType')}
            disabled={!formData.roomId}
          >
            <SelectTrigger>
              <SelectValue placeholder={!formData.roomId ? "Select room first" : "Select placement type"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="box">Place in Box</SelectItem>
              <SelectItem value="position">Place on Rack Position</SelectItem>
              <SelectItem value="room">Place freely in Room</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {formData.placementType === 'box' && "Place item inside a storage box"}
            {formData.placementType === 'position' && "Place item directly on a specific rack position"}
            {formData.placementType === 'room' && "Place item somewhere in the room with text description"}
          </p>
        </div>

        {/* Box Selection - Show when placement type is 'box' */}
        {formData.placementType === 'box' && (
          <div>
            <Label htmlFor="box">Select Box</Label>
            <Select
              value={formData.boxId || "select-box"}
              onValueChange={handleSelectChange('boxId')}
              disabled={!formData.roomId}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !formData.roomId 
                    ? "Select room first" 
                    : isLoadingBoxes 
                      ? "Loading boxes..." 
                      : "Select a box"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select-box" disabled>Select a box</SelectItem>
                {isLoadingBoxes ? (
                  <SelectItem value="loading" disabled>Loading boxes...</SelectItem>
                ) : boxes.length === 0 ? (
                  <SelectItem value="no-boxes" disabled>No boxes available in this room</SelectItem>
                ) : (
                  boxes.map((box) => (
                    <SelectItem key={box.id} value={box.id}>
                      Box {box.boxNumber} - {box.name} {box.isStaging ? '(Staging)' : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Rack Position Selection - Show when placement type is 'position' */}
        {formData.placementType === 'position' && (
          <>
            <div>
              <Label htmlFor="rack">Select Rack</Label>
              <Select
                value={formData.rackId || "select-rack"}
                onValueChange={handleSelectChange('rackId')}
                disabled={!formData.roomId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.roomId 
                      ? "Select room first" 
                      : isLoadingRacks 
                        ? "Loading racks..." 
                        : "Select a rack"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select-rack" disabled>Select a rack</SelectItem>
                  {isLoadingRacks ? (
                    <SelectItem value="loading" disabled>Loading racks...</SelectItem>
                  ) : racks.length === 0 ? (
                    <SelectItem value="no-racks" disabled>No racks available in this room</SelectItem>
                  ) : (
                    racks.map((rack) => (
                      <SelectItem key={rack.id} value={rack.id}>
                        Rack {rack.rackNumber} - {rack.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="shelf">Shelf Number</Label>
              <Select
                value={formData.shelfNumber || "select-shelf"}
                onValueChange={handleSelectChange('shelfNumber')}
                disabled={!formData.rackId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!formData.rackId ? "Select rack first" : "Select shelf"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select-shelf" disabled>Select shelf</SelectItem>
                  {formData.rackId && racks.find(r => r.id === formData.rackId) && (
                    Array.from({ length: racks.find(r => r.id === formData.rackId)?.maxShelves || 0 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        Shelf {i + 1}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="position">Position Number</Label>
              <Select
                value={formData.positionNumber || "select-position"}
                onValueChange={handleSelectChange('positionNumber')}
                disabled={!formData.rackId || !formData.shelfNumber}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.rackId || !formData.shelfNumber 
                      ? "Select rack and shelf first" 
                      : "Select position"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select-position" disabled>Select position</SelectItem>
                  {formData.rackId && formData.shelfNumber && racks.find(r => r.id === formData.rackId) && (
                    Array.from({ length: racks.find(r => r.id === formData.rackId)?.positionsPerShelf || 0 }, (_, i) => {
                      const position = positions.find(p => 
                        p.rackId === formData.rackId && 
                        p.shelfNumber === parseInt(formData.shelfNumber) && 
                        p.positionNumber === i + 1
                      )
                      const occupancy = position ? (position.boxPositions?.length || 0) + (position.looseItems?.length || 0) : 0
                      const capacity = position?.capacity || 1
                      const available = capacity - occupancy
                      
                      return (
                        <SelectItem 
                          key={i + 1} 
                          value={(i + 1).toString()}
                          disabled={available <= 0}
                        >
                          Position {i + 1} {available <= 0 ? '(Full)' : `(${available} available)`}
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Category */}
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category || "none"}
            onValueChange={handleSelectChange('category')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Category</SelectItem>
              {CATEGORY_OPTIONS.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Food Item Toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isFood"
            checked={formData.isFood}
            onCheckedChange={handleCheckboxChange('isFood')}
          />
          <Label htmlFor="isFood" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            This is a food item 🍳
          </Label>
        </div>

        {/* Food-specific fields (only show when isFood is true) */}
        {formData.isFood && (
          <>
            {/* Food Category */}
            <div>
              <Label htmlFor="foodCategory">Food Category</Label>
              <Select
                value={formData.foodCategory || "none"}
                onValueChange={handleSelectChange('foodCategory')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select food category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Food Category</SelectItem>
                  {FOOD_CATEGORY_OPTIONS.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Food Unit */}
            <div>
              <Label htmlFor="foodUnit">Food Unit</Label>
              <Select
                value={formData.foodUnit || "none"}
                onValueChange={handleSelectChange('foodUnit')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Unit</SelectItem>
                  {FOOD_UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expiration Date */}
            <div>
              <Label>Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate ? format(expirationDate, 'PPP') : 'Pick expiration date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expirationDate}
                    onSelect={setExpirationDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty if item doesn't expire
              </p>
            </div>
          </>
        )}

        {/* Quantity */}
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={formData.quantity}
            onChange={handleInputChange('quantity')}
            placeholder="1"
          />
        </div>

        {/* Value */}
        <div>
          <Label htmlFor="value">Value ($)</Label>
          <Input
            id="value"
            type="number"
            min="0"
            step="0.01"
            value={formData.value}
            onChange={handleInputChange('value')}
            placeholder="0.00"
          />
        </div>

        {/* Condition */}
        <div>
          <Label htmlFor="condition">Condition</Label>
          <Select
            value={formData.condition || "none"}
            onValueChange={handleSelectChange('condition')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              {CONDITION_OPTIONS.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {condition}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location">
            {formData.boxId ? 'Location within box (optional)' : 'Location within room'}
          </Label>
          <Input
            id="location"
            value={formData.location}
            onChange={handleInputChange('location')}
            placeholder={
              formData.boxId 
                ? "e.g., Bottom compartment, Left side, Wrapped in cloth"
                : "e.g., Top shelf, Corner, Workbench"
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.boxId 
              ? "Describe where in the box this item is located" 
              : "Describe where in the room this item is located"
            }
          </p>
        </div>

        {/* Serial Number */}
        <div>
          <Label htmlFor="serialNumber">Serial Number</Label>
          <Input
            id="serialNumber"
            value={formData.serialNumber}
            onChange={handleInputChange('serialNumber')}
            placeholder="Serial or model number"
          />
        </div>

        {/* Purchase Date */}
        <div>
          <DateDropdownSelector
            selected={purchaseDate}
            onSelect={setPurchaseDate}
            label="Purchase Date"
            placeholder="When did you get this item?"
            minYear={2015}
            maxYear={new Date().getFullYear()}
          />
        </div>

        {/* Photo Upload */}
        <div className="md:col-span-2">
          <Label>Item Photo</Label>
          <div className="mt-2">
            <FileUpload
              onUpload={handlePhotoUpload}
              currentImage={formData.photoUrl}
              className="w-full"
            />
          </div>
          {formData.photoUrl && (
            <div className="mt-2">
              <Input
                type="url"
                value={formData.photoUrl}
                onChange={handleInputChange('photoUrl')}
                placeholder="Or paste an image URL"
                className="text-sm"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={handleInputChange('notes')}
            placeholder="Additional notes, warranty info, etc."
            rows={3}
          />
        </div>
      </div>

          {/* Mobile-optimized button container with proper spacing */}
          <div 
            className="flex justify-end gap-3 pt-4 pb-4 sm:pb-0 border-t md:col-span-2"
            data-mobile-form-buttons
            style={{
              /* Ensure buttons are always visible above mobile keyboards */
              paddingBottom: 'env(keyboard-inset-height, 1rem)',
              marginBottom: 'env(keyboard-inset-height, 0px)'
            }}
          >
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim() || !formData.roomId}>
              {isLoading ? 'Saving...' : (item ? 'Update Item' : 'Create Item')}
            </Button>
          </div>
        </form>
      </div>
      
      {/* Additional mobile spacing to prevent keyboard coverage */}
      <div className="h-4 sm:hidden" />
    </>
  )
}
