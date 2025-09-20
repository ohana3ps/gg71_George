
import { NextRequest, NextResponse } from 'next/server'

// Food category mapping and shelf life database
const FOOD_CATEGORIES = {
  // Produce
  'produce': ['fruit', 'vegetable', 'apple', 'banana', 'orange', 'lettuce', 'spinach', 'tomato', 'onion', 'potato', 'carrot', 'broccoli', 'avocado'],
  
  // Dairy
  'dairy': ['milk', 'cheese', 'butter', 'yogurt', 'egg', 'cream', 'sour cream', 'cottage cheese'],
  
  // Meat & Seafood
  'meat': ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'ground beef', 'bacon', 'ham'],
  
  // Pantry/Dry goods
  'pantry': ['rice', 'pasta', 'bean', 'cereal', 'flour', 'sugar', 'oil', 'vinegar', 'spice', 'sauce', 'can', 'jar'],
  
  // Bakery
  'bakery': ['bread', 'bagel', 'muffin', 'croissant', 'roll', 'baguette'],
  
  // Frozen
  'frozen': ['frozen', 'ice cream', 'popsicle'],
  
  // Beverages
  'beverage': ['water', 'soda', 'juice', 'coffee', 'tea', 'beer', 'wine'],
  
  // Condiments
  'condiment': ['ketchup', 'mustard', 'mayonnaise', 'salad dressing', 'hot sauce', 'soy sauce'],
  
  // Snacks
  'snack': ['chip', 'cookie', 'cracker', 'nut', 'candy', 'chocolate', 'popcorn', 'wafer', 'bar']
}

const SHELF_LIFE_DATABASE = {
  // Produce (days)
  'apple': 14, 'banana': 5, 'orange': 10, 'lettuce': 7, 'spinach': 5,
  'tomato': 7, 'onion': 21, 'potato': 14, 'carrot': 21, 'broccoli': 7,
  'avocado': 5,
  
  // Dairy
  'milk': 7, 'cheese': 21, 'butter': 30, 'yogurt': 14, 'egg': 21, 'cream': 7,
  
  // Meat
  'chicken': 3, 'beef': 3, 'pork': 3, 'fish': 2, 'salmon': 2, 'turkey': 3,
  
  // Pantry (long shelf life)
  'rice': 365, 'pasta': 365, 'bean': 365, 'cereal': 365, 'flour': 180,
  'sugar': 730, 'oil': 365, 'sauce': 365, 'can': 730, 'jar': 365,
  
  // Bakery
  'bread': 7, 'bagel': 7, 'muffin': 5,
  
  // Frozen
  'frozen': 90, 'ice cream': 60,
  
  // Beverages
  'water': 365, 'soda': 365, 'juice': 7, 'coffee': 365, 'tea': 365,
  
  // Condiments
  'ketchup': 365, 'mustard': 365, 'mayonnaise': 60,
  
  // Snacks
  'chip': 30, 'cookie': 30, 'cracker': 60, 'candy': 365, 'chocolate': 365,
  'wafer': 30, 'bar': 365
}

function categorizeItem(itemName: string): string {
  const name = itemName.toLowerCase()
  
  for (const [category, keywords] of Object.entries(FOOD_CATEGORIES)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category
    }
  }
  
  return 'pantry' // default category
}

function getShelfLife(itemName: string): number {
  const name = itemName.toLowerCase()
  
  // Check for exact or partial matches
  for (const [food, days] of Object.entries(SHELF_LIFE_DATABASE)) {
    if (name.includes(food)) {
      return days
    }
  }
  
  // Category-based defaults
  const category = categorizeItem(name)
  const categoryDefaults = {
    'produce': 7,
    'dairy': 14,
    'meat': 3,
    'bakery': 7,
    'frozen': 90,
    'beverage': 30,
    'condiment': 365,
    'snack': 30,
    'pantry': 90
  }
  
  return categoryDefaults[category as keyof typeof categoryDefaults] || 14
}

async function enhanceWithAI(items: any[], storeName?: string, purchaseDate?: string) {
  console.log('🤖 Attempting AI enhancement...')
  
  try {
    const response = await fetch(`${process.env.ABACUSAI_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a food categorization expert. For each grocery item, provide:
1. category: one of [produce, dairy, meat, bakery, frozen, beverage, condiment, snack, pantry]
2. estimatedShelfLife: realistic shelf life in days from purchase date
3. improvedName: cleaned up, standardized item name

Consider the store "${storeName}" and purchase date "${purchaseDate}".
Respond with valid JSON array only.`
          },
          {
            role: 'user',
            content: `Categorize these grocery items: ${items.map(item => item.name).join(', ')}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      throw new Error(`AI API failed: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    if (aiResponse) {
      try {
        const aiEnhancements = JSON.parse(aiResponse)
        if (Array.isArray(aiEnhancements) && aiEnhancements.length === items.length) {
          return aiEnhancements
        }
      } catch (parseError) {
        console.warn('AI response parsing failed:', parseError)
      }
    }

    throw new Error('Invalid AI response format')

  } catch (error) {
    console.warn('AI enhancement failed:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { items, storeName, purchaseDate } = await request.json()
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid items array' }, { status: 400 })
    }

    console.log(`🔄 Enhancing ${items.length} items...`)

    // Try AI enhancement first
    const aiEnhancements = await enhanceWithAI(items, storeName, purchaseDate)
    
    const enhancedItems = items.map((item, index) => {
      let category = categorizeItem(item.name)
      let estimatedShelfLife = getShelfLife(item.name)
      let improvedName = item.name

      // Use AI enhancements if available
      if (aiEnhancements && aiEnhancements[index]) {
        const aiItem = aiEnhancements[index]
        category = aiItem.category || category
        estimatedShelfLife = aiItem.estimatedShelfLife || estimatedShelfLife
        improvedName = aiItem.improvedName || improvedName
      }

      return {
        ...item,
        name: improvedName,
        category,
        estimatedShelfLife,
        confidence: aiEnhancements ? 90 : 75 // Higher confidence with AI
      }
    })

    console.log(`✅ Enhanced ${enhancedItems.length} items successfully`)

    return NextResponse.json({ 
      success: true,
      items: enhancedItems,
      enhancementMethod: aiEnhancements ? 'ai' : 'local'
    })

  } catch (error) {
    console.error('❌ Enhancement API error:', error)
    
    return NextResponse.json({ 
      error: 'Enhancement failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
