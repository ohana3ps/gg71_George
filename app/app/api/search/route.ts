

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/search - Advanced search across items with multiple filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category')
    const roomId = searchParams.get('roomId')
    const condition = searchParams.get('condition')
    const minValue = searchParams.get('minValue')
    const maxValue = searchParams.get('maxValue')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause for advanced filtering (shared household data)
    const where: any = {
      isActive: true, // Shared data access - no userId filter
    }

    // Text search across multiple fields
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { serialNumber: { contains: query, mode: 'insensitive' } },
        { room: { name: { contains: query, mode: 'insensitive' } } }
      ]
    }

    // Category filter
    if (category && category !== 'all') {
      where.category = { contains: category, mode: 'insensitive' }
    }

    // Room filter
    if (roomId && roomId !== 'all') {
      where.roomId = roomId
    }

    // Condition filter
    if (condition && condition !== 'all') {
      where.condition = { contains: condition, mode: 'insensitive' }
    }

    // Value range filter
    if (minValue || maxValue) {
      where.value = {}
      if (minValue) where.value.gte = parseFloat(minValue)
      if (maxValue) where.value.lte = parseFloat(maxValue)
    }

    // Build orderBy clause
    let orderBy: any = {}
    switch (sortBy) {
      case 'name':
        orderBy = { name: sortOrder }
        break
      case 'value':
        orderBy = { value: sortOrder }
        break
      case 'quantity':
        orderBy = { quantity: sortOrder }
        break
      case 'updatedAt':
        orderBy = { updatedAt: sortOrder }
        break
      default:
        orderBy = { createdAt: sortOrder }
    }

    // Execute search with pagination
    const [items, totalCount] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          room: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        },
        orderBy,
        take: limit,
        skip: offset
      }),
      prisma.item.count({ where })
    ])

    return NextResponse.json({
      items,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      filters: {
        query,
        category,
        roomId,
        condition,
        minValue,
        maxValue,
        sortBy,
        sortOrder
      }
    })
  } catch (error) {
    console.error('Error performing search:', error)
    return NextResponse.json({ error: 'Failed to perform search' }, { status: 500 })
  }
}

