

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/analytics - Get inventory analytics and insights
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    const baseWhere = {
      isActive: true, // Shared data access - no userId filter
      ...(roomId && roomId !== 'all' && { roomId })
    }

    // Basic counts and totals
    const [
      totalItems,
      totalRooms,
      totalValue,
      itemsWithPhotos,
      categoryCounts,
      conditionCounts,
      roomStats,
      recentActivity,
      valueByCategory,
      topValueItems
    ] = await Promise.all([
      // Total items count
      prisma.item.count({ where: baseWhere }),

      // Total rooms count
      prisma.room.count({ 
        where: { 
          isActive: true, // Shared data access - no userId filter
          ...(roomId && roomId !== 'all' && { id: roomId })
        } 
      }),

      // Total value
      prisma.item.aggregate({
        where: { ...baseWhere, value: { not: null } },
        _sum: { value: true }
      }),

      // Items with photos
      prisma.item.count({ 
        where: { 
          ...baseWhere, 
          photoUrl: { not: null } 
        } 
      }),

      // Category breakdown
      prisma.item.groupBy({
        by: ['category'],
        where: { ...baseWhere, category: { not: null } },
        _count: true,
        _sum: { value: true, quantity: true },
        orderBy: { _count: { category: 'desc' } }
      }),

      // Condition breakdown
      prisma.item.groupBy({
        by: ['condition'],
        where: { ...baseWhere, condition: { not: null } },
        _count: true,
        orderBy: { _count: { condition: 'desc' } }
      }),

      // Room statistics
      prisma.room.findMany({
        where: { 
          isActive: true, // Shared data access - no userId filter
          ...(roomId && roomId !== 'all' && { id: roomId })
        },
        include: {
          _count: {
            select: {
              items: {
                where: { isActive: true }
              }
            }
          },
          items: {
            where: { isActive: true, value: { not: null } },
            select: { value: true }
          }
        },
        orderBy: { name: 'asc' }
      }),

      // Recent activity (last 30 days)
      prisma.item.findMany({
        where: {
          ...baseWhere,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          room: { select: { name: true, color: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Value by category (for charts)
      prisma.item.groupBy({
        by: ['category'],
        where: { ...baseWhere, category: { not: null }, value: { not: null } },
        _sum: { value: true },
        orderBy: { _sum: { value: 'desc' } },
        take: 10
      }),

      // Top value items
      prisma.item.findMany({
        where: { ...baseWhere, value: { not: null } },
        include: {
          room: { select: { name: true, color: true } }
        },
        orderBy: { value: 'desc' },
        take: 5
      })
    ])

    // Calculate room statistics
    const roomStatistics = roomStats.map(room => ({
      id: room.id,
      name: room.name,
      color: room.color,
      itemCount: room._count.items,
      totalValue: room.items.reduce((sum, item) => sum + (item.value || 0), 0)
    }))

    // Calculate averages
    const avgItemValue = totalValue._sum.value && totalItems > 0 
      ? totalValue._sum.value / totalItems 
      : 0

    const photoPercentage = totalItems > 0 
      ? Math.round((itemsWithPhotos / totalItems) * 100) 
      : 0

    const analytics = {
      overview: {
        totalItems,
        totalRooms,
        totalValue: totalValue._sum.value || 0,
        averageItemValue: avgItemValue,
        itemsWithPhotos,
        photoPercentage
      },
      categories: categoryCounts.map(cat => ({
        name: cat.category,
        count: cat._count,
        totalValue: cat._sum.value || 0,
        totalQuantity: cat._sum.quantity || 0
      })),
      conditions: conditionCounts.map(cond => ({
        name: cond.condition,
        count: cond._count
      })),
      rooms: roomStatistics,
      recentActivity: recentActivity.map(item => ({
        id: item.id,
        name: item.name,
        room: item.room,
        value: item.value,
        createdAt: item.createdAt
      })),
      charts: {
        valueByCategory: valueByCategory.map(cat => ({
          category: cat.category,
          value: cat._sum.value || 0
        })),
        roomDistribution: roomStatistics.map(room => ({
          name: room.name,
          count: room.itemCount,
          value: room.totalValue
        }))
      },
      topItems: topValueItems.map(item => ({
        id: item.id,
        name: item.name,
        value: item.value,
        room: item.room,
        photoUrl: item.photoUrl
      }))
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error generating analytics:', error)
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 })
  }
}

