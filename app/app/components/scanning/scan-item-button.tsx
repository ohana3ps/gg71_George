
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Camera, Scan } from 'lucide-react'
import { CameraScanner } from './camera-scanner'
import { toast } from 'react-hot-toast'

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

interface ScanItemButtonProps {
  onItemsScanned: (items: any[]) => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
  className?: string
  mode?: 'single' | 'batch'
  buttonText?: string
}

export function ScanItemButton({ 
  onItemsScanned, 
  variant = 'outline',
  size = 'default',
  disabled = false,
  className = '',
  mode = 'single',
  buttonText
}: ScanItemButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleItemsScanned = (items: ScannedItem[]) => {
    // Transform scanned items to match the item form format
    const transformedItems = items.map(item => ({
      name: item.name,
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      condition: item.condition,
      value: item.estimatedValue,
      photoUrl: '', // Could be enhanced to save the scanned image
      notes: `AI Scanned - Confidence: ${Math.round((item.confidence || 0.8) * 100)}%`
    }))

    onItemsScanned(transformedItems)
    setIsOpen(false)
    toast.success(`${items.length} item${items.length !== 1 ? 's' : ''} ready to add`)
  }

  const defaultButtonText = mode === 'batch' 
    ? 'Scan Multiple Items' 
    : 'Scan Item'

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className={`gap-2 ${className}`}
        >
          {mode === 'batch' ? <Scan className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {buttonText || defaultButtonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <CameraScanner
          onItemsScanned={handleItemsScanned}
          onCancel={() => setIsOpen(false)}
          scanMode={mode}
          title={mode === 'batch' ? 'Scan Multiple Items' : 'Scan Single Item'}
          description={mode === 'batch' 
            ? 'Take a photo of multiple items and AI will identify each one for your inventory.'
            : 'Take a photo of an item and AI will identify and extract details for your inventory.'
          }
        />
      </DialogContent>
    </Dialog>
  )
}
