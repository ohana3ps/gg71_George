
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

interface RecipePreferences {
  mealType: string
  proteinBase: string
  complexity: string
  timeConstraint: string
  dietaryRestrictions: string[]
  servingSize: number
  useExpiringFirst: boolean
}

interface FoodItem {
  id: string
  name: string
  category: string | null
  unit: string | null
  expirationDate: string | null
  room: {
    id: string
    name: string
  }
  daysUntilExpiration: number | null
  isExpiring: boolean
}

interface Recipe {
  title: string
  description: string
  prepTime: string
  cookTime: string
  totalTime: string
  servings: number
  difficulty: string
  ingredients: {
    name: string
    amount: string
    available: boolean
    expiring?: boolean
    roomLocation?: string
  }[]
  instructions: {
    step: number
    description: string
    tips?: string
  }[]
  nutritionInfo?: {
    calories?: string
    protein?: string
    carbs?: string
    fat?: string
  }
  missingIngredients: string[]
  chefTips: string[]
  tags: string[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const preferences: RecipePreferences = body.preferences
    
    if (!preferences || !preferences.mealType || !preferences.proteinBase || !preferences.complexity || !preferences.timeConstraint) {
      return NextResponse.json(
        { error: 'Missing required preferences' },
        { status: 400 }
      )
    }

    // Fetch user's food inventory - Direct database query instead of internal API call
    const { prisma } = await import('@/lib/db')
    
    console.log('🔧 Generate Recipe API - Fetching inventory directly from database...')
    
    let foodItems: any[] = []
    try {
      // Get all food items (shared household data)
      foodItems = await prisma.item.findMany({
        where: {
          isActive: true,
          isFood: true
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        },
        orderBy: [
          {
            expirationDate: 'asc'
          },
          {
            createdAt: 'desc'
          }
        ]
      })
      
      console.log(`✅ Successfully fetched ${foodItems.length} food items from database`)
    } catch (dbError) {
      console.error('❌ Database query failed:', dbError)
      // Continue with empty inventory rather than failing completely
      foodItems = []
    }

    // Calculate expiration status for each item
    const now = new Date()
    const itemsWithExpirationStatus = foodItems.map(item => {
      let isExpiring = false
      let daysUntilExpiration = null

      if (item.expirationDate) {
        const expirationDate = new Date(item.expirationDate)
        const timeDiff = expirationDate.getTime() - now.getTime()
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
        daysUntilExpiration = daysDiff
        
        if (daysDiff <= 3) {
          isExpiring = true
        }
      }

      return {
        ...item,
        isExpiring,
        daysUntilExpiration
      }
    })

    // Group by category for transformation
    const groupedByCategory = itemsWithExpirationStatus.reduce((acc, item) => {
      const category = item.foodCategory || 'Other Food Items'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {} as Record<string, typeof itemsWithExpirationStatus>)

    // Transform to expected format
    let foodInventory: { [category: string]: { [roomName: string]: FoodItem[] } } = {}
    Object.entries(groupedByCategory).forEach(([category, items]) => {
      foodInventory[category] = {}
      
      const typedItems = items as typeof itemsWithExpirationStatus
      typedItems.forEach(item => {
        const roomName = item.room.name
        if (!foodInventory[category][roomName]) {
          foodInventory[category][roomName] = []
        }
        foodInventory[category][roomName].push(item as FoodItem)
      })
    })
    
    console.log('🔧 Generate Recipe API - Direct DB query results:', {
      totalCategories: Object.keys(foodInventory).length,
      categories: Object.keys(foodInventory),
      totalItemsFromDB: itemsWithExpirationStatus.length,
      expiringItems: itemsWithExpirationStatus.filter(item => item.isExpiring).length
    })

    // Build food items list with expiration priority
    const allFoodItems: FoodItem[] = []
    Object.values(foodInventory).forEach(category => {
      Object.values(category).forEach(items => {
        allFoodItems.push(...items)
      })
    })
    
    console.log('🍽️ Generate Recipe API - Food items for recipe:', {
      totalFoodItems: allFoodItems.length,
      expiringItems: allFoodItems.filter(item => item.isExpiring).length,
      sampleItems: allFoodItems.slice(0, 3).map(item => item.name)
    })

    // Sort by expiration if requested
    if (preferences.useExpiringFirst) {
      allFoodItems.sort((a, b) => {
        if (a.isExpiring && !b.isExpiring) return -1
        if (!a.isExpiring && b.isExpiring) return 1
        if (a.daysUntilExpiration !== null && b.daysUntilExpiration !== null) {
          return a.daysUntilExpiration - b.daysUntilExpiration
        }
        return 0
      })
    }

    // Create smart prompt for LLM
    const prompt = buildRecipePrompt(preferences, allFoodItems)

    // Call LLM API for recipe generation
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef AI assistant specializing in creating personalized recipes based on available ingredients and user preferences. You create detailed, practical recipes with clear instructions and helpful tips.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
        temperature: 0.7,
        stream: true
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`LLM API error ${response.status}:`, errorText)
      throw new Error(`LLM API error: ${response.status} - ${errorText}`)
    }

    // Stream the response back to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        
        let buffer = ''
        let partialRead = ''

        try {
          while (true) {
            const { done, value } = await reader?.read() || { done: true, value: undefined }
            if (done) break

            partialRead += decoder.decode(value, { stream: true })
            let lines = partialRead.split('\n')
            partialRead = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  try {
                    const finalResult = JSON.parse(buffer)
                    
                    // Validate and enhance the recipe
                    const enhancedRecipe = enhanceRecipeData(finalResult, allFoodItems, preferences)
                    
                    const finalData = JSON.stringify({
                      status: 'completed',
                      recipe: enhancedRecipe,
                      timestamp: new Date().toISOString()
                    })
                    
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
                  } catch (error) {
                    console.error('Error parsing final recipe:', error)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      status: 'error',
                      message: 'Failed to parse recipe data'
                    })}\n\n`))
                  }
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  buffer += parsed.choices?.[0]?.delta?.content || ''
                  
                  // Send progress updates
                  const progressData = JSON.stringify({
                    status: 'processing',
                    message: 'AI Chef is creating your recipe...',
                    progress: Math.min(buffer.length / 10, 99) // Rough progress estimate
                  })
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`))
                  
                } catch (e) {
                  // Skip invalid JSON chunks
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'error',
            message: 'Recipe generation failed'
          })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Recipe generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recipe' },
      { status: 500 }
    )
  }
}

function buildRecipePrompt(preferences: RecipePreferences, foodItems: FoodItem[]): string {
  // Build available ingredients list
  const availableIngredients = foodItems.map(item => {
    let description = `${item.name}`
    if (item.unit) description += ` (${item.unit})`
    if (item.isExpiring) description += ` [EXPIRING SOON]`
    if (item.room) description += ` - located in ${item.room.name}`
    return description
  }).join('\n')

  // Map preference values to readable text
  const mealTypeMap: { [key: string]: string } = {
    'no-preference': 'Any meal type',
    'breakfast': 'Breakfast',
    'lunch': 'Lunch', 
    'dinner': 'Dinner',
    'snack': 'Snack',
    'dessert': 'Dessert'
  }

  const proteinMap: { [key: string]: string } = {
    'no-preference': 'Any protein source',
    'chicken': 'Chicken',
    'beef': 'Beef',
    'fish': 'Fish/Seafood',
    'pork': 'Pork',
    'vegetarian': 'Vegetarian (no meat)',
    'vegan': 'Vegan (no animal products)',
    'any': 'Any protein source'
  }

  const complexityMap: { [key: string]: string } = {
    'no-preference': 'Any difficulty level',
    'quick': 'Quick & Easy (minimal steps, basic techniques)',
    'moderate': 'Moderate (some cooking skills required)',
    'advanced': 'Advanced (complex techniques and ingredients)'
  }

  const timeMap: { [key: string]: string } = {
    'no-preference': 'Any cooking time',
    '15min': '15 minutes or less',
    '30min': '30 minutes or less',
    '1hour': '1 hour or less',
    '2hours': '2+ hours (no time limit)'
  }

  // Filter out "no-preference" and only include actual dietary restrictions
  const actualDietaryRestrictions = preferences.dietaryRestrictions.filter(r => r !== 'no-preference')
  const dietaryText = actualDietaryRestrictions.length > 0 
    ? `\n- Dietary restrictions: ${actualDietaryRestrictions.join(', ')}`
    : ''

  const expiringPriorityText = preferences.useExpiringFirst
    ? '\n- IMPORTANT: Prioritize using ingredients marked as [EXPIRING SOON] in the recipe'
    : ''

  // Build flexible meal preferences based on user selections
  const mealTypeText = preferences.mealType === 'no-preference' 
    ? 'Any meal type (be creative with the type of dish)' 
    : mealTypeMap[preferences.mealType] || preferences.mealType

  const proteinText = preferences.proteinBase === 'no-preference' 
    ? 'Any protein source (choose based on available ingredients)' 
    : proteinMap[preferences.proteinBase] || preferences.proteinBase

  const complexityText = preferences.complexity === 'no-preference' 
    ? 'Any difficulty level (match complexity to available ingredients and time)' 
    : complexityMap[preferences.complexity] || preferences.complexity

  const timeText = preferences.timeConstraint === 'no-preference' 
    ? 'Any cooking time (optimize based on recipe complexity)' 
    : timeMap[preferences.timeConstraint] || preferences.timeConstraint

  return `Please create a detailed recipe with the following requirements:

MEAL PREFERENCES:
- Meal type: ${mealTypeText}
- Protein base: ${proteinText}
- Complexity level: ${complexityText}
- Time constraint: ${timeText}
- Serving size: ${preferences.servingSize} people${dietaryText}${expiringPriorityText}

AVAILABLE INGREDIENTS:
${availableIngredients || 'No specific ingredients available - create a general recipe'}

RECIPE REQUIREMENTS:
1. Create a recipe that uses as many available ingredients as possible
2. If ingredients are marked as [EXPIRING SOON], try to incorporate them prominently
3. Include realistic prep/cook times that fit the time constraint
4. Provide clear, step-by-step instructions
5. Include helpful cooking tips and techniques
6. List any additional ingredients needed that aren't available
7. Add nutrition information if possible

Please respond in JSON format with the following exact structure:
{
  "title": "Recipe name",
  "description": "Brief appetizing description of the dish",
  "prepTime": "15 mins",
  "cookTime": "20 mins", 
  "totalTime": "35 mins",
  "servings": ${preferences.servingSize},
  "difficulty": "Easy/Medium/Hard",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": "quantity and unit",
      "available": true,
      "expiring": false,
      "roomLocation": "kitchen"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "description": "Detailed instruction for this step",
      "tips": "Optional cooking tip for this step"
    }
  ],
  "nutritionInfo": {
    "calories": "per serving estimate",
    "protein": "grams per serving",
    "carbs": "grams per serving",
    "fat": "grams per serving"
  },
  "missingIngredients": ["list", "of", "ingredients", "to", "buy"],
  "chefTips": ["helpful cooking tips", "storage suggestions", "variations"],
  "tags": ["relevant", "recipe", "tags"]
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
}

function enhanceRecipeData(rawRecipe: any, availableItems: FoodItem[], preferences: RecipePreferences): Recipe {
  // Enhance ingredients with availability data
  const enhancedIngredients = (rawRecipe.ingredients || []).map((ingredient: any) => {
    const matchingItem = availableItems.find(item => 
      item.name.toLowerCase().includes(ingredient.name?.toLowerCase()) ||
      ingredient.name?.toLowerCase().includes(item.name.toLowerCase())
    )

    return {
      ...ingredient,
      available: !!matchingItem,
      expiring: matchingItem?.isExpiring || false,
      roomLocation: matchingItem?.room?.name || undefined
    }
  })

  // Extract missing ingredients
  const missingIngredients = enhancedIngredients
    .filter((ing: any) => !ing.available)
    .map((ing: any) => ing.name)

  // Add default values and ensure required fields
  const enhancedRecipe: Recipe = {
    title: rawRecipe.title || 'Delicious Recipe',
    description: rawRecipe.description || 'A wonderful dish made with your available ingredients',
    prepTime: rawRecipe.prepTime || '15 mins',
    cookTime: rawRecipe.cookTime || '20 mins',
    totalTime: rawRecipe.totalTime || '35 mins',
    servings: rawRecipe.servings || preferences.servingSize,
    difficulty: rawRecipe.difficulty || 'Medium',
    ingredients: enhancedIngredients,
    instructions: rawRecipe.instructions || [],
    nutritionInfo: rawRecipe.nutritionInfo || {},
    missingIngredients: missingIngredients,
    chefTips: rawRecipe.chefTips || [
      'Taste and adjust seasonings as needed',
      'Prep all ingredients before starting to cook'
    ],
    tags: rawRecipe.tags || [preferences.mealType, preferences.proteinBase]
  }

  return enhancedRecipe
}
