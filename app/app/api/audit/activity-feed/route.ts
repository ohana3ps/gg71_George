
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ActivityItem {
  id: string
  type: 'created' | 'modified' | 'deleted' | 'checked_out' | 'returned'
  entityType: 'item' | 'room' | 'rack' | 'box'
  entityName: string
  userEmail: string
  timestamp: string
}

// GET /api/audit/activity-feed - Get recent activities across the shared household
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent activities from different entities
    const activities: ActivityItem[] = []

    // Recent items (created)
    const recentItems = await prisma.item.findMany({
      where: {
        isActive: true,
        createdBy: { not: null }
      },
      select: {
        id: true,
        name: true,
        createdBy: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    recentItems.forEach(item => {
      if (item.createdBy) {
        activities.push({
          id: `item-created-${item.id}`,
          type: 'created',
          entityType: 'item',
          entityName: item.name,
          userEmail: item.createdBy,
          timestamp: item.createdAt.toISOString()
        })
      }
    })

    // Recent rooms (created)
    const recentRooms = await prisma.room.findMany({
      where: {
        isActive: true,
        createdBy: { not: null }
      },
      select: {
        id: true,
        name: true,
        createdBy: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    recentRooms.forEach(room => {
      if (room.createdBy) {
        activities.push({
          id: `room-created-${room.id}`,
          type: 'created',
          entityType: 'room',
          entityName: room.name,
          userEmail: room.createdBy,
          timestamp: room.createdAt.toISOString()
        })
      }
    })

    // Recent racks (created)
    const recentRacks = await prisma.rack.findMany({
      where: {
        isActive: true,
        createdBy: { not: null }
      },
      select: {
        id: true,
        name: true,
        createdBy: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    recentRacks.forEach(rack => {
      if (rack.createdBy) {
        activities.push({
          id: `rack-created-${rack.id}`,
          type: 'created',
          entityType: 'rack',
          entityName: rack.name,
          userEmail: rack.createdBy,
          timestamp: rack.createdAt.toISOString()
        })
      }
    })

    // Recent boxes (created)
    const recentBoxes = await prisma.box.findMany({
      where: {
        isActive: true,
        createdBy: { not: null }
      },
      select: {
        id: true,
        name: true,
        boxNumber: true,
        createdBy: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    recentBoxes.forEach(box => {
      if (box.createdBy) {
        activities.push({
          id: `box-created-${box.id}`,
          type: 'created',
          entityType: 'box',
          entityName: box.name || `Box #${box.boxNumber}`,
          userEmail: box.createdBy,
          timestamp: box.createdAt.toISOString()
        })
      }
    })

    // Recent checkout activities
    const recentCheckouts = await prisma.checkoutLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        item: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    recentCheckouts.forEach(checkout => {
      activities.push({
        id: `checkout-${checkout.id}`,
        type: checkout.action === 'checkout' ? 'checked_out' : 'returned',
        entityType: 'item',
        entityName: checkout.item.name,
        userEmail: checkout.userId, // This is actually an email in the checkout log
        timestamp: checkout.createdAt.toISOString()
      })
    })

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Take only the most recent 20 activities
    const recentActivities = activities.slice(0, 20)

    return NextResponse.json({
      activities: recentActivities,
      count: recentActivities.length
    })

  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch activity feed',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}
