

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/food-inventory - Get all food items for the authenticated user across all rooms
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all food items (shared household - everyone sees all food items)
    const foodItems = await prisma.item.findMany({
      where: {
        isActive: true,
        isFood: true // Only get food items
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        box: {
          select: {
            id: true,
            boxNumber: true,
            name: true,
            size: true,
            isStaging: true,
            positions: {
              include: {
                position: {
                  include: {
                    rack: {
                      select: {
                        id: true,
                        name: true,
                        rackNumber: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        {
          expirationDate: 'asc' // Show items expiring soon first
        },
        {
          createdAt: 'desc'
        }
      ]
    })

    // Group items by category for easier consumption by recipe generator
    const groupedByCategory = foodItems.reduce((acc, item) => {
      const category = item.foodCategory || 'Other Food Items'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    }, {} as Record<string, typeof foodItems>)

    // Group items by room for location-based recipe generation
    const groupedByRoom = foodItems.reduce((acc, item) => {
      const roomName = item.room.name
      if (!acc[roomName]) {
        acc[roomName] = []
      }
      acc[roomName].push(item)
      return acc
    }, {} as Record<string, typeof foodItems>)

    // Calculate expiration status
    const now = new Date()
    const itemsWithExpirationStatus = foodItems.map(item => {
      let expirationStatus = 'no_expiration'
      let daysUntilExpiration = null

      if (item.expirationDate) {
        const expirationDate = new Date(item.expirationDate)
        const timeDiff = expirationDate.getTime() - now.getTime()
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

        daysUntilExpiration = daysDiff

        if (daysDiff < 0) {
          expirationStatus = 'expired'
        } else if (daysDiff <= 3) {
          expirationStatus = 'expiring_soon'
        } else if (daysDiff <= 7) {
          expirationStatus = 'expiring_this_week'
        } else {
          expirationStatus = 'fresh'
        }
      }

      return {
        ...item,
        expirationStatus,
        daysUntilExpiration
      }
    })

    // Summary statistics - Complete stats matching Expiration Dashboard
    const stats = {
      totalItems: foodItems.length,
      uniqueCategories: Object.keys(groupedByCategory).length,
      roomsWithFood: Object.keys(groupedByRoom).length,
      expired: itemsWithExpirationStatus.filter(item => item.expirationStatus === 'expired').length,
      expiringSoon: itemsWithExpirationStatus.filter(item => item.expirationStatus === 'expiring_soon').length,
      expiringThisWeek: itemsWithExpirationStatus.filter(item => item.expirationStatus === 'expiring_this_week').length,
      fresh: itemsWithExpirationStatus.filter(item => item.expirationStatus === 'fresh').length
    }

    return NextResponse.json({
      items: itemsWithExpirationStatus,
      groupedByCategory,
      groupedByRoom,
      stats
    })
  } catch (error) {
    console.error('Error fetching food inventory:', error)
    return NextResponse.json({ error: 'Failed to fetch food inventory' }, { status: 500 })
  }
}
