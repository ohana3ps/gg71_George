
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: { id: string }
}

// GET /api/recipes/[id] - Get a specific recipe
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipe = await prisma.recipe.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      recipe,
    })

  } catch (error) {
    console.error('❌ Error fetching recipe:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

// PATCH /api/recipes/[id] - Update a recipe (favorite, notes, rating, etc.)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Verify recipe belongs to user
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const updateData: any = {}

    // Only update provided fields
    if (body.isFavorite !== undefined) updateData.isFavorite = body.isFavorite
    if (body.rating !== undefined) updateData.rating = body.rating
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.lastCooked !== undefined) updateData.lastCooked = new Date(body.lastCooked)
    if (body.timesCooked !== undefined) updateData.timesCooked = body.timesCooked

    console.log('🔄 Updating recipe:', params.id, updateData)

    const updatedRecipe = await prisma.recipe.update({
      where: { id: params.id },
      data: updateData,
    })

    console.log('✅ Recipe updated successfully:', updatedRecipe.id)

    return NextResponse.json({
      success: true,
      recipe: updatedRecipe,
      message: 'Recipe updated successfully!'
    })

  } catch (error) {
    console.error('❌ Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}

// DELETE /api/recipes/[id] - Delete a recipe
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify recipe belongs to user before deleting
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    console.log('🗑️ Deleting recipe:', params.id, existingRecipe.title)

    await prisma.recipe.delete({
      where: { id: params.id },
    })

    console.log('✅ Recipe deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Recipe deleted successfully!'
    })

  } catch (error) {
    console.error('❌ Error deleting recipe:', error)
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}
