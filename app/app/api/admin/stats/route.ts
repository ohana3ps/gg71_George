
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // In shared household model, admins can view stats
    // For now, allow all authenticated users to view basic stats
    // Get counts in parallel
    const [
      totalUsers,
      adminUsers,
      totalRooms,
      totalItems,
      activeUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          OR: [
            { isAdmin: true },
            { role: { in: ['admin', 'super_admin'] } }
          ]
        }
      }),
      prisma.room.count({
        where: { isActive: true }
      }),
      prisma.item.count({
        where: { isActive: true }
      }),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ])

    const stats = {
      totalUsers,
      adminUsers,
      totalRooms,
      totalItems,
      activeUsers
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
