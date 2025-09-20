
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, Edit2, Trash2, Plus, Minus, MapPin, Layers, Package } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ScannedItem {
  id: string
  name: string
  description: string
  category: string
  quantity: number
  condition?: string
  estimatedValue?: number
  confidence: number
}

interface CameraScannerProps {
  onItemsScanned: (items: ScannedItem[]) => void
  onCancel: () => void
  scanMode: 'single' | 'batch'
  title: string
  description: string
}

const CATEGORY_OPTIONS = [
  'Tools', 'Automotive', 'Sports & Recreation', 'Garden & Lawn',
  'Storage & Organization', 'Cleaning Supplies', 'Home Improvement',
  'Electronics', 'Seasonal Items', 'Miscellaneous'
]

const CONDITION_OPTIONS = ['New', 'Excellent', 'Good', 'Fair', 'Poor', 'Broken']

export function CameraScanner({ onItemsScanned, onCancel, scanMode, title, description }: CameraScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [showPlacementSelection, setShowPlacementSelection] = useState(false)
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [racks, setRacks] = useState<any[]>([])
  const [selectedRack, setSelectedRack] = useState<string>('')
  const [selectedShelf, setSelectedShelf] = useState<string>('')
  const [selectedPosition, setSelectedPosition] = useState<string>('')
  const [placementMode, setPlacementMode] = useState<'direct' | 'staging'>('direct')
  const [stagingBoxes, setStagingBoxes] = useState<any[]>([])
  const [selectedBox, setSelectedBox] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch rooms and related data
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/rooms')
        if (response.ok) {
          const roomsData = await response.json()
          setRooms(roomsData)
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error)
      }
    }
    fetchRooms()
  }, [])

  // Fetch racks when room is selected
  useEffect(() => {
    const fetchRacks = async () => {
      if (!selectedRoom) {
        setRacks([])
        return
      }
      
      try {
        const response = await fetch(`/api/rooms/${selectedRoom}`)
        if (response.ok) {
          const roomData = await response.json()
          setRacks(roomData.racks || [])
          
          // Fetch staging boxes for this room
          const boxesResponse = await fetch(`/api/boxes?roomId=${selectedRoom}&staging=true`)
          if (boxesResponse.ok) {
            const boxesData = await boxesResponse.json()
            setStagingBoxes(boxesData)
          }
        }
      } catch (error) {
        console.error('Failed to fetch racks:', error)
      }
    }
    fetchRacks()
  }, [selectedRoom])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const scanItems = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first')
      return
    }

    setIsScanning(true)
    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('scanMode', scanMode)

      const response = await fetch('/api/scanning/analyze-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to analyze image')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let partialRead = ''

      while (true) {
        const { done, value } = await reader?.read() || {}
        if (done) break

        partialRead += decoder.decode(value, { stream: true })
        let lines = partialRead.split('\n')
        partialRead = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') return

            try {
              const parsed = JSON.parse(data)
              if (parsed.status === 'completed' && parsed.result) {
                const items: ScannedItem[] = parsed.result.items.map((item: any, index: number) => ({
                  id: `scanned-${Date.now()}-${index}`,
                  name: item.name || 'Unknown Item',
                  description: item.description || '',
                  category: item.category || 'Miscellaneous',
                  quantity: item.quantity || 1,
                  condition: item.condition || 'Good',
                  estimatedValue: item.estimatedValue || null,
                  confidence: item.confidence || 0.8
                }))
                setScannedItems(items)
                toast.success(`Found ${items.length} item${items.length !== 1 ? 's' : ''}!`)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Scanning error:', error)
      toast.error('Failed to scan items. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }

  const updateItem = (itemId: string, updates: Partial<ScannedItem>) => {
    setScannedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ))
  }

  const deleteItem = (itemId: string) => {
    setScannedItems(prev => prev.filter(item => item.id !== itemId))
    toast.success('Item removed')
  }

  const mergeItems = (sourceId: string, targetId: string) => {
    setScannedItems(prev => {
      const sourceItem = prev.find(item => item.id === sourceId)
      const targetItem = prev.find(item => item.id === targetId)
      
      if (!sourceItem || !targetItem) return prev

      // Merge quantities and keep target item's other properties
      const mergedItem = {
        ...targetItem,
        quantity: sourceItem.quantity + targetItem.quantity,
        description: targetItem.description || sourceItem.description
      }

      return prev
        .filter(item => item.id !== sourceId)
        .map(item => item.id === targetId ? mergedItem : item)
    })
    toast.success('Items merged successfully')
  }

  const handleSaveItems = () => {
    if (scannedItems.length === 0) {
      toast.error('No items to save')
      return
    }
    setShowPlacementSelection(true)
  }

  const handleFinalSave = () => {
    const itemsWithPlacement = scannedItems.map(item => ({
      ...item,
      placement: {
        mode: placementMode,
        roomId: selectedRoom,
        ...(placementMode === 'direct' ? {
          rackId: selectedRack,
          shelfNumber: parseInt(selectedShelf),
          positionNumber: parseInt(selectedPosition)
        } : {
          staging: true,
          boxId: selectedBox
        })
      }
    }))
    
    onItemsScanned(itemsWithPlacement)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        
        {scanMode === 'batch' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">📸 Tips for Best Results:</h4>
            <ul className="text-xs text-blue-700 space-y-1 text-left">
              <li>• Take a top-down photo with good lighting</li>
              <li>• Spread items out so they're clearly visible</li>
              <li>• Include brand names and labels when possible</li>
              <li>• Avoid shadows and blurry images</li>
              <li>• Keep the camera steady for sharp focus</li>
            </ul>
          </div>
        )}
      </div>

      {/* Image Upload Section */}
      {!imagePreview && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="space-y-4">
            <Camera className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 mb-4">Take a photo or upload an image</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Image
                </Button>
              </div>
              {/* Camera input for mobile devices */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Preview & Scanning */}
      {imagePreview && (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Selected for scanning"
              className="w-full max-h-64 object-contain rounded-lg border"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImagePreview('')
                setSelectedFile(null)
                setScannedItems([])
              }}
              className="absolute top-2 right-2"
            >
              Change Image
            </Button>
          </div>

          {scannedItems.length === 0 && (
            <div className="flex justify-center">
              <Button
                onClick={scanItems}
                disabled={isScanning}
                className="gap-2"
                size="lg"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing Image...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Scan Items
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Scanned Items Results */}
      {scannedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold">Scanned Items ({scannedItems.length})</h4>
            <p className="text-sm text-muted-foreground">Review and edit before saving</p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {scannedItems.map((item, index) => (
              <Card key={item.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {editingItem === item.id ? (
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(item.id, { name: e.target.value })}
                            className="font-semibold"
                          />
                        ) : (
                          item.name
                        )}
                        <Badge variant={item.confidence > 0.8 ? "default" : "secondary"}>
                          {Math.round(item.confidence * 100)}%
                        </Badge>
                      </CardTitle>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {editingItem === item.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          rows={2}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Category</Label>
                          <Select
                            value={item.category}
                            onValueChange={(value) => updateItem(item.id, { category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Condition</Label>
                          <Select
                            value={item.condition || ""}
                            onValueChange={(value) => updateItem(item.id, { condition: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITION_OPTIONS.map(cond => (
                                <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Quantity</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                              className="text-center"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <Label>Estimated Value ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.estimatedValue || ''}
                            onChange={(e) => updateItem(item.id, { estimatedValue: parseFloat(e.target.value) || undefined })}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">{item.category}</Badge>
                        <Badge variant="outline">Qty: {item.quantity}</Badge>
                        {item.condition && <Badge variant="outline">{item.condition}</Badge>}
                        {item.estimatedValue && <Badge variant="outline">${item.estimatedValue.toFixed(2)}</Badge>}
                      </div>
                    </div>
                  )}

                  {/* Merge Options */}
                  {scannedItems.length > 1 && index < scannedItems.length - 1 && (
                    <div className="pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => mergeItems(item.id, scannedItems[index + 1].id)}
                        className="text-xs"
                      >
                        Merge with next item
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <div className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSaveItems} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Choose Placement
            </Button>
          </div>
        </div>
      )}

      {/* Placement Selection */}
      {showPlacementSelection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Choose Item Placement
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Select where to store your {scannedItems.length} scanned item{scannedItems.length !== 1 ? 's' : ''}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Room Selection */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" />
                  Room
                </Label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Placement Mode Selection */}
              {selectedRoom && (
                <div>
                  <Label className="mb-2 block">Placement Type</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={placementMode === 'direct' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPlacementMode('direct')}
                      className="flex-1"
                    >
                      <Layers className="h-4 w-4 mr-1" />
                      Direct to Rack
                    </Button>
                    <Button
                      variant={placementMode === 'staging' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPlacementMode('staging')}
                      className="flex-1"
                    >
                      <Package className="h-4 w-4 mr-1" />
                      Staging Area
                    </Button>
                  </div>
                </div>
              )}

              {/* Direct Placement Options */}
              {placementMode === 'direct' && selectedRoom && (
                <div className="space-y-3">
                  {/* Rack Selection */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Layers className="h-4 w-4" />
                      Rack
                    </Label>
                    <Select value={selectedRack} onValueChange={setSelectedRack}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a rack" />
                      </SelectTrigger>
                      <SelectContent>
                        {racks.map(rack => (
                          <SelectItem key={rack.id} value={rack.id}>
                            {rack.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Shelf Selection */}
                  {selectedRack && (
                    <div>
                      <Label className="mb-2 block">Shelf Number</Label>
                      <Select value={selectedShelf} onValueChange={setSelectedShelf}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shelf" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: racks.find(r => r.id === selectedRack)?.maxShelves || 5 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              Shelf {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Position Selection */}
                  {selectedShelf && (
                    <div>
                      <Label className="mb-2 block">Position</Label>
                      <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: racks.find(r => r.id === selectedRack)?.positionsPerShelf || 6 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              Position {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Staging Placement Options */}
              {placementMode === 'staging' && selectedRoom && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4" />
                    Staging Box
                  </Label>
                  <Select value={selectedBox} onValueChange={setSelectedBox}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a staging box" />
                    </SelectTrigger>
                    <SelectContent>
                      {stagingBoxes.map(box => (
                        <SelectItem key={box.id} value={box.id}>
                          Box {box.boxNumber} - {box.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPlacementSelection(false)}
                >
                  Back to Items
                </Button>
                <Button
                  onClick={handleFinalSave}
                  disabled={
                    !selectedRoom || 
                    (placementMode === 'direct' && (!selectedRack || !selectedShelf || !selectedPosition)) ||
                    (placementMode === 'staging' && !selectedBox)
                  }
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Save Items
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
