
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const roomId = searchParams.get('roomId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Base query to fetch items with room information (shared household data)
    let whereClause: any = {
      isActive: true // Shared data access - no userId filter
    }

    // Add search query filter if provided
    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } }
      ]
    }

    // Add category filter if provided
    if (category && category !== 'all') {
      whereClause.category = category
    }

    // Add room filter if provided
    if (roomId && roomId !== 'all') {
      whereClause.roomId = roomId
    }

    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: [
        { updatedAt: 'desc' },
        { name: 'asc' }
      ],
      take: limit
    })

    return NextResponse.json(items)

  } catch (error) {
    console.error('Error searching items:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
