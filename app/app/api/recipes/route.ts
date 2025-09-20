
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface SaveRecipeRequest {
  title: string
  description?: string
  prepTime?: string
  cookTime?: string
  totalTime?: string
  servings: number
  difficulty?: string
  ingredients: any[]
  instructions: any[]
  nutritionInfo?: any
  missingIngredients?: string[]
  chefTips?: string[]
  tags?: string[]
  mealType?: string
  proteinBase?: string
  complexity?: string
  timeConstraint?: string
  dietaryRestrictions?: string[]
}

// POST /api/recipes - Save a new recipe
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SaveRecipeRequest = await request.json()
    
    // Validate required fields
    if (!body.title || !body.ingredients || !body.instructions) {
      return NextResponse.json(
        { error: 'Missing required fields: title, ingredients, instructions' },
        { status: 400 }
      )
    }

    console.log('🍳 Saving recipe:', {
      title: body.title,
      userId: session.user.id,
      ingredientsCount: body.ingredients.length,
      instructionsCount: body.instructions.length
    })

    // Save recipe to database
    const savedRecipe = await prisma.recipe.create({
      data: {
        userId: session.user.id,
        title: body.title,
        description: body.description,
        prepTime: body.prepTime,
        cookTime: body.cookTime,
        totalTime: body.totalTime,
        servings: body.servings,
        difficulty: body.difficulty,
        ingredients: body.ingredients,
        instructions: body.instructions,
        nutritionInfo: body.nutritionInfo,
        missingIngredients: body.missingIngredients || [],
        chefTips: body.chefTips || [],
        tags: body.tags || [],
        mealType: body.mealType,
        proteinBase: body.proteinBase,
        complexity: body.complexity,
        timeConstraint: body.timeConstraint,
        dietaryRestrictions: body.dietaryRestrictions || [],
      },
    })

    console.log('✅ Recipe saved successfully:', savedRecipe.id)

    return NextResponse.json({
      success: true,
      recipe: savedRecipe,
      message: 'Recipe saved successfully!'
    })

  } catch (error) {
    console.error('❌ Error saving recipe:', error)
    return NextResponse.json(
      { error: 'Failed to save recipe' },
      { status: 500 }
    )
  }
}

// GET /api/recipes - Get all saved recipes for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const search = searchParams.get('search') || ''
    const mealType = searchParams.get('mealType') || ''
    const isFavorite = searchParams.get('isFavorite') === 'true'

    const skip = (page - 1) * limit

    // Build where clause (shared household data)
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (mealType) {
      where.mealType = mealType
    }

    if (isFavorite) {
      where.isFavorite = true
    }

    console.log('🔍 Fetching recipes for user:', session.user.id, { where, page, limit })

    // Get recipes with pagination
    const [recipes, totalCount] = await Promise.all([
      prisma.recipe.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.recipe.count({ where }),
    ])

    // Get recipe statistics (shared household data)
    const stats = {
      totalRecipes: totalCount,
      favoriteCount: await prisma.recipe.count({
        where: { isFavorite: true }
      }),
      mealTypeBreakdown: await prisma.recipe.groupBy({
        by: ['mealType'],
        _count: { _all: true },
      }),
      recentlyCooked: await prisma.recipe.count({
        where: {
          lastCooked: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          }
        }
      }),
    }

    console.log('✅ Recipes fetched:', {
      count: recipes.length,
      totalCount,
      stats
    })

    return NextResponse.json({
      success: true,
      recipes,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      stats,
    })

  } catch (error) {
    console.error('❌ Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}
