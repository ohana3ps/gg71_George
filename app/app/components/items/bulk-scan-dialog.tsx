
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScanItemButton } from '@/components/scanning'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Package2, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface BulkScanDialogProps {
  boxId: string
  boxName: string
  onItemsAdded: () => void
}

export function BulkScanDialog({ boxId, boxName, onItemsAdded }: BulkScanDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedItems, setScannedItems] = useState<any[]>([])
  const [processedItems, setProcessedItems] = useState<string[]>([])

  const handleScannedItems = async (items: any[]) => {
    if (items.length === 0) return
    
    setIsProcessing(true)
    setScannedItems(items)
    
    try {
      const addedItems: string[] = []
      
      // Process each scanned item
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        try {
          console.log(`📦 Adding item ${i + 1}/${items.length}:`, item.name)
          
          const response = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...item,
              boxId: boxId, // Associate with current box
              quantity: item.quantity || 1,
              value: item.value || null
            })
          })

          if (response.ok) {
            const savedItem = await response.json()
            addedItems.push(savedItem.name)
            setProcessedItems(prev => [...prev, savedItem.name])
            console.log(`✅ Successfully added: ${savedItem.name}`)
          } else {
            const errorData = await response.json()
            console.error(`❌ Failed to add item: ${item.name}`, errorData)
            toast.error(`Failed to add: ${item.name}`)
          }
          
          // Small delay to prevent overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500))
          
        } catch (itemError) {
          console.error(`💥 Error adding item: ${item.name}`, itemError)
          toast.error(`Error adding: ${item.name}`)
        }
      }

      if (addedItems.length > 0) {
        toast.success(`Successfully added ${addedItems.length} items to ${boxName}!`)
        onItemsAdded() // Refresh the items list
        
        // Close dialog after a short delay to let user see results
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        toast.error('No items were successfully added')
      }
      
    } catch (error) {
      console.error('💥 Bulk scan processing error:', error)
      toast.error('Failed to process scanned items')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setScannedItems([])
    setProcessedItems([])
    setIsProcessing(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-50">
          <Package2 className="h-4 w-4" />
          Add Box Contents
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5 text-green-600" />
            Add Box Contents
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Box Info */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-green-800">
              Scanning items for: <strong>{boxName}</strong>
            </p>
            <p className="text-xs text-green-600 mt-1">
              Take a top-down photo of your box contents for AI identification
            </p>
          </div>

          {/* Scanning Interface */}
          {!isProcessing && scannedItems.length === 0 && (
            <div className="text-center py-6">
              <ScanItemButton
                onItemsScanned={handleScannedItems}
                mode="batch"
                buttonText="📷 Scan Box Contents"
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
              />
              <p className="text-xs text-gray-500 mt-3">
                Position your camera above the box and capture all visible items
              </p>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              </div>
              
              <div className="text-center">
                <p className="font-medium text-gray-900">Processing scanned items...</p>
                <p className="text-sm text-gray-600">Adding {scannedItems.length} items to {boxName}</p>
              </div>

              {/* Progress List */}
              {processedItems.length > 0 && (
                <Card className="max-h-32 overflow-y-auto">
                  <CardContent className="p-3 space-y-2">
                    {processedItems.map((itemName, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="text-green-800">{itemName}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Results */}
          {!isProcessing && scannedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 py-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">
                  Successfully processed {processedItems.length} items!
                </span>
              </div>
              
              <Button 
                onClick={handleClose}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
