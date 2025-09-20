

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// GET - Get all soft-deleted rooms (for recovery)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const includeExpired = url.searchParams.get('includeExpired') === 'true'
    
    // Calculate 30-day recovery window
    const recoveryWindowDays = 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - recoveryWindowDays)

    const whereClause: any = {
      userId: session.user.id,
      isActive: false
    }

    // Only include recoverable rooms unless explicitly requested
    if (!includeExpired) {
      whereClause.updatedAt = {
        gte: cutoffDate
      }
    }

    const deletedRooms = await prisma.room.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            items: { where: { isActive: true } },
            boxes: { where: { isActive: true } },
            racks: { where: { isActive: true } }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Process rooms to extract deletion metadata and calculate recovery status
    const processedRooms = deletedRooms.map(room => {
      // Try to extract deletion metadata from description
      const deletionMatch = room.description?.match(/\[(?:BULK_)?DELETED: (.*?) by (.*?)\]/)
      const deletionInfo = deletionMatch ? {
        deletedAt: deletionMatch[1],
        deletedBy: deletionMatch[2]
      } : {
        deletedAt: room.updatedAt.toISOString(),
        deletedBy: 'Unknown'
      }

      const daysSinceDeletion = Math.floor(
        (Date.now() - new Date(deletionInfo.deletedAt).getTime()) / (1000 * 60 * 60 * 24)
      )

      const isRecoverable = daysSinceDeletion <= recoveryWindowDays
      const daysRemaining = Math.max(0, recoveryWindowDays - daysSinceDeletion)

      return {
        id: room.id,
        name: room.name,
        description: room.description?.replace(/\s*\[(?:BULK_)?DELETED:.*?\].*$/, '').trim() || null,
        color: room.color,
        createdAt: room.createdAt,
        deletionInfo,
        recoveryStatus: {
          isRecoverable,
          daysSinceDeletion,
          daysRemaining,
          expiresAt: new Date(new Date(deletionInfo.deletedAt).getTime() + (recoveryWindowDays * 24 * 60 * 60 * 1000))
        },
        counts: room._count,
        hasContent: (room._count.items + room._count.boxes + room._count.racks) > 0
      }
    })

    const summary = {
      totalDeleted: processedRooms.length,
      recoverable: processedRooms.filter(r => r.recoveryStatus.isRecoverable).length,
      expired: processedRooms.filter(r => !r.recoveryStatus.isRecoverable).length,
      withContent: processedRooms.filter(r => r.hasContent).length
    }

    return NextResponse.json({
      success: true,
      summary,
      deletedRooms: processedRooms,
      recoveryWindow: {
        days: recoveryWindowDays,
        message: `Rooms can be recovered for ${recoveryWindowDays} days after deletion`
      }
    })

  } catch (error) {
    console.error('Error fetching deleted rooms:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

