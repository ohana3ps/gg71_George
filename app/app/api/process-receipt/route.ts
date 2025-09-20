
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Food shelf life database (in days from purchase)
const SHELF_LIFE_DATABASE: Record<string, { category: string; days: number }> = {
  // Produce
  'banana': { category: 'produce', days: 5 },
  'bananas': { category: 'produce', days: 5 },
  'apple': { category: 'produce', days: 14 },
  'apples': { category: 'produce', days: 14 },
  'orange': { category: 'produce', days: 10 },
  'oranges': { category: 'produce', days: 10 },
  'lettuce': { category: 'produce', days: 7 },
  'spinach': { category: 'produce', days: 5 },
  'tomato': { category: 'produce', days: 7 },
  'tomatoes': { category: 'produce', days: 7 },
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
  'yogurt': { category: 'dairy', days: 14 },
  'cheese': { category: 'dairy', days: 21 },
  'butter': { category: 'dairy', days: 30 },
  'eggs': { category: 'dairy', days: 21 },
  
  // Meat
  'chicken': { category: 'meat', days: 3 },
  'beef': { category: 'meat', days: 3 },
  'pork': { category: 'meat', days: 3 },
  'fish': { category: 'meat', days: 2 },
  'salmon': { category: 'meat', days: 2 },
  
  // Bread & Grains
  'bread': { category: 'bakery', days: 7 },
  'bagel': { category: 'bakery', days: 5 },
  'bagels': { category: 'bakery', days: 5 },
  
  // Pantry items (longer shelf life)
  'rice': { category: 'pantry', days: 365 },
  'pasta': { category: 'pantry', days: 365 },
  'beans': { category: 'pantry', days: 365 },
  'cereal': { category: 'pantry', days: 365 },
}

export async function POST(request: NextRequest) {
  let imageUrls: string[] = []
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestData = await request.json()
    imageUrls = requestData.imageUrls

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No image URLs provided' }, { status: 400 })
    }

    // Create receipt record
    const receipt = await prisma.receipt.create({
      data: {
        userId: session.user.id,
        receiptImageUrls: imageUrls,
        purchaseDate: new Date(), // Default to today, AI will try to extract actual date
        processingStatus: 'processing',
      }
    })

    // Process receipt with AI
    const processingResult = await processReceiptWithAI(imageUrls)

    // Update receipt with processed data
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        storeName: processingResult.storeName,
        purchaseDate: processingResult.purchaseDate || new Date(),
        totalAmount: processingResult.totalAmount,
        rawText: processingResult.rawText,
        confidence: processingResult.confidence,
        processingStatus: 'completed',
      }
    })

    // 🗑️ CLEANUP: Delete receipt images after successful processing
    await cleanupReceiptImages(imageUrls)

    // Create receipt items
    const receiptItems = []
    for (const item of processingResult.items) {
      const receiptItem = await prisma.receiptItem.create({
        data: {
          receiptId: receipt.id,
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit,
          price: item.price,
          category: item.category,
          estimatedShelfLife: item.estimatedShelfLife,
          confidence: item.confidence || 80,
        }
      })
      receiptItems.push(receiptItem)
    }

    return NextResponse.json({
      receiptId: receipt.id,
      storeName: processingResult.storeName,
      purchaseDate: processingResult.purchaseDate || new Date(),
      totalAmount: processingResult.totalAmount,
      items: receiptItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        category: item.category,
        estimatedShelfLife: item.estimatedShelfLife,
        confidence: item.confidence || 80,
      })),
      confidence: processingResult.confidence || 85,
    })

  } catch (error) {
    console.error('Receipt processing error:', error)
    
    // 🗑️ CLEANUP: Always delete images even if processing fails
    if (imageUrls && imageUrls.length > 0) {
      try {
        await cleanupReceiptImages(imageUrls)
      } catch (cleanupError) {
        console.warn('Failed to cleanup images after error:', cleanupError)
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process receipt' },
      { status: 500 }
    )
  }
}

// AI Provider types
interface AIProvider {
  name: string
  process: (imageUrls: string[], prompt: string) => Promise<any>
  enabled: boolean
}

async function processReceiptWithAI(imageUrls: string[]): Promise<{
  storeName?: string
  purchaseDate?: Date
  totalAmount?: number
  rawText?: string
  confidence: number
  items: Array<{
    name: string
    quantity?: number
    unit?: string
    price?: number
    category?: string
    estimatedShelfLife?: number
    confidence?: number
  }>
  processingMethod?: string
}> {
  console.log('Processing receipt with AI...', { imageUrls, providers: getAvailableProviders().length })

  // Create a comprehensive prompt for receipt processing
  const prompt = `You are an expert receipt analyzer. Analyze the grocery receipt images and extract ALL information in JSON format.

CRITICAL: Return ONLY valid JSON, no other text or formatting.

{
  "storeName": "Name of the store (if visible)",
  "purchaseDate": "Date of purchase in YYYY-MM-DD format",
  "totalAmount": 25.67,
  "confidence": 95,
  "items": [
    {
      "name": "bananas",
      "quantity": 1,
      "unit": "lbs",
      "price": 1.50,
      "category": "produce",
      "estimatedShelfLife": 5,
      "confidence": 90
    }
  ]
}

Extract every single item from the receipt:
- Clean item names (remove codes, abbreviations)
- Include quantities, units, prices
- Categorize as: produce, meat, dairy, bakery, pantry, frozen, etc.
- Estimate shelf life in days
- Be thorough - don't miss any items`

  const providers = getAvailableProviders()
  let lastError: Error | null = null

  // Try each provider in order of priority
  for (const provider of providers) {
    try {
      console.log(`Attempting ${provider.name} provider...`)
      const result = await provider.process(imageUrls, prompt)
      
      // Validate result
      if (result && result.items && result.items.length > 0) {
        console.log(`Success with ${provider.name}!`)
        return {
          ...result,
          processingMethod: provider.name
        }
      } else {
        throw new Error(`${provider.name} returned no items`)
      }

    } catch (error) {
      console.log(`${provider.name} failed:`, error)
      lastError = error instanceof Error ? error : new Error(`${provider.name} failed`)
      continue // Try next provider
    }
  }

  // All providers failed
  console.error('All AI providers failed:', lastError)
  throw lastError || new Error('All AI providers failed')
}

function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = []

  // AbacusAI provider (primary)
  if (process.env.ABACUSAI_API_KEY) {
    providers.push({
      name: 'AbacusAI',
      enabled: true,
      process: processWithAbacusAI
    })
  }

  // Google Vision API provider (fallback)
  if (process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    providers.push({
      name: 'Google Vision',
      enabled: true,
      process: processWithGoogleVision
    })
  }

  // OpenAI provider (if different key available)
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== process.env.ABACUSAI_API_KEY) {
    providers.push({
      name: 'OpenAI',
      enabled: true,
      process: processWithOpenAI
    })
  }

  console.log(`Available providers: ${providers.map(p => p.name).join(', ')}`)
  return providers
}

async function processWithAbacusAI(imageUrls: string[], prompt: string): Promise<any> {
  // Prepare image URLs with proper base URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const fullImageUrls = imageUrls.map(url => 
    url.startsWith('http') ? url : `${baseUrl}${url}`
  )

  console.log('AbacusAI processing:', fullImageUrls)

  // Create a fetch request with timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
  
  const response = await fetch('https://abacusai-api-prod.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: 'gpt-4o-mini',  // Use more reliable, cost-effective model
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            ...fullImageUrls.map(url => ({
              type: 'image_url',
              image_url: {
                url: url,
                detail: 'high'
              }
            }))
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AbacusAI API failed: ${response.status} - ${errorText}`)
  }

  const aiResponse = await response.json()
  const content = aiResponse.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content received from AbacusAI')
  }

  return parseAIResponse(content)
}

async function processWithGoogleVision(imageUrls: string[], prompt: string): Promise<any> {
  // Google Vision API implementation
  // This is a placeholder for now - would need Google Cloud Vision API setup
  throw new Error('Google Vision API not implemented yet')
}

async function processWithOpenAI(imageUrls: string[], prompt: string): Promise<any> {
  // OpenAI API implementation
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const fullImageUrls = imageUrls.map(url => 
    url.startsWith('http') ? url : `${baseUrl}${url}`
  )

  console.log('OpenAI processing:', fullImageUrls)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            ...fullImageUrls.map(url => ({
              type: 'image_url',
              image_url: {
                url: url,
                detail: 'high'
              }
            }))
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`)
  }

  const aiResponse = await response.json()
  const content = aiResponse.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content received from OpenAI')
  }

  return parseAIResponse(content)
}

function parseAIResponse(content: string): any {
  // Parse AI response more robustly
  let parsedData
  try {
    // Clean the content first
    let cleanContent = content.trim()
    
    // Remove markdown code blocks if present
    const jsonMatch = cleanContent.match(/```(?:json)?\s*(\{.*?\})\s*```/s)
    if (jsonMatch) {
      cleanContent = jsonMatch[1]
    }
    
    // Try to find JSON object boundaries
    const jsonStart = cleanContent.indexOf('{')
    const jsonEnd = cleanContent.lastIndexOf('}')
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1)
    }

    console.log('Parsing JSON content:', cleanContent.substring(0, 500))
    parsedData = JSON.parse(cleanContent)

  } catch (parseError) {
    console.error('JSON Parse Error:', parseError)
    console.error('Raw AI response:', content)
    
    // Last resort: try to extract basic information with regex
    const storeMatch = content.match(/store["\s]*:?["\s]*([^"',\n]+)/i)
    const dateMatch = content.match(/date["\s]*:?["\s]*([0-9]{4}-[0-9]{1,2}-[0-9]{1,2})/i)
    const totalMatch = content.match(/total["\s]*:?["\s]*([0-9]+\.?[0-9]*)/i)
    
    // Try to extract items with basic patterns
    const itemMatches = content.match(/"name"["\s]*:["\s]*"([^"]+)"/g) || []
    const extractedItems = itemMatches.slice(0, 5).map((match: string) => {
      const nameMatch = match.match(/"([^"]+)"$/)
      return {
        name: nameMatch ? nameMatch[1].toLowerCase() : 'unknown item',
        quantity: 1,
        category: 'pantry',
        estimatedShelfLife: 7,
        confidence: 60
      }
    })

    return {
      storeName: storeMatch ? storeMatch[1].trim() : 'Unknown Store',
      purchaseDate: dateMatch ? new Date(dateMatch[1]) : new Date(),
      totalAmount: totalMatch ? parseFloat(totalMatch[1]) : undefined,
      rawText: content,
      confidence: 60,
      items: extractedItems.length > 0 ? extractedItems : [{
        name: 'parsing error - check receipt image quality',
        quantity: 1,
        category: 'pantry',
        estimatedShelfLife: 7,
        confidence: 40
      }]
    }
  }

  // Validate and enhance parsed data
  if (!parsedData || typeof parsedData !== 'object') {
    throw new Error('Invalid parsed data structure')
  }

  // Enhance items with our shelf life database
  let processedItems = []
  if (parsedData.items && Array.isArray(parsedData.items) && parsedData.items.length > 0) {
    processedItems = parsedData.items.map((item: any) => {
      if (!item || !item.name) return null

      const itemNameLower = item.name.toLowerCase()
      const shelfLifeInfo = Object.entries(SHELF_LIFE_DATABASE).find(([key]) => 
        itemNameLower.includes(key)
      )?.[1]

      return {
        name: itemNameLower.trim(),
        quantity: Math.max(1, parseInt(item.quantity) || 1),
        unit: item.unit?.toString().trim() || 'each',
        price: item.price ? parseFloat(item.price) : undefined,
        category: shelfLifeInfo?.category || item.category || 'pantry',
        estimatedShelfLife: shelfLifeInfo?.days || parseInt(item.estimatedShelfLife) || 7,
        confidence: Math.min(100, Math.max(40, parseInt(item.confidence) || 80))
      }
    }).filter(Boolean)
  }

  const result = {
    storeName: parsedData.storeName?.toString().trim() || 'Unknown Store',
    purchaseDate: parsedData.purchaseDate ? new Date(parsedData.purchaseDate) : new Date(),
    totalAmount: parsedData.totalAmount ? parseFloat(parsedData.totalAmount) : undefined,
    rawText: content.substring(0, 1000), // Limit raw text size
    confidence: Math.min(100, Math.max(40, parseInt(parsedData.confidence) || 85)),
    items: processedItems.length > 0 ? processedItems : [{
      name: 'no items detected - check image clarity',
      quantity: 1,
      category: 'pantry',
      estimatedShelfLife: 7,
      confidence: 50
    }]
  }

  console.log('Final processed result:', {
    storeName: result.storeName,
    itemCount: result.items.length,
    confidence: result.confidence
  })

  return result
}

// 🗑️ Cleanup function to delete receipt images after processing
async function cleanupReceiptImages(imageUrls: string[]): Promise<void> {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  for (const imageUrl of imageUrls) {
    try {
      // Convert API URL back to file path
      // e.g., "/api/files/receipt/filename.jpg" -> "uploads/receipt/filename.jpg"
      const urlPath = imageUrl.replace('/api/files/', '')
      const filePath = path.join(process.cwd(), 'uploads', urlPath)
      
      // Delete the file if it exists
      try {
        await fs.unlink(filePath)
        console.log(`🗑️ Cleaned up receipt image: ${filePath}`)
      } catch (deleteError: any) {
        if (deleteError.code !== 'ENOENT') {
          console.warn(`⚠️ Could not delete ${filePath}:`, deleteError.message)
        }
        // ENOENT means file doesn't exist, which is fine
      }
    } catch (error) {
      console.warn(`⚠️ Error during image cleanup for ${imageUrl}:`, error)
      // Don't fail the entire process if cleanup fails
    }
  }
}
