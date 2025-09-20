

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface ShelfConfig {
  shelfNumber: number
  positions: number
}

interface RackFormProps {
  roomId: string
  onSubmit: (data: { 
    name: string
    rackNumber: number
    maxShelves: number
    positionsPerShelf: number
    shelfConfig?: ShelfConfig[]
    useAdvancedConfig: boolean
  }) => void
  onCancel: () => void
  onDelete?: () => void
  isLoading?: boolean
  isDeleting?: boolean
  initialData?: {
    name: string
    rackNumber: number
    maxShelves: number
    positionsPerShelf: number
    shelfConfig?: ShelfConfig[]
    configLocked?: boolean
  }
  isEditMode?: boolean
  nextAvailableRackNumber?: number
}

export function RackForm({ roomId, onSubmit, onCancel, onDelete, isLoading = false, isDeleting = false, initialData, isEditMode = false, nextAvailableRackNumber }: RackFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    rackNumber: initialData?.rackNumber || nextAvailableRackNumber || 1,
    maxShelves: initialData?.maxShelves || 5,
    positionsPerShelf: initialData?.positionsPerShelf || 6
  })
  
  const [rackNumberInput, setRackNumberInput] = useState<string>(
    String(initialData?.rackNumber || nextAvailableRackNumber || 1)
  )

  // Update input when nextAvailableRackNumber changes
  useEffect(() => {
    if (!isEditMode && nextAvailableRackNumber && !initialData?.rackNumber) {
      setRackNumberInput(String(nextAvailableRackNumber))
      setFormData(prev => ({ ...prev, rackNumber: nextAvailableRackNumber }))
    }
  }, [nextAvailableRackNumber, isEditMode, initialData?.rackNumber])

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

  const [useAdvancedConfig, setUseAdvancedConfig] = useState(!!initialData?.shelfConfig)
  const [shelfConfigs, setShelfConfigs] = useState<ShelfConfig[]>(() => {
    if (initialData?.shelfConfig) {
      return initialData.shelfConfig
    }
    // Initialize with default config
    return Array.from({ length: formData.maxShelves }, (_, i) => ({
      shelfNumber: i + 1,
      positions: formData.positionsPerShelf
    }))
  })

  const isConfigLocked = initialData?.configLocked || false

  // Update shelf configs when maxShelves changes
  const updateMaxShelves = (newMaxShelves: number) => {
    setFormData(prev => ({ ...prev, maxShelves: newMaxShelves }))
    
    setShelfConfigs(prev => {
      const updated = [...prev]
      
      if (newMaxShelves > prev.length) {
        // Add new shelves
        for (let i = prev.length; i < newMaxShelves; i++) {
          updated.push({
            shelfNumber: i + 1,
            positions: formData.positionsPerShelf
          })
        }
      } else if (newMaxShelves < prev.length) {
        // Remove excess shelves
        return updated.slice(0, newMaxShelves)
      }
      
      return updated
    })
  }

  const updateShelfPositions = (shelfNumber: number, positions: number) => {
    setShelfConfigs(prev => 
      prev.map(config => 
        config.shelfNumber === shelfNumber 
          ? { ...config, positions }
          : config
      )
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim()) {
      onSubmit({
        ...formData,
        shelfConfig: useAdvancedConfig ? shelfConfigs : undefined,
        useAdvancedConfig
      })
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Rack' : 'Create New Rack'}</CardTitle>
        {isConfigLocked && (
          <Badge variant="secondary" className="w-fit">
            Configuration Locked - Contains Items
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile-optimized form container with proper padding and sticky footer */}
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Rack Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Pantry Organizer Cart, Tool Rack, Storage Rack"
                disabled={isLoading}
                required
                onFocus={scrollToButtons}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rackNumber">Rack Number *</Label>
              <Input
                id="rackNumber"
                type="number"
                min="1"
                max="100"
                value={rackNumberInput}
                onChange={(e) => {
                  const value = e.target.value
                  setRackNumberInput(value)
                  
                  // Update formData only if value is valid
                  if (value !== '') {
                    const numValue = parseInt(value)
                    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
                      setFormData(prev => ({ ...prev, rackNumber: numValue }))
                    }
                  }
                }}
                onBlur={(e) => {
                  // Ensure we always have a valid value when leaving the field
                  const value = e.target.value
                  if (value === '' || isNaN(parseInt(value)) || parseInt(value) < 1) {
                    const fallbackNumber = nextAvailableRackNumber || 1
                    setRackNumberInput(String(fallbackNumber))
                    setFormData(prev => ({ ...prev, rackNumber: fallbackNumber }))
                  }
                }}
                onFocus={scrollToButtons}
                placeholder={nextAvailableRackNumber ? `${nextAvailableRackNumber} (suggested)` : "1"}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              {!isEditMode && nextAvailableRackNumber && 
                `Suggested: ${nextAvailableRackNumber} (next available) - You can type any available number 1-100`
              }
              {isEditMode && 
                `Current rack number - change only if needed`
              }
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxShelves">Number of Shelves</Label>
            <Select 
              value={formData.maxShelves.toString()} 
              onValueChange={(value) => updateMaxShelves(parseInt(value) || 5)}
              disabled={isConfigLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select number of shelves" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Shelves</SelectItem>
                <SelectItem value="3">3 Shelves</SelectItem>
                <SelectItem value="4">4 Shelves</SelectItem>
                <SelectItem value="5">5 Shelves</SelectItem>
                <SelectItem value="6">6 Shelves</SelectItem>
                <SelectItem value="7">7 Shelves</SelectItem>
                <SelectItem value="8">8 Shelves</SelectItem>
                <SelectItem value="9">9 Shelves</SelectItem>
                <SelectItem value="10">10 Shelves</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!useAdvancedConfig && (
            <div className="space-y-2">
              <Label htmlFor="positionsPerShelf">Positions per Shelf (Same for All)</Label>
              <Select 
                value={formData.positionsPerShelf.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, positionsPerShelf: parseInt(value) || 6 }))}
                disabled={isConfigLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select positions per shelf" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Position</SelectItem>
                  <SelectItem value="2">2 Positions</SelectItem>
                  <SelectItem value="3">3 Positions</SelectItem>
                  <SelectItem value="4">4 Positions</SelectItem>
                  <SelectItem value="5">5 Positions</SelectItem>
                  <SelectItem value="6">6 Positions</SelectItem>
                  <SelectItem value="7">7 Positions</SelectItem>
                  <SelectItem value="8">8 Positions</SelectItem>
                  <SelectItem value="9">9 Positions</SelectItem>
                  <SelectItem value="10">10 Positions</SelectItem>
                  <SelectItem value="11">11 Positions</SelectItem>
                  <SelectItem value="12">12 Positions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!isConfigLocked && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="advancedConfig"
                  checked={useAdvancedConfig}
                  onChange={(e) => setUseAdvancedConfig(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="advancedConfig" className="cursor-pointer">
                  Configure each shelf individually
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Enable this to set different numbers of positions for each shelf
              </p>
            </div>
          )}

          {useAdvancedConfig && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-medium">Individual Shelf Configuration</h3>
                {/* Scrollable container for shelf configurations */}
                <div className="max-h-[40vh] overflow-y-auto border rounded-lg">
                  <div className="space-y-3 p-1">
                    {shelfConfigs.map((config) => (
                      <div key={config.shelfNumber} className="flex items-center gap-3 p-4 border rounded-lg bg-white">
                        <div className="flex-1">
                          <Label className="font-medium">Shelf {config.shelfNumber}</Label>
                        </div>
                        <div className="flex-1">
                          <Select
                            value={config.positions.toString()}
                            onValueChange={(value) => updateShelfPositions(config.shelfNumber, parseInt(value) || 1)}
                            disabled={isConfigLocked}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 Position</SelectItem>
                              <SelectItem value="2">2 Positions</SelectItem>
                              <SelectItem value="3">3 Positions</SelectItem>
                              <SelectItem value="4">4 Positions</SelectItem>
                              <SelectItem value="5">5 Positions</SelectItem>
                              <SelectItem value="6">6 Positions</SelectItem>
                              <SelectItem value="7">7 Positions</SelectItem>
                              <SelectItem value="8">8 Positions</SelectItem>
                              <SelectItem value="9">9 Positions</SelectItem>
                              <SelectItem value="10">10 Positions</SelectItem>
                              <SelectItem value="11">11 Positions</SelectItem>
                              <SelectItem value="12">12 Positions</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {config.positions === 1 ? "Large Item" : `${config.positions} Spaces`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  <strong>Total positions:</strong> {shelfConfigs.reduce((sum, config) => sum + config.positions, 0)}
                </div>
              </div>
            </>
          )}
          </div>

          {/* Fixed footer with buttons - always visible */}
          <div className="border-t bg-white p-6">
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isLoading || isDeleting || !formData.name.trim()}
                className="flex-1"
              >
                {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Rack' : 'Create Rack')}
              </Button>
              {isEditMode && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={isLoading || isDeleting}
                  className="px-4"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading || isDeleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
