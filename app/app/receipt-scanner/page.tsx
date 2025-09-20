
'use client'

import { useState, useRef } from 'react'
import { createWorker } from 'tesseract.js'

// PDF processing will use a simpler approach - convert to base64 and process as image
const convertPDFToImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) {
        resolve(reader.result as string)
      } else {
        reject(new Error('Failed to read PDF file'))
      }
    }
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsDataURL(file)
  })
}

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  Camera, 
  Upload, 
  X, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Receipt as ReceiptIcon,
  ShoppingCart,
  Clock,
  Trash2,
  Eye,
  RotateCcw,
  Zap,
  Calendar,
  DollarSign,
  ChefHat,
  Mic,
  MicOff,
  Edit,
  Save,
  Type,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface ReceiptImage {
  id: string
  file: File
  preview: string
  uploaded: boolean
  uploading: boolean
}

interface ProcessedReceiptItem {
  id: string
  name: string
  quantity: number
  unit?: string
  price?: number
  category?: string
  estimatedShelfLife?: number
  confidence: number
}

interface ProcessingResult {
  receiptId: string
  storeName?: string
  purchaseDate: string
  totalAmount?: number
  items: ProcessedReceiptItem[]
  confidence: number
}

interface ManualItem {
  name: string
  quantity: number
  unit: string
  category: string
  estimatedShelfLife: number
}

export default function ReceiptScannerPage() {
  const { data: session } = useSession()
  const [images, setImages] = useState<ReceiptImage[]>([])
  const [processing, setProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState('')
  const [processingProgress, setProcessingProgress] = useState(0)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual entry and dictation state
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [currentManualItem, setCurrentManualItem] = useState<ManualItem>({
    name: '',
    quantity: 1,
    unit: 'each',
    category: 'pantry',
    estimatedShelfLife: 7
  })
  const [isListening, setIsListening] = useState(false)
  const [dictationText, setDictationText] = useState('')
  const [showDictation, setShowDictation] = useState(false)
  const [showTips, setShowTips] = useState(false)

  // OCR fallback state
  const [usingOCRFallback, setUsingOCRFallback] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStage, setOcrStage] = useState('')
  const [processingMethod, setProcessingMethod] = useState<'ai' | 'ocr' | 'pdf' | 'failed'>('ai')

  // AI Enhancement state (Stage 2)
  const [enhancing, setEnhancing] = useState(false)
  const [enhancingProgress, setEnhancingProgress] = useState(0)
  const [enhancingStage, setEnhancingStage] = useState('')
  const [enhancedItems, setEnhancedItems] = useState<ProcessedReceiptItem[]>([])
  const [showEnhanceButton, setShowEnhanceButton] = useState(false)
  const [enhancementComplete, setEnhancementComplete] = useState(false)

  // Review interface states
  const [showReview, setShowReview] = useState(false)
  const [reviewItems, setReviewItems] = useState<ProcessedReceiptItem[]>([])
  const [editingItem, setEditingItem] = useState<string | null>(null)
  
  // Editable receipt metadata
  const [editableReceiptDate, setEditableReceiptDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  )

  // Manual entry functions
  const handleAddManualItem = () => {
    if (!currentManualItem.name.trim()) {
      toast.error('Please enter an item name')
      return
    }

    const newItem = {
      ...currentManualItem,
      name: currentManualItem.name.toLowerCase().trim()
    }

    setManualItems(prev => [...prev, newItem])
    setCurrentManualItem({
      name: '',
      quantity: 1,
      unit: 'each',
      category: 'pantry',
      estimatedShelfLife: 7
    })
    toast.success(`Added ${newItem.name} to your list!`)
  }

  const handleRemoveManualItem = (index: number) => {
    setManualItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleProcessManualItems = async () => {
    if (manualItems.length === 0) {
      toast.error('Please add some items first')
      return
    }

    const processedItems = manualItems.map((item, index) => ({
      id: `manual-${index}`,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: undefined,
      category: item.category,
      estimatedShelfLife: item.estimatedShelfLife,
      confidence: 100 // Manual entry is 100% confident
    }))

    // Show review screen instead of directly adding to inventory
    openReviewScreen(processedItems)
  }

  // Review interface functions
  const openReviewScreen = (items: ProcessedReceiptItem[]) => {
    setReviewItems([...items])
    setShowReview(true)
    setShowResult(false)
  }

  const handleReviewItemUpdate = (itemId: string, field: string, value: any) => {
    setReviewItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ))
  }

  const handleRemoveReviewItem = (itemId: string) => {
    setReviewItems(prev => prev.filter(item => item.id !== itemId))
  }

  const handleConfirmReview = async () => {
    if (reviewItems.length === 0) {
      toast.error('No items to add to inventory')
      return
    }
    
    await handleAddToInventory(reviewItems)
    setShowReview(false)
    setReviewItems([])
  }

  const handleCancelReview = () => {
    setShowReview(false)
    setReviewItems([])
    setEditingItem(null)
    setShowResult(true)
  }

  // Voice dictation functions
  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser. Try Chrome or Safari.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    setIsListening(true)
    setDictationText('')

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }

      if (finalTranscript) {
        setDictationText(prev => prev + finalTranscript + ' ')
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      toast.error('Speech recognition error. Please try again.')
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const processDictatedText = () => {
    if (!dictationText.trim()) {
      toast.error('No dictated text to process')
      return
    }

    const items = parseDictatedReceipt(dictationText)
    
    if (items.length === 0) {
      toast.error('Could not extract items from dictated text. Try a clearer format.')
      return
    }

    setManualItems(items)
    toast.success(`Extracted ${items.length} items from your dictation!`)
  }

  const parseDictatedReceipt = (text: string): ManualItem[] => {
    const items: ManualItem[] = []

    // Expanded food categories and shelf life mapping
    const categoryMap: Record<string, { category: string; days: number }> = {
      // Produce
      'apple': { category: 'produce', days: 14 },
      'apples': { category: 'produce', days: 14 },
      'banana': { category: 'produce', days: 5 },
      'bananas': { category: 'produce', days: 5 },
      'lettuce': { category: 'produce', days: 7 },
      'spinach': { category: 'produce', days: 5 },
      'tomato': { category: 'produce', days: 7 },
      'tomatoes': { category: 'produce', days: 7 },
      'strawberries': { category: 'produce', days: 5 },
      'blueberries': { category: 'produce', days: 7 },
      'orange': { category: 'produce', days: 10 },
      'oranges': { category: 'produce', days: 10 },
      'onion': { category: 'produce', days: 21 },
      'onions': { category: 'produce', days: 21 },
      'potato': { category: 'produce', days: 14 },
      'potatoes': { category: 'produce', days: 14 },
      'carrot': { category: 'produce', days: 21 },
      'carrots': { category: 'produce', days: 21 },
      'broccoli': { category: 'produce', days: 7 },
      'avocado': { category: 'produce', days: 5 },
      'avocados': { category: 'produce', days: 5 },
      
      // Dairy
      'milk': { category: 'dairy', days: 7 },
      'cheese': { category: 'dairy', days: 21 },
      'butter': { category: 'dairy', days: 30 },
      'yogurt': { category: 'dairy', days: 14 },
      'eggs': { category: 'dairy', days: 21 },
      'cream': { category: 'dairy', days: 7 },
      
      // Meat
      'chicken': { category: 'meat', days: 3 },
      'beef': { category: 'meat', days: 3 },
      'pork': { category: 'meat', days: 3 },
      'fish': { category: 'meat', days: 2 },
      'salmon': { category: 'meat', days: 2 },
      'turkey': { category: 'meat', days: 3 },
      
      // Pantry
      'soup': { category: 'pantry', days: 365 },
      'bread': { category: 'bakery', days: 7 },
      'rice': { category: 'pantry', days: 365 },
      'pasta': { category: 'pantry', days: 365 },
      'beans': { category: 'pantry', days: 365 },
      'cereal': { category: 'pantry', days: 365 },
    }

    // First, clean up the text and normalize separators
    let cleanedText = text
      .toLowerCase()
      .replace(/\s+/g, ' ') // normalize whitespace
      .replace(/\band\s+/g, ', ') // convert "and" to commas for consistent splitting
      .replace(/[;|]/g, ',') // convert semicolons and pipes to commas
      .trim()

    // Remove dates from the beginning if present (e.g., "august 20th 2025:")
    cleanedText = cleanedText.replace(/^[a-z]+ \d{1,2}(st|nd|rd|th)?,? \d{4}:?\s*/i, '')

    // Split by commas and filter out empty segments
    const segments = cleanedText
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    console.log('Dictation segments:', segments)

    for (const segment of segments) {
      // More comprehensive regex patterns for parsing quantities
      const patterns = [
        // "3 pounds of apples", "2 cans of soup"
        /^(\d+(?:\.\d+)?)\s*(\w+)?\s+of\s+(.+)$/,
        // "3 apples", "2 bags cheese"  
        /^(\d+(?:\.\d+)?)\s*(\w+)?\s+(.+)$/,
        // "a can of soup", "an apple"
        /^(a|an)\s+(\w+\s+)?(?:of\s+)?(.+)$/,
        // "some cheese", "cheese" (fallback for simple items)
        /^(some\s+)?(.+)$/
      ]

      let matched = false

      for (const pattern of patterns) {
        const match = segment.match(pattern)
        if (match) {
          matched = true
          let quantity = 1
          let unit = 'each'
          let itemName = ''

          if (match[1] === 'a' || match[1] === 'an') {
            quantity = 1
            unit = match[2] ? match[2].trim() : 'each'
            itemName = match[3]
          } else if (match[1] && match[1] !== 'some') {
            quantity = parseFloat(match[1]) || 1
            unit = match[2] ? match[2].trim() : 'each'
            itemName = match[3]
          } else {
            // Simple item name without quantity
            quantity = 1
            unit = 'each'
            itemName = match[2] || match[1]
          }

          // Clean up item name
          itemName = itemName
            .replace(/^(of|the|some)\s+/, '')
            .replace(/\s+/g, ' ')
            .trim()

          // Skip if item name is too short or generic
          if (itemName.length < 2 || ['of', 'the', 'and', 'a', 'an'].includes(itemName)) {
            continue
          }

          // Determine category and shelf life
          let category = 'pantry'
          let estimatedShelfLife = 7
          
          for (const [key, info] of Object.entries(categoryMap)) {
            if (itemName.includes(key)) {
              category = info.category
              estimatedShelfLife = info.days
              break
            }
          }

          // Adjust units based on common patterns
          if (unit === 'can' || unit === 'cans') {
            unit = 'can'
            category = 'pantry'
            estimatedShelfLife = 365
          } else if (unit === 'bag' || unit === 'bags') {
            unit = 'bag'
          } else if (unit === 'pound' || unit === 'pounds' || unit === 'lb' || unit === 'lbs') {
            unit = 'lbs'
          } else if (unit === 'pint' || unit === 'pints') {
            unit = 'pint'
          }

          items.push({
            name: itemName,
            quantity,
            unit,
            category,
            estimatedShelfLife
          })

          console.log(`Parsed item: ${itemName} (${quantity} ${unit})`)
          break
        }
      }

      if (!matched) {
        console.log(`Could not parse segment: "${segment}"`)
      }
    }

    // Deduplicate items by name (combine quantities if same item appears multiple times)
    const deduplicatedItems: ManualItem[] = []
    const itemMap = new Map<string, ManualItem>()

    for (const item of items) {
      const key = item.name.toLowerCase().trim()
      if (itemMap.has(key)) {
        const existing = itemMap.get(key)!
        existing.quantity += item.quantity
      } else {
        itemMap.set(key, { ...item })
      }
    }

    return Array.from(itemMap.values())
  }

  // Enhanced OCR fallback functions
  const preprocessImageForOCR = (canvas: HTMLCanvasElement): void => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Scale up image for better OCR (2x resolution)
    const originalWidth = canvas.width
    const originalHeight = canvas.height
    const scaleFactor = 2
    
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return
    
    tempCanvas.width = originalWidth
    tempCanvas.height = originalHeight
    tempCtx.drawImage(canvas, 0, 0)
    
    // Resize main canvas
    canvas.width = originalWidth * scaleFactor
    canvas.height = originalHeight * scaleFactor
    
    // Scale up with smoothing disabled for sharper text
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Apply advanced preprocessing for better OCR
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale using luminance formula
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
      
      // Apply adaptive thresholding - more aggressive contrast
      let enhanced: number
      if (gray < 80) {
        enhanced = 0  // Dark text stays black
      } else if (gray > 180) {
        enhanced = 255  // Light background stays white
      } else {
        // Medium values - use higher contrast threshold
        enhanced = gray > 130 ? 255 : 0
      }
      
      data[i] = enhanced     // Red
      data[i + 1] = enhanced // Green
      data[i + 2] = enhanced // Blue
      // Alpha stays the same
    }

    ctx.putImageData(imageData, 0, 0)
  }

  // Simplified PDF processing - we'll skip PDF text extraction and go straight to OCR
  const processPDFDirectly = async (file: File): Promise<string> => {
    console.log('📄 PDF files will be processed using OCR (PDF text extraction disabled for stability)')
    console.log('ℹ️ For best results with PDFs, please convert to JPEG/PNG first')
    
    // Return empty string to trigger OCR processing
    return ''
  }

  // PDF rendering removed for stability - OCR will handle PDF processing

  const processPDFReceipt = async (file: File): Promise<ProcessingResult> => {
    setProcessingMethod('pdf')
    setOcrStage('PDF Processing Not Available')
    setOcrProgress(100)

    console.log(`📄 PDF processing requested for: ${file.name} (${file.size} bytes)`)
    console.log('⚠️ PDF processing temporarily disabled for stability')
    console.log('💡 For best results, please convert your PDF to JPEG/PNG and upload as an image')
    
    return {
      receiptId: `pdf-disabled-${Date.now()}`,
      storeName: 'PDF Processing Not Available',
      purchaseDate: new Date().toISOString().split('T')[0],
      items: [],
      confidence: 0
    }
  }

  const processReceiptWithOCR = async (images: ReceiptImage[]): Promise<ProcessingResult> => {
    setUsingOCRFallback(true)
    setOcrStage('Initializing OCR engine...')
    setOcrProgress(10)

    try {
      // Create Tesseract worker with enhanced configuration
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(20 + (m.progress * 60))
            setOcrStage(`Analyzing image: ${Math.round(m.progress * 100)}%`)
          }
        }
      })

      // Configure Tesseract for receipt text recognition
      await worker.setParameters({
        'tessedit_char_whitelist': '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,/$%-&()[]',
        'tessedit_pageseg_mode': '6', // Uniform block of text (good for receipts)
        'preserve_interword_spaces': '1',
      } as any)

      let allExtractedText = ''
      
      // Process each image
      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        setOcrStage(`Processing image ${i + 1} of ${images.length}...`)
        
        // Create canvas for image preprocessing
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new window.Image()
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            ctx?.drawImage(img, 0, 0)
            
            // Preprocess image for better OCR
            preprocessImageForOCR(canvas)
            resolve()
          }
          img.onerror = reject
          img.src = image.preview
        })

        // Extract text using OCR
        const { data: { text } } = await worker.recognize(canvas)
        allExtractedText += text + '\n'
      }

      setOcrStage('Parsing receipt data...')
      setOcrProgress(85)

      // Debug: Log the raw OCR text
      console.log('=== RAW OCR TEXT START ===')
      console.log(allExtractedText)
      console.log('=== RAW OCR TEXT END ===')
      
      // Parse the extracted text
      const parsedItems = parseOCRTextToItems(allExtractedText)
      
      await worker.terminate()
      
      setOcrProgress(100)
      setProcessingMethod('ocr')

      const result: ProcessingResult = {
        receiptId: `ocr-${Date.now()}`,
        storeName: extractStoreFromText(allExtractedText),
        purchaseDate: new Date().toISOString().split('T')[0],
        totalAmount: extractTotalFromText(allExtractedText),
        items: parsedItems,
        confidence: 65 // OCR typically has lower confidence than AI
      }

      return result

    } catch (error) {
      console.error('OCR processing failed:', error)
      setProcessingMethod('failed')
      throw new Error('OCR processing failed. Please try manual entry.')
    } finally {
      setUsingOCRFallback(false)
      setOcrProgress(0)
      setOcrStage('')
    }
  }

  const parseOCRTextToItems = (text: string): ProcessedReceiptItem[] => {
    console.log('=== LINE-BY-LINE RECEIPT PARSING START ===')
    console.log('Raw OCR text length:', text.length)
    console.log('Raw OCR text:', text)
    
    // Split into lines and process each line
    const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0)
    console.log('Total lines to process:', lines.length)
    
    const items: ProcessedReceiptItem[] = []
    const totalIndicators = [
      'total', 'subtotal', 'sub total', 'grand total', 'order total',
      'balance', 'amount due', 'due', 'pay', 'payment', 'cash', 'change',
      'visa', 'mastercard', 'credit', 'debit', 'card', 'tender',
      'tax', 'taxable', 'fee'
    ]
    
    // Process each line
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      let line = lines[lineIndex]
      console.log(`\n--- LINE ${lineIndex + 1}: "${line}" ---`)
      
      // Debug: Check for specific items we're tracking
      const isTillamookLine = /tillamook/gi.test(line)
      const isWaferLine = /wafer/gi.test(line)
      
      if (isTillamookLine) {
        console.log(`🧀 TILLAMOOK LINE DETECTED: "${line}"`)
      }
      if (isWaferLine) {
        console.log(`🧇 WAFER LINE DETECTED: "${line}"`)
      }
      
      // Skip lines that are clearly promotional/discount lines (not product lines)
      const isPromoOnlyLine = (
        // Lines that start with promotional terms and don't have substantial product text
        /^\s*(promo\*|promotion|discount|coupon|save\s*\$)/gi.test(line) ||
        // Lines that are primarily negative amounts (discounts)
        /^\s*-\s*\d+\.\d{2}/g.test(line)
      )
      
      if (isPromoOnlyLine) {
        console.log(`🚫 SKIPPING PROMO LINE: "${line}"`)
        if (isTillamookLine) {
          console.log(`⚠️ WARNING: TILLAMOOK LINE WAS SKIPPED AS PROMO: "${line}"`)
        }
        if (isWaferLine) {
          console.log(`⚠️ WARNING: WAFER LINE WAS SKIPPED AS PROMO: "${line}"`)
        }
        continue
      }
      
      // Skip if line contains total indicators
      const lineWords = line.toLowerCase().split(/\s+/)
      const isTotal = totalIndicators.some(indicator => 
        lineWords.some(word => word.includes(indicator))
      )
      if (isTotal) {
        console.log(`🚫 SKIPPING TOTAL LINE: "${line}"`)
        continue
      }
      
      // Clean and normalize the line
      line = line
        .replace(/[^\w\s\.\$]/g, ' ') // Keep alphanumeric, spaces, periods, dollar signs
        .replace(/\$\s*(\d+\.?\d*)/g, '$1') // Fix spaced dollar signs: "$ 3.99" -> "3.99"
        .replace(/\s+/g, ' ') // Normalize multiple spaces
        .trim()
      
      console.log(`Cleaned line: "${line}"`)
      
      // Try to reconstruct split prices (e.g., "5 79" -> "5.79")
      line = reconstructSplitPrices(line)
      console.log(`After price reconstruction: "${line}"`)
      
      const words = line.split(/\s+/).filter(word => word.length > 0)
      console.log('Words:', words)
      
      // Find prices in this line - handle fragmented OCR prices
      const strictPricePattern = /^\d+\.\d{2}$|^\d+\.\d{1}$/ // "3.99" or "3.9"
      const strictPrices = words.filter(word => strictPricePattern.test(word))
      
      // Also look for fragmented prices (cents without decimal)
      const reconstructedPrices = []
      
      // Look for fragmented dollar amounts
      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        
        // Look for two-digit cents amounts (like "79") and search nearby for dollar part
        if (/^\d{2}$/.test(word)) {
          const centsValue = parseInt(word)
          if (centsValue >= 10 && centsValue <= 99) {
            console.log(`🔍 FOUND CENTS FRAGMENT: "${word}" (${centsValue}¢)`)
            
            // Search nearby words for dollar part
            for (let j = Math.max(0, i - 3); j <= Math.min(words.length - 1, i + 3); j++) {
              if (j === i) continue // Skip the cents word itself
              
              const nearbyWord = words[j]
              
              // Check if nearby word could be dollars
              if (/^\d{1,2}$/.test(nearbyWord)) {
                const dollarValue = parseInt(nearbyWord)
                if (dollarValue >= 1 && dollarValue <= 50) {
                  const fullPrice = `${dollarValue}.${word}`
                  reconstructedPrices.push(fullPrice)
                  console.log(`💰 RECONSTRUCTED PRICE: "${nearbyWord}" + "${word}" → $${fullPrice}`)
                  break // Found a match, stop searching
                }
              }
              
              // Check if nearby word could be a misread dollar digit
              // Common OCR mistakes: "5" → "S", "5" → "s", "1" → "l", "1" → "I"
              const possibleDollars = nearbyWord.replace(/[Ss]/g, '5').replace(/[lI]/g, '1').replace(/[Oo]/g, '0')
              if (/^\d{1,2}$/.test(possibleDollars)) {
                const dollarValue = parseInt(possibleDollars)
                if (dollarValue >= 1 && dollarValue <= 50) {
                  const fullPrice = `${dollarValue}.${word}`
                  reconstructedPrices.push(fullPrice)
                  console.log(`💰 RECONSTRUCTED PRICE: "${nearbyWord}" (→"${possibleDollars}") + "${word}" → $${fullPrice}`)
                  break // Found a match, stop searching
                }
              }
            }
          }
        }
        
        // Also check for standard adjacent dollar.cents patterns
        if (/^\d{1,2}$/.test(word) && i + 1 < words.length) {
          const nextWord = words[i + 1]
          if (/^\d{2}$/.test(nextWord)) {
            const dollars = parseInt(word)
            const cents = parseInt(nextWord)
            if (dollars >= 1 && dollars <= 50 && cents <= 99) {
              const dollarAmount = `${dollars}.${nextWord.padStart(2, '0')}`
              reconstructedPrices.push(dollarAmount)
              console.log(`💰 RECONSTRUCTED PRICE: "${word} ${nextWord}" → $${dollarAmount}`)
            }
          }
        }
      }
      
      // Handle 3-digit fragmented prices like "519" → "$5.19" or "579" → "$5.79"  
      const fragmentedPrices = []
      for (const word of words) {
        if (/^\d{3}$/.test(word)) {
          const num = parseInt(word)
          // Only process reasonable price ranges (100-999 cents = $1.00-$9.99)
          if (num >= 100 && num <= 999) {
            const dollars = Math.floor(num / 100)
            const cents = num % 100
            const reconstructedPrice = `${dollars}.${cents.toString().padStart(2, '0')}`
            fragmentedPrices.push(reconstructedPrice)
            console.log(`🔄 3-DIGIT FRAGMENTED PRICE: "${word}" → $${reconstructedPrice}`)
            
            // Debug specific items
            if (isTillamookLine) {
              console.log(`🧀 TILLAMOOK 3-DIGIT PRICE FOUND: ${word} → $${reconstructedPrice}`)
            }
            if (isWaferLine) {
              console.log(`🧇 WAFER 3-DIGIT PRICE FOUND: ${word} → $${reconstructedPrice}`)
            }
          }
        }
      }
      
      // Combine all found prices
      const allPrices = [...strictPrices, ...reconstructedPrices, ...fragmentedPrices]
      
      // Separate positive and negative prices
      const positivePrices = allPrices.filter(price => parseFloat(price) > 0)
      const negativePrices = allPrices.filter(price => parseFloat(price) < 0)
      
      console.log('All prices found:', allPrices)
      console.log('Positive prices:', positivePrices)
      console.log('Negative prices:', negativePrices)
      
      // Debug specific items at price detection stage
      if (isTillamookLine) {
        console.log(`🧀 TILLAMOOK PRICES: positive=${positivePrices.length}, negative=${negativePrices.length}`)
      }
      if (isWaferLine) {
        console.log(`🧇 WAFER PRICES: positive=${positivePrices.length}, negative=${negativePrices.length}`)
      }
      
      // Process line if it has positive prices (actual products)
      if (positivePrices.length > 0) {
        const prices = positivePrices // Use only positive prices for product extraction
        // Get item words (everything except prices and common non-item words)
        const usedInPrices = new Set()
        
        // Mark words that were used in price reconstruction
        reconstructedPrices.forEach(priceStr => {
          const [dollars, cents] = priceStr.split('.')
          words.forEach((word, idx) => {
            // Mark exact matches for dollars and cents
            if (word === dollars || word === cents) {
              usedInPrices.add(word)
            }
            // Mark words that were converted (like "S" → "5")
            const converted = word.replace(/[Ss]/g, '5').replace(/[lI]/g, '1').replace(/[Oo]/g, '0')
            if (converted === dollars) {
              usedInPrices.add(word)
            }
          })
        })
        
        const itemWords = words.filter(word => {
          if (strictPricePattern.test(word)) return false // Skip strict prices
          
          // Skip words that were used in price reconstruction
          if (usedInPrices.has(word)) {
            console.log(`🚫 SKIPPING PRICE COMPONENT: "${word}"`)
            return false
          }
          
          const wordUpper = word.toUpperCase()
          const excludedWords = [
            'THE', 'AND', 'OR', 'OF', 'IN', 'ON', 'AT', 'TO', 'FOR', 'WITH',
            'REG', 'TX', 'T', 'F', 'N', 'CL', 'BLD', 'TER', 'NY', 'CO', 'ST',
            'REE', 'PUBLIX', 'STORE', 'EA', 'EACH', 'LB', 'OZ',
            // OCR artifacts
            'TF', 'LT', 'NV', 'AE', 'EE', 'OO', 'EET', 'CE', 'RE', 'TE'
          ]
          
          return !excludedWords.includes(wordUpper) &&
                 !/^\d+$/.test(word) && // Not just numbers
                 !/^[A-Z]{1,2}$/.test(wordUpper) && // Not single/double letters
                 word.length > 1
        })
        
        console.log('Item words:', itemWords)
        
        // Debug specific items at item word stage
        if (isTillamookLine) {
          console.log(`🧀 TILLAMOOK ITEM WORDS: [${itemWords.join(', ')}]`)
        }
        if (isWaferLine) {
          console.log(`🧇 WAFER ITEM WORDS: [${itemWords.join(', ')}]`)
        }
        
        if (itemWords.length > 0) {
          // Create item name from filtered words
          let itemName = itemWords.slice(0, 4).join(' ').toLowerCase()
          
          // Debug: Check if this is a wafer or tillamook item
          const isWaferItem = /wafer/gi.test(itemName)
          const isTillamookItem = /tillamook/gi.test(itemName)
          
          if (isWaferItem) {
            console.log(`🧇 PROCESSING WAFER ITEM: "${itemName}"`)
          }
          if (isTillamookItem) {
            console.log(`🧀 PROCESSING TILLAMOOK ITEM: "${itemName}"`)
          }
          
          // Additional cleaning - remove promotional terms but keep the product name
          itemName = itemName
            .replace(/\b(organic|fresh|grade|select|choice)\b/gi, '') // Remove grade words
            .replace(/\b(promo\*?|promotion|discount|special|sale|deal|offer|coupon|save|bonus)\b/gi, '') // Remove promotional terms
            .replace(/\s+/g, ' ')
            .trim()
          
          console.log('Final item name:', itemName)
          if (isWaferItem) {
            console.log(`🧇 WAFER AFTER CLEANING: "${itemName}"`)
          }
          if (isTillamookItem) {
            console.log(`🧀 TILLAMOOK AFTER CLEANING: "${itemName}"`)
          }
          
          // Only accept if it looks like a real item
          if (itemName.length >= 2 && 
              !itemName.match(/^(tax|fee|total|sub|cash|card|when|order|store)$/i)) {
            
            const price = parseFloat(prices[0]) // Use first price found
            
            if (price > 0.01 && price < 100) { // Reasonable price range
              const category = categorizeItemEnhanced(itemName)
              const estimatedShelfLife = getEstimatedShelfLifeEnhanced(itemName)
              
              // Format name for display
              const displayName = itemName
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
              
              // Check for duplicates and combine quantities
              const existingItemIndex = items.findIndex(item => item.name.toLowerCase() === displayName.toLowerCase())
              
              if (existingItemIndex === -1) {
                // New item - add it
                items.push({
                  id: `ocr-${items.length}`,
                  name: displayName,
                  quantity: 1,
                  unit: 'each',
                  price: price,
                  category,
                  estimatedShelfLife,
                  confidence: 75
                })
                
                console.log(`✅ FOUND ITEM: "${displayName}" - $${price}`)
                if (isWaferItem) {
                  console.log(`🧇 ✅ WAFER SUCCESSFULLY ADDED: "${displayName}" - $${price}`)
                }
                if (isTillamookItem) {
                  console.log(`🧀 ✅ TILLAMOOK SUCCESSFULLY ADDED: "${displayName}" - $${price}`)
                }
              } else {
                // Duplicate found - combine quantities
                const existingItem = items[existingItemIndex]
                if (existingItem) {
                  existingItem.quantity += 1
                  // Average the prices if they're different
                  const existingPrice = existingItem.price
                  if (existingPrice !== undefined && Math.abs(existingPrice - price) > 0.01) {
                    existingItem.price = ((existingPrice * (existingItem.quantity - 1)) + price) / existingItem.quantity
                  }
                  
                  console.log(`🔄 DUPLICATE COMBINED: "${displayName}" - Quantity now: ${existingItem.quantity}, Price: $${(existingItem.price || 0).toFixed(2)}`)
                  if (isWaferItem) {
                    console.log(`🧇 🔄 WAFER COMBINED: "${displayName}" - Quantity: ${existingItem.quantity}`)
                  }
                  if (isTillamookItem) {
                    console.log(`🧀 🔄 TILLAMOOK COMBINED: "${displayName}" - Quantity: ${existingItem.quantity}`)
                  }
                }
              }
            } else {
              console.log(`🚫 PRICE OUT OF RANGE: $${price}`)
              if (isWaferItem) {
                console.log(`🧇 🚫 WAFER PRICE OUT OF RANGE: $${price}`)
              }
              if (isTillamookItem) {
                console.log(`🧀 🚫 TILLAMOOK PRICE OUT OF RANGE: $${price}`)
              }
            }
          } else {
            console.log(`❌ REJECTED: "${itemName}" (invalid item name)`)
            if (isWaferItem) {
              console.log(`🧇 ❌ WAFER REJECTED AS INVALID: "${itemName}"`)
            }
            if (isTillamookItem) {
              console.log(`🧀 ❌ TILLAMOOK REJECTED AS INVALID: "${itemName}"`)
            }
          }
        } else {
          console.log('❌ No valid item words found')
          if (isTillamookLine) {
            console.log(`🧀 TILLAMOOK REJECTED: No valid item words`)
          }
          if (isWaferLine) {
            console.log(`🧇 WAFER REJECTED: No valid item words`)
          }
        }
      } else {
        console.log('❌ No prices found in line')
        if (isTillamookLine) {
          console.log(`🧀 TILLAMOOK REJECTED: No prices found`)
        }
        if (isWaferLine) {
          console.log(`🧇 WAFER REJECTED: No prices found`)
        }
      }
    }

    console.log(`\n=== PARSING COMPLETE ===`)
    console.log(`Found ${items.length} items from ${lines.length} lines`)
    items.forEach((item, i) => {
      console.log(`${i + 1}. ${item.name} - $${item.price}`)
    })
    
    return items.slice(0, 20) // Limit to prevent overwhelming results
  }
  
  // Helper function to reconstruct split prices like "5 79" -> "5.79"
  const reconstructSplitPrices = (line: string): string => {
    // Pattern: digit(s) + space + 2 digits (likely cents)
    const splitPricePattern = /(\d{1,3})\s+(\d{2})(?=\s|$)/g
    
    return line.replace(splitPricePattern, (match, dollars, cents) => {
      const reconstructed = `${dollars}.${cents}`
      console.log(`🔧 RECONSTRUCTED: "${match}" -> "${reconstructed}"`)
      return reconstructed
    })
  }

  const extractStoreFromText = (text: string): string => {
    const lines = text.split('\n').map(line => line.trim())
    // Store name is usually in the first few lines - look for known store patterns
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].toLowerCase()
      if (line.includes('publix') || line.includes('kroger') || line.includes('walmart') || 
          line.includes('target') || line.includes('costco') || line.includes('safeway') ||
          line.includes('whole foods') || line.includes('trader joe')) {
        return lines[i] // Return original case
      }
    }
    return 'Store' // Simple default
  }

  const extractTotalFromText = (text: string): number | undefined => {
    const totalMatch = text.match(/TOTAL[\s:]*(\d+\.?\d*)/i)
    return totalMatch ? parseFloat(totalMatch[1]) : undefined
  }

  const categorizeItem = (itemName: string): string => {
    const name = itemName.toLowerCase()
    if (name.includes('banana') || name.includes('apple') || name.includes('orange')) return 'produce'
    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) return 'dairy'
    if (name.includes('chicken') || name.includes('beef') || name.includes('fish')) return 'meat'
    if (name.includes('bread') || name.includes('bagel')) return 'bakery'
    return 'pantry'
  }

  const getEstimatedShelfLife = (itemName: string): number => {
    const name = itemName.toLowerCase()
    if (name.includes('banana')) return 5
    if (name.includes('apple')) return 14
    if (name.includes('milk')) return 7
    if (name.includes('bread')) return 7
    if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) return 3
    return 7 // Default
  }

  const categorizeItemEnhanced = (itemName: string): string => {
    const name = itemName.toLowerCase()
    
    // Produce (fruits & vegetables)
    if (name.includes('banana') || name.includes('apple') || name.includes('orange') || 
        name.includes('lettuce') || name.includes('tomato') || name.includes('potato') ||
        name.includes('onion') || name.includes('pepper') || name.includes('carrot') ||
        name.includes('avocado') || name.includes('lime') || name.includes('lemon') ||
        name.includes('grape') || name.includes('berry') || name.includes('produce') ||
        name.includes('organic') || name.includes('fresh')) return 'produce'
    
    // Dairy & refrigerated
    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') ||
        name.includes('butter') || name.includes('cream') || name.includes('egg') ||
        name.includes('dairy') || name.includes('sour cream') || name.includes('cottage cheese')) return 'dairy'
    
    // Meat & seafood
    if (name.includes('chicken') || name.includes('beef') || name.includes('pork') ||
        name.includes('fish') || name.includes('salmon') || name.includes('turkey') ||
        name.includes('ham') || name.includes('bacon') || name.includes('sausage') ||
        name.includes('meat') || name.includes('seafood')) return 'meat'
    
    // Bakery
    if (name.includes('bread') || name.includes('bagel') || name.includes('muffin') ||
        name.includes('cake') || name.includes('cookie') || name.includes('pastry') ||
        name.includes('donut') || name.includes('roll') || name.includes('bun')) return 'bakery'
    
    // Frozen
    if (name.includes('frozen') || name.includes('ice cream') || name.includes('pizza') ||
        name.includes('meal') && (name.includes('frozen') || name.includes('tv dinner'))) return 'frozen'
    
    // Beverages
    if (name.includes('water') || name.includes('soda') || name.includes('juice') ||
        name.includes('tea') || name.includes('coffee') || name.includes('beer') ||
        name.includes('wine') || name.includes('drink') || name.includes('beverage')) return 'beverages'
    
    // Personal care
    if (name.includes('shampoo') || name.includes('soap') || name.includes('toothpaste') ||
        name.includes('deodorant') || name.includes('lotion') || name.includes('care')) return 'personal-care'
    
    // Household/cleaning
    if (name.includes('detergent') || name.includes('cleaner') || name.includes('paper towel') ||
        name.includes('toilet paper') || name.includes('dish') || name.includes('household')) return 'household'
    
    // Common grocery items by name patterns
    if (name.includes('cereal') || name.includes('pasta') || name.includes('rice') ||
        name.includes('beans') || name.includes('sauce') || name.includes('soup') ||
        name.includes('can') || name.includes('jar') || name.includes('box')) return 'pantry'
    
    // Default
    return 'pantry'
  }

  const getEstimatedShelfLifeEnhanced = (itemName: string): number => {
    const name = itemName.toLowerCase()
    
    // Short shelf life (1-3 days)
    if (name.includes('banana') || name.includes('berries') || name.includes('fish') ||
        name.includes('seafood') || name.includes('ground') || name.includes('fresh meat')) return 3
    
    // Medium shelf life (3-7 days)
    if (name.includes('milk') || name.includes('yogurt') || name.includes('lettuce') ||
        name.includes('leafy') || name.includes('chicken') || name.includes('pork') ||
        name.includes('bread') || name.includes('fresh')) return 7
    
    // Good shelf life (1-2 weeks)
    if (name.includes('apple') || name.includes('orange') || name.includes('carrot') ||
        name.includes('potato') || name.includes('onion') || name.includes('cheese') ||
        name.includes('egg')) return 14
    
    // Long shelf life (1+ months)
    if (name.includes('can') || name.includes('jar') || name.includes('pasta') ||
        name.includes('rice') || name.includes('cereal') || name.includes('sauce') ||
        name.includes('frozen') || name.includes('dry')) return 90
    
    // Household/personal care (6+ months)
    if (name.includes('shampoo') || name.includes('soap') || name.includes('detergent') ||
        name.includes('cleaner') || name.includes('care')) return 180
    
    // Default
    return 14
  }

  // AI Enhancement Functions (Stage 2)
  const enhanceItemsWithAI = async (items: ProcessedReceiptItem[], originalResult: ProcessingResult) => {
    console.log('🚀 Starting AI enhancement stage...')
    setEnhancing(true)
    setEnhancingProgress(0)
    setEnhancingStage('Preparing items for AI enhancement...')
    setProcessing(false) // Stage 1 (OCR) is complete
    
    try {
      // Show immediate notification
      toast.success('🤖 Enhancing items with AI...', { duration: 2000 })
      
      setEnhancingStage('Analyzing food categories...')
      setEnhancingProgress(20)
      
      // Process items in batches for better user experience
      const enhancedItemsList: ProcessedReceiptItem[] = []
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        setEnhancingStage(`Enhancing "${item.name}" (${i + 1}/${items.length})...`)
        setEnhancingProgress(20 + (i / items.length) * 60)
        
        try {
          // Call our new enhancement API
          const enhanceResponse = await fetch('/api/enhance-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: [item], // Send one item at a time for better progress tracking
              storeName: originalResult.storeName || 'Store',
              purchaseDate: originalResult.purchaseDate
            })
          })
          
          if (enhanceResponse.ok) {
            const enhancedData = await enhanceResponse.json()
            if (enhancedData.items && enhancedData.items.length > 0) {
              enhancedItemsList.push({
                ...enhancedData.items[0],
                confidence: Math.max(item.confidence, enhancedData.items[0].confidence || 85)
              })
              console.log(`✨ Enhanced: "${item.name}" → Category: ${enhancedData.items[0].category}, Shelf Life: ${enhancedData.items[0].estimatedShelfLife} days`)
            } else {
              // Fallback to original item with basic enhancement
              enhancedItemsList.push({
                ...item,
                category: item.category || 'pantry',
                estimatedShelfLife: item.estimatedShelfLife || 14,
                confidence: Math.max(item.confidence, 70)
              })
            }
          } else {
            throw new Error(`Enhancement failed for ${item.name}`)
          }
        } catch (itemError) {
          console.warn(`⚠️ AI enhancement failed for "${item.name}", using fallback:`, itemError)
          // Graceful fallback - use original item with smart defaults
          enhancedItemsList.push({
            ...item,
            category: categorizeItemEnhanced(item.name),
            estimatedShelfLife: getEstimatedShelfLifeEnhanced(item.name),
            confidence: Math.max(item.confidence, 70)
          })
        }
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      setEnhancingStage('Finalizing enhanced results...')
      setEnhancingProgress(90)
      
      // Update the result with enhanced items
      const enhancedResult: ProcessingResult = {
        ...originalResult,
        items: enhancedItemsList,
        confidence: Math.min(95, originalResult.confidence + 15) // Boost confidence after AI enhancement
      }
      
      setEnhancingProgress(100)
      setResult(enhancedResult)
      setEnhancedItems(enhancedItemsList)
      setEnhancementComplete(true)
      
      // Success notification
      toast.success(`🎉 AI enhanced all ${enhancedItemsList.length} items with better categories and shelf life!`, {
        duration: 4000
      })
      
    } catch (error) {
      console.error('❌ AI Enhancement failed:', error)
      
      // Graceful fallback - show original results with local enhancements
      const fallbackItems = items.map(item => ({
        ...item,
        category: categorizeItemEnhanced(item.name),
        estimatedShelfLife: getEstimatedShelfLifeEnhanced(item.name),
        confidence: Math.max(item.confidence, 70)
      }))
      
      const fallbackResult: ProcessingResult = {
        ...originalResult,
        items: fallbackItems,
        confidence: Math.min(85, originalResult.confidence + 5)
      }
      
      setResult(fallbackResult)
      setEnhancedItems(fallbackItems)
      
      toast.error('AI enhancement unavailable. Using smart local categorization.', {
        duration: 3000
      })
      
    } finally {
      setEnhancing(false)
      setEnhancingProgress(0)
      setEnhancingStage('')
      setShowEnhanceButton(false)
    }
  }
  
  const handleManualEnhance = async () => {
    if (!result || result.items.length === 0) {
      toast.error('No items to enhance')
      return
    }
    
    await enhanceItemsWithAI(result.items, result)
  }

  // Add images (multi-photo support)
  const handleAddImages = (files: FileList | null) => {
    if (!files) return

    const newImages: ReceiptImage[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file type and size
      const isImage = file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic')
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      
      if (!isImage && !isPdf) {
        toast.error(`${file.name} is not a valid image or PDF file`)
        continue
      }
      
      // Special handling for HEIC files
      if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
        toast.error(`${file.name} is a HEIC file. Please convert to JPEG/PNG first. HEIC files are not supported by web browsers.`)
        continue
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`${file.name} is too large. Maximum size is 10MB`)
        continue
      }

      const imageId = Date.now() + i + Math.random().toString(36)
      newImages.push({
        id: imageId.toString(),
        file,
        preview: URL.createObjectURL(file),
        uploaded: false,
        uploading: false
      })
    }

    setImages(prev => [...prev, ...newImages])
    toast.success(`Added ${newImages.length} image${newImages.length > 1 ? 's' : ''}`)
  }

  // Remove image
  const handleRemoveImage = (imageId: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return prev.filter(img => img.id !== imageId)
    })
  }

  // Process receipt with fallback
  const handleProcessReceipt = async () => {
    if (images.length === 0) {
      toast.error('Please add at least one receipt image or PDF')
      return
    }

    // Check if any files are PDFs
    const pdfFiles = images.filter(img => 
      img.file.type === 'application/pdf' || img.file.name.toLowerCase().endsWith('.pdf')
    )
    const imageFiles = images.filter(img => 
      !(img.file.type === 'application/pdf' || img.file.name.toLowerCase().endsWith('.pdf'))
    )

    setProcessing(true)
    
    // Process PDFs first if present
    if (pdfFiles.length > 0) {
      try {
        console.log(`🔄 Processing ${pdfFiles.length} PDF file(s) with OCR...`)
        console.log('PDF file info:', {
          name: pdfFiles[0].file.name,
          size: pdfFiles[0].file.size,
          type: pdfFiles[0].file.type
        })
        
        const pdfResult = await processPDFReceipt(pdfFiles[0].file)
        console.log('📄 PDF processing result:', pdfResult)
        
        // Stage 1: Show OCR results immediately
        setResult(pdfResult)
        setShowResult(true)
        setProcessingMethod('ocr')
        
        if (pdfResult.items.length > 0 && pdfResult.confidence > 0) {
          toast.success(`✅ OCR extracted ${pdfResult.items.length} items from PDF!`)
          
          // Stage 2: Trigger AI enhancement automatically
          enhanceItemsWithAI(pdfResult.items, pdfResult)
        } else {
          console.warn('⚠️ PDF OCR returned no items or low confidence:', {
            itemsCount: pdfResult.items.length,
            confidence: pdfResult.confidence
          })
          toast.error('PDF processed but no items were found. Check console for details.')
          setProcessing(false)
        }
        return
      } catch (error) {
        console.error('❌ PDF processing error:', error)
        toast.error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setProcessing(false)
        return
      }
    }

    // Process regular images with OCR-first approach
    if (imageFiles.length === 0) {
      toast.error('No valid image files found')
      setProcessing(false)
      return
    }

    // Stage 1: OCR Processing (No AI dependency)
    setProcessingStage('Extracting text from receipt...')
    setProcessingProgress(10)
    setProcessingMethod('ocr')

    try {
      // Go straight to OCR processing
      console.log('🔄 Starting OCR-first processing...')
      const ocrResult = await processReceiptWithOCR(imageFiles)
      
      // Stage 1: Show OCR results immediately
      setResult(ocrResult)
      setShowResult(true)
      
      if (ocrResult.items.length > 0) {
        toast.success(`✅ OCR extracted ${ocrResult.items.length} items from receipt!`)
        
        // Stage 2: Automatically enhance with AI
        enhanceItemsWithAI(ocrResult.items, ocrResult)
      } else {
        toast.error('OCR found no items. Please try manual entry.')
        setProcessing(false)
      }
      
      return
      
    } catch (error) {
      console.error('Complete processing error:', error)
      setProcessingMethod('failed')
      
      toast.error('All processing methods failed. Please use manual entry.', {
        duration: 5000
      })
      
      // Show manual entry options
      setShowManualEntry(true)
      
    } finally {
      setProcessing(false)
      setProcessingStage('')
      setProcessingProgress(0)
      setUsingOCRFallback(false)
      setOcrProgress(0)
      setOcrStage('')
    }
  }

  // Add items to inventory
  const handleAddToInventory = async (items: ProcessedReceiptItem[]) => {
    try {
      const response = await fetch('/api/add-receipt-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptId: result?.receiptId,
          items: items,
          purchaseDate: editableReceiptDate,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add items to inventory')
      }

      toast.success(`Added ${items.length} items to your food inventory! 🛒`)
      
      // Reset form
      setImages([])
      setResult(null)
      setShowResult(false)
      
    } catch (error) {
      console.error('Error adding items:', error)
      toast.error('Failed to add items to inventory')
    }
  }

  // Reset scanner
  const handleReset = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview))
    setImages([])
    setResult(null)
    setShowResult(false)
    setProcessing(false)
    setProcessingStage('')
    setProcessingProgress(0)
    
    // Reset AI enhancement states
    setEnhancing(false)
    setEnhancingProgress(0)
    setEnhancingStage('')
    setEnhancedItems([])
    setShowEnhanceButton(false)
    setEnhancementComplete(false)
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to use the Receipt Scanner</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/signin">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          {/* Top Level - Back and AI Powered */}
          <div className="flex items-center justify-between mb-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Zap className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
          </div>
          
          {/* Second Level - Receipt Scanner */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <ReceiptIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Receipt Scanner</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {showReview ? (
          /* Review Interface */
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <span>Review Items</span>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Review and edit the extracted items before adding them to your inventory
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {reviewItems.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviewItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Item Name */}
                      <div className="md:col-span-2">
                        <Label htmlFor={`name-${item.id}`} className="text-sm font-medium text-gray-700">
                          Item Name
                        </Label>
                        {editingItem === item.id ? (
                          <Input
                            id={`name-${item.id}`}
                            value={item.name}
                            onChange={(e) => handleReviewItemUpdate(item.id, 'name', e.target.value)}
                            className="mt-1"
                            autoFocus
                          />
                        ) : (
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm text-gray-900">{item.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Quantity */}
                      <div>
                        <Label htmlFor={`quantity-${item.id}`} className="text-sm font-medium text-gray-700">
                          Quantity
                        </Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            id={`quantity-${item.id}`}
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => handleReviewItemUpdate(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                            className="w-20"
                          />
                          <Select 
                            value={item.unit || 'each'} 
                            onValueChange={(value) => handleReviewItemUpdate(item.id, 'unit', value)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="each">each</SelectItem>
                              <SelectItem value="lbs">lbs</SelectItem>
                              <SelectItem value="oz">oz</SelectItem>
                              <SelectItem value="bag">bag</SelectItem>
                              <SelectItem value="can">can</SelectItem>
                              <SelectItem value="bottle">bottle</SelectItem>
                              <SelectItem value="box">box</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Price (if available) */}
                      {item.price && (
                        <div>
                          <Label htmlFor={`price-${item.id}`} className="text-sm font-medium text-gray-700">
                            Price
                          </Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm">$</span>
                            <Input
                              id={`price-${item.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleReviewItemUpdate(item.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Category and Actions Row */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Category</Label>
                          <Select 
                            value={item.category || 'pantry'} 
                            onValueChange={(value) => handleReviewItemUpdate(item.id, 'category', value)}
                          >
                            <SelectTrigger className="w-32 mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="produce">Produce</SelectItem>
                              <SelectItem value="dairy">Dairy</SelectItem>
                              <SelectItem value="meat">Meat</SelectItem>
                              <SelectItem value="pantry">Pantry</SelectItem>
                              <SelectItem value="frozen">Frozen</SelectItem>
                              <SelectItem value="beverages">Beverages</SelectItem>
                              <SelectItem value="bakery">Bakery</SelectItem>
                              <SelectItem value="snacks">Snacks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {item.confidence && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Confidence</Label>
                            <Badge variant={item.confidence > 80 ? 'default' : item.confidence > 60 ? 'secondary' : 'destructive'} className="mt-1">
                              {item.confidence}%
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveReviewItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {reviewItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No items to review
                  </div>
                )}

                {/* Review Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={handleCancelReview}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  
                  <Button
                    onClick={handleConfirmReview}
                    disabled={reviewItems.length === 0}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add {reviewItems.length} Items to Inventory
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !showResult ? (
          <>
            {/* Input Methods Interface */}
            <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <ReceiptIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Add Your Grocery Items</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="scan" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="scan" className="flex items-center space-x-2">
                      <Camera className="w-4 h-4" />
                      <span>Scan Receipt</span>
                    </TabsTrigger>
                    <TabsTrigger value="dictate" className="flex items-center space-x-2">
                      <Mic className="w-4 h-4" />
                      <span>Dictate Items</span>
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center space-x-2">
                      <Type className="w-4 h-4" />
                      <span>Manual Entry</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Scan Receipt Tab */}
                  <TabsContent value="scan" className="space-y-6">

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50/50">
                  <div className="space-y-2">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-green-600" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Add Receipt Photos
                      </h3>
                      <p className="text-gray-500 mb-3">
                        Drag and drop images here, or click to select files
                      </p>
                      
                      {/* Collapsible Tips Section */}
                      <div className="mb-3">
                        <button
                          onClick={() => setShowTips(!showTips)}
                          className="flex items-center justify-center w-full p-2 text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                        >
                          📸 Best Results Tips
                          {showTips ? (
                            <ChevronUp className="w-4 h-4 ml-2" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-2" />
                          )}
                        </button>
                        
                        {showTips && (
                          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                            <ul className="text-blue-800 space-y-1 text-left">
                              <li>• <strong>💯 Use digital receipts when available</strong> (Costco, Amazon, etc.) - cleanest processing</li>
                              <li>• <strong>Avoid crossouts & store markings</strong> - they interfere with OCR scanning</li>
                              <li>• <strong>Fold receipts to max 4 inches</strong> per photo</li>
                              <li>• <strong>Crop out store header/total</strong> for better accuracy</li>
                              <li>• <strong>Ensure good lighting</strong> and focus on item lines</li>
                              <li>• <strong>Capture multiple photos</strong> for long receipts</li>
                              <li>• <strong>JPEG/PNG work best</strong> (HEIC files need conversion)</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Files
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
                            // Could implement camera capture here
                            toast('Camera capture coming soon! Please use file upload for now.', {
                              icon: '📸',
                            })
                          } else {
                            toast.error('Camera not available on this device')
                          }
                        }}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Use Camera
                      </Button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => handleAddImages(e.target.files)}
                    />
                  </div>
                </div>

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Receipt Images ({images.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {images.map((image) => (
                        <div key={image.id} className="relative group">
                          <div className="aspect-[3/4] relative bg-gray-100 rounded-lg overflow-hidden">
                            {/* Check if file is PDF */}
                            {(image.file.type === 'application/pdf' || image.file.name.toLowerCase().endsWith('.pdf')) ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 border-2 border-red-200">
                                <FileText className="w-16 h-16 text-red-600 mb-2" />
                                <p className="text-sm font-medium text-red-800">PDF Receipt</p>
                                <p className="text-xs text-red-600 text-center px-2">{image.file.name}</p>
                              </div>
                            ) : (
                              <Image
                                src={image.preview}
                                alt="Receipt"
                                fill
                                className="object-cover"
                              />
                            )}
                            
                            {image.uploaded && (
                              <div className="absolute top-2 right-2">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}
                            
                            <button
                              onClick={() => handleRemoveImage(image.id)}
                              className="absolute top-2 left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <p className="mt-2 text-sm text-gray-600 truncate">
                            {image.file.name}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      <Button
                        onClick={handleProcessReceipt}
                        disabled={processing}
                        className="bg-green-600 hover:bg-green-700 flex-1"
                      >
                        {processing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Extract Items with OCR
                          </>
                        )}
                      </Button>
                      
                      <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </div>
                )}

                {/* Processing Progress */}
                {processing && (
                  <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <div>
                          <h3 className="font-medium text-blue-900">Processing Your Receipt</h3>
                          <p className="text-sm text-blue-700">
                            {usingOCRFallback ? ocrStage || 'Processing with OCR...' : processingStage}
                          </p>
                        </div>
                      </div>
                      
                      {/* Processing method indicator */}
                      <div className="flex items-center space-x-1">
                        {processingMethod === 'ai' && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Zap className="w-3 h-3 mr-1" />
                            AI Processing
                          </Badge>
                        )}
                        {processingMethod === 'ocr' && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Eye className="w-3 h-3 mr-1" />
                            OCR Processing
                          </Badge>
                        )}
                        {processingMethod === 'pdf' && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <FileText className="w-3 h-3 mr-1" />
                            PDF Processing
                          </Badge>
                        )}
                        {processingMethod === 'failed' && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Manual Required
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Progress 
                      value={usingOCRFallback ? ocrProgress : processingProgress} 
                      className="w-full" 
                    />
                    
                    <div className="mt-3 flex justify-between items-center">
                      <div className="text-xs text-blue-600">
                        {usingOCRFallback ? ocrProgress : processingProgress}% complete
                      </div>
                      {usingOCRFallback && (
                        <div className="text-xs text-orange-600">
                          Using offline OCR processing
                        </div>
                      )}
                    </div>

                    {/* Fallback explanation */}

                  </div>
                )}

                {/* AI Enhancement Progress (Stage 2) */}
                {enhancing && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        <div>
                          <h3 className="font-medium text-purple-900">🤖 AI Enhancement (Stage 2)</h3>
                          <p className="text-sm text-purple-700">
                            {enhancingStage || 'Enhancing items with AI intelligence...'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <ChefHat className="w-3 h-3 mr-1" />
                          AI Categorization
                        </Badge>
                      </div>
                    </div>
                    
                    <Progress 
                      value={enhancingProgress} 
                      className="w-full" 
                    />
                    
                    <div className="mt-3 flex justify-between items-center">
                      <div className="text-xs text-purple-600">
                        {enhancingProgress}% enhanced
                      </div>
                      <div className="text-xs text-purple-600">
                        Adding categories and shelf life estimates
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded text-xs text-purple-800">
                      <div className="flex items-start space-x-2">
                        <ChefHat className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Smart Enhancement:</strong> AI is analyzing your items to provide accurate food categories, 
                          improved names, and realistic shelf life estimates based on food science.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                  </TabsContent>

                  {/* Dictate Items Tab */}
                  <TabsContent value="dictate" className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-medium text-green-900 mb-2">🎤 Voice Dictation Tips</h3>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Speak clearly and at a moderate pace</li>
                        <li>• Include quantities and item names</li>
                        <li>• Example: "3 apples, a can of tomato soup, a pint of blueberries"</li>
                        <li>• You can mention the date: "August 20th, 2025: 3 apples, tomato soup"</li>
                      </ul>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50/50">
                      <div className="space-y-4">
                        <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                          {isListening ? (
                            <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse" />
                          ) : (
                            <Mic className="w-8 h-8 text-purple-600" />
                          )}
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {isListening ? 'Listening...' : 'Voice Dictation'}
                          </h3>
                          <p className="text-gray-500">
                            {isListening ? 'Speak your grocery items now' : 'Click to start voice recognition'}
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 justify-center">
                          <Button
                            onClick={startDictation}
                            disabled={isListening}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {isListening ? (
                              <>
                                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mr-2" />
                                Recording...
                              </>
                            ) : (
                              <>
                                <Mic className="w-4 h-4 mr-2" />
                                Start Dictation
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Dictated Text Display */}
                    {dictationText && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="dictated-text">Dictated Text</Label>
                          <Textarea
                            id="dictated-text"
                            value={dictationText}
                            onChange={(e) => setDictationText(e.target.value)}
                            placeholder="Your dictated text will appear here..."
                            className="min-h-[100px]"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={processDictatedText}
                            className="bg-green-600 hover:bg-green-700 flex-1"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Extract Items from Text
                          </Button>
                          
                          <Button variant="outline" onClick={() => setDictationText('')}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Clear Text
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Manual Items List from Dictation */}
                    {manualItems.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Extracted Items ({manualItems.length})</h3>
                        <div className="space-y-2">
                          {manualItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                              <div className="flex-1">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-gray-500 ml-2">
                                  {item.quantity} {item.unit} • {item.category} • expires in {item.estimatedShelfLife} days
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveManualItem(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          onClick={handleProcessManualItems}
                          className="bg-green-600 hover:bg-green-700 w-full"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add All Items to Inventory
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Manual Entry Tab */}
                  <TabsContent value="manual" className="space-y-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h3 className="font-medium text-orange-900 mb-2">✏️ Manual Entry</h3>
                      <p className="text-sm text-orange-800">
                        Enter your grocery items one by one with custom details
                      </p>
                    </div>

                    {/* Manual Item Entry Form */}
                    <div className="border rounded-lg p-6 bg-gray-50">
                      <h3 className="text-lg font-medium mb-4">Add New Item</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="item-name">Item Name *</Label>
                          <Input
                            id="item-name"
                            value={currentManualItem.name}
                            onChange={(e) => setCurrentManualItem(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., apples, bread, milk"
                          />
                        </div>

                        <div>
                          <Label htmlFor="item-quantity">Quantity</Label>
                          <Input
                            id="item-quantity"
                            type="number"
                            min="1"
                            value={currentManualItem.quantity}
                            onChange={(e) => setCurrentManualItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="item-unit">Unit</Label>
                          <Select 
                            value={currentManualItem.unit} 
                            onValueChange={(value) => setCurrentManualItem(prev => ({ ...prev, unit: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="each">Each</SelectItem>
                              <SelectItem value="lbs">Pounds</SelectItem>
                              <SelectItem value="oz">Ounces</SelectItem>
                              <SelectItem value="can">Can</SelectItem>
                              <SelectItem value="box">Box</SelectItem>
                              <SelectItem value="bag">Bag</SelectItem>
                              <SelectItem value="bottle">Bottle</SelectItem>
                              <SelectItem value="pint">Pint</SelectItem>
                              <SelectItem value="quart">Quart</SelectItem>
                              <SelectItem value="gallon">Gallon</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="item-category">Category</Label>
                          <Select 
                            value={currentManualItem.category} 
                            onValueChange={(value) => setCurrentManualItem(prev => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="produce">Produce</SelectItem>
                              <SelectItem value="meat">Meat</SelectItem>
                              <SelectItem value="dairy">Dairy</SelectItem>
                              <SelectItem value="bakery">Bakery</SelectItem>
                              <SelectItem value="pantry">Pantry</SelectItem>
                              <SelectItem value="frozen">Frozen</SelectItem>
                              <SelectItem value="beverages">Beverages</SelectItem>
                              <SelectItem value="snacks">Snacks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor="item-shelf-life">Estimated Shelf Life (days)</Label>
                          <Input
                            id="item-shelf-life"
                            type="number"
                            min="1"
                            value={currentManualItem.estimatedShelfLife}
                            onChange={(e) => setCurrentManualItem(prev => ({ ...prev, estimatedShelfLife: parseInt(e.target.value) || 7 }))}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleAddManualItem}
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item to List
                      </Button>
                    </div>

                    {/* Manual Items List */}
                    {manualItems.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Items to Add ({manualItems.length})</h3>
                        <div className="space-y-2">
                          {manualItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                              <div className="flex-1">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-gray-500 ml-2">
                                  {item.quantity} {item.unit} • {item.category} • expires in {item.estimatedShelfLife} days
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveManualItem(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          onClick={handleProcessManualItems}
                          className="bg-green-600 hover:bg-green-700 w-full"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add All Items to Inventory
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Results Interface */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      result?.storeName?.includes('Manual Entry Required') || result?.storeName?.includes('Processing Failed') || (result?.confidence || 0) < 50
                        ? 'bg-gradient-to-br from-orange-400 to-red-500'
                        : 'bg-gradient-to-br from-green-400 to-blue-500'
                    }`}>
                      {result?.storeName?.includes('Manual Entry Required') || result?.storeName?.includes('Processing Failed') || (result?.confidence || 0) < 50 ? (
                        <AlertCircle className="w-6 h-6 text-white" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        {result?.storeName?.includes('Manual Entry Required') || result?.storeName?.includes('Processing Failed') || (result?.confidence || 0) < 50
                          ? 'AI Processing Failed'
                          : 'Receipt Processed Successfully!'
                        }
                      </CardTitle>
                      <CardDescription className="text-base">
                        {result?.storeName?.includes('Manual Entry Required') || result?.storeName?.includes('Processing Failed') || (result?.confidence || 0) < 50
                          ? 'Use manual entry or voice dictation to add your items'
                          : 'Review the extracted items and add them to your inventory'
                        }
                      </CardDescription>
                    </div>
                  </div>
                  
                  <Badge className={
                    (result?.confidence || 0) >= 70 ? 'bg-green-100 text-green-800' :
                    (result?.confidence || 0) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {Math.round(result?.confidence || 0)}% Confidence
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {result && (
                  <>
                    {/* Show different interfaces based on processing success */}
                    {result.storeName?.includes('Manual Entry Required') || result.storeName?.includes('Processing Failed') || (result.confidence || 0) < 50 ? (
                      <>
                        {/* AI Processing Failed - Show Manual Entry Options */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <h3 className="font-medium text-orange-900">AI Processing Unavailable</h3>
                          </div>
                          <p className="text-sm text-orange-800">
                            The AI service is temporarily unavailable. Use one of the alternative methods below to add your grocery items.
                          </p>
                        </div>

                        <Tabs defaultValue="dictate" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="dictate" className="flex items-center space-x-2">
                              <Mic className="w-4 h-4" />
                              <span>Voice Dictation</span>
                            </TabsTrigger>
                            <TabsTrigger value="manual" className="flex items-center space-x-2">
                              <Edit className="w-4 h-4" />
                              <span>Manual Entry</span>
                            </TabsTrigger>
                          </TabsList>

                          {/* Voice Dictation Tab */}
                          <TabsContent value="dictate" className="space-y-6 mt-6">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <h4 className="font-medium text-green-900 mb-2">🎤 Quick Voice Entry</h4>
                              <p className="text-sm text-green-800 mb-2">
                                Say your grocery items like: <em>"August 20th, 2025: 3 apples, a can of tomato soup, a pint of blueberries, a quart of strawberries, a box of spring mix lettuce"</em>
                              </p>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50/50">
                              <div className="space-y-4">
                                <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                                  {isListening ? (
                                    <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse" />
                                  ) : (
                                    <Mic className="w-6 h-6 text-purple-600" />
                                  )}
                                </div>
                                
                                <div>
                                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                                    {isListening ? 'Listening...' : 'Voice Dictation Ready'}
                                  </h4>
                                  <p className="text-gray-500">
                                    {isListening ? 'Speak your grocery items now' : 'Click to start voice recognition'}
                                  </p>
                                </div>

                                <Button
                                  onClick={startDictation}
                                  disabled={isListening}
                                  className="bg-purple-600 hover:bg-purple-700"
                                >
                                  {isListening ? (
                                    <>
                                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mr-2" />
                                      Recording...
                                    </>
                                  ) : (
                                    <>
                                      <Mic className="w-4 h-4 mr-2" />
                                      Start Voice Dictation
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>

                            {dictationText && (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="dictated-text-result">Dictated Text</Label>
                                  <Textarea
                                    id="dictated-text-result"
                                    value={dictationText}
                                    onChange={(e) => setDictationText(e.target.value)}
                                    placeholder="Your dictated text will appear here..."
                                    className="min-h-[100px]"
                                  />
                                </div>

                                <div className="flex gap-3">
                                  <Button
                                    onClick={processDictatedText}
                                    className="bg-green-600 hover:bg-green-700 flex-1"
                                  >
                                    <Zap className="w-4 h-4 mr-2" />
                                    Extract Items from Text
                                  </Button>
                                  
                                  <Button variant="outline" onClick={() => setDictationText('')}>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Clear
                                  </Button>
                                </div>
                              </div>
                            )}
                          </TabsContent>

                          {/* Manual Entry Tab */}
                          <TabsContent value="manual" className="space-y-6 mt-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-900 mb-2">✏️ Manual Item Entry</h4>
                              <p className="text-sm text-blue-800">
                                Add your grocery items one by one with custom details
                              </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-gray-50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="manual-item-name">Item Name *</Label>
                                  <Input
                                    id="manual-item-name"
                                    value={currentManualItem.name}
                                    onChange={(e) => setCurrentManualItem(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., apples, bread, milk"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="manual-item-quantity">Quantity</Label>
                                  <Input
                                    id="manual-item-quantity"
                                    type="number"
                                    min="1"
                                    value={currentManualItem.quantity}
                                    onChange={(e) => setCurrentManualItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="manual-item-unit">Unit</Label>
                                  <Select 
                                    value={currentManualItem.unit} 
                                    onValueChange={(value) => setCurrentManualItem(prev => ({ ...prev, unit: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="each">Each</SelectItem>
                                      <SelectItem value="lbs">Pounds</SelectItem>
                                      <SelectItem value="oz">Ounces</SelectItem>
                                      <SelectItem value="can">Can</SelectItem>
                                      <SelectItem value="box">Box</SelectItem>
                                      <SelectItem value="bag">Bag</SelectItem>
                                      <SelectItem value="bottle">Bottle</SelectItem>
                                      <SelectItem value="pint">Pint</SelectItem>
                                      <SelectItem value="quart">Quart</SelectItem>
                                      <SelectItem value="gallon">Gallon</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label htmlFor="manual-item-category">Category</Label>
                                  <Select 
                                    value={currentManualItem.category} 
                                    onValueChange={(value) => setCurrentManualItem(prev => ({ ...prev, category: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="produce">Produce</SelectItem>
                                      <SelectItem value="meat">Meat</SelectItem>
                                      <SelectItem value="dairy">Dairy</SelectItem>
                                      <SelectItem value="bakery">Bakery</SelectItem>
                                      <SelectItem value="pantry">Pantry</SelectItem>
                                      <SelectItem value="frozen">Frozen</SelectItem>
                                      <SelectItem value="beverages">Beverages</SelectItem>
                                      <SelectItem value="snacks">Snacks</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <Button
                                onClick={handleAddManualItem}
                                className="mt-4 bg-blue-600 hover:bg-blue-700"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Item to List
                              </Button>
                            </div>
                          </TabsContent>
                        </Tabs>

                        {/* Manual Items List */}
                        {manualItems.length > 0 && (
                          <div className="mt-6 space-y-4">
                            <h3 className="text-lg font-medium">Items Ready to Add ({manualItems.length})</h3>
                            <div className="space-y-2">
                              {manualItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                                  <div className="flex-1">
                                    <span className="font-medium">{item.name}</span>
                                    <span className="text-gray-500 ml-2">
                                      {item.quantity} {item.unit} • {item.category} • expires in {item.estimatedShelfLife} days
                                    </span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveManualItem(index)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <Button
                              onClick={handleProcessManualItems}
                              className="bg-green-600 hover:bg-green-700 w-full"
                              size="lg"
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Add All Items to Food Inventory
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* AI Processing Successful - Show Regular Results */}
                        {/* Receipt Summary */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Store</p>
                              <p className="font-medium">{result.storeName || 'Unknown Store'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Purchase Date</p>
                              <input
                                type="date"
                                value={editableReceiptDate}
                                onChange={(e) => setEditableReceiptDate(e.target.value)}
                                className="font-medium bg-transparent border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Items Found</p>
                              <p className="font-medium">{result.items.length}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Total Amount</p>
                              <p className="font-medium">
                                {result.totalAmount ? `$${result.totalAmount.toFixed(2)}` : 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <h3 className="text-lg font-medium">Extracted Items</h3>
                              {enhancementComplete && (
                                <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                                  <ChefHat className="w-3 h-3 mr-1" />
                                  AI Enhanced
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {!enhancementComplete && !enhancing && (
                                <Button
                                  onClick={handleManualEnhance}
                                  variant="outline"
                                  size="sm"
                                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                >
                                  <ChefHat className="w-4 h-4 mr-2" />
                                  Enhance with AI
                                </Button>
                              )}
                              
                              <Button
                                onClick={() => openReviewScreen(result.items)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Review & Add to Inventory
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {result.items.map((item) => (
                              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                                      <Badge variant="outline" className={
                                        item.confidence >= 90 ? 'bg-green-50 text-green-700 border-green-200' :
                                        item.confidence >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-red-50 text-red-700 border-red-200'
                                      }>
                                        {Math.round(item.confidence)}%
                                      </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                      <div>
                                        <span className="text-gray-500">Quantity:</span> {item.quantity} {item.unit || 'items'}
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Price:</span> {item.price ? `$${item.price.toFixed(2)}` : 'Unknown'}
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Category:</span> {item.category || 'Unknown'}
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-gray-500">Expires in:</span> {item.estimatedShelfLife || 'Unknown'} days
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <Button variant="outline" size="sm">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons for successful processing */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-gray-200">
                          <Button
                            onClick={handleReset}
                            variant="outline"
                            className="flex-1"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Scan Another Receipt
                          </Button>
                          
                          <Link href="/recipe-generator" className="flex-1">
                            <Button className="w-full bg-orange-600 hover:bg-orange-700">
                              <ChefHat className="w-4 h-4 mr-2" />
                              Generate Recipes
                            </Button>
                          </Link>
                        </div>
                      </>
                    )}

                    {/* Universal Action Button for Going Back */}
                    <div className="flex justify-center mt-6 pt-6 border-t border-gray-200">
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="min-w-[200px]"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
