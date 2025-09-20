

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// POST - Bulk delete multiple rooms with comprehensive safety checks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { roomIds, forceDelete = false, skipSafetyCheck = false } = body

    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json({ error: 'Room IDs array is required' }, { status: 400 })
    }

    if (roomIds.length > 10) {
      return NextResponse.json({ 
        error: 'Bulk operation limited to 10 rooms at once for safety' 
      }, { status: 400 })
    }

    // Fetch all rooms with their dependencies
    const rooms = await prisma.room.findMany({
      where: {
        id: { in: roomIds },
        userId: session.user.id,
        isActive: true
      },
      include: {
        _count: {
          select: {
            items: { where: { isActive: true } },
            boxes: { where: { isActive: true } },
            racks: { where: { isActive: true } }
          }
        },
        items: {
          where: { isActive: true },
          select: { id: true, name: true, category: true, value: true }
        },
        boxes: {
          where: { isActive: true },
          select: { id: true, boxNumber: true, name: true }
        },
        racks: {
          where: { isActive: true },
          select: { id: true, name: true, rackNumber: true }
        }
      }
    })

    if (rooms.length === 0) {
      return NextResponse.json({ error: 'No valid rooms found' }, { status: 404 })
    }

    // Comprehensive bulk safety analysis
    const bulkAnalysis = {
      requestedRooms: roomIds.length,
      foundRooms: rooms.length,
      canDeleteAll: false,
      overallBlockers: [] as string[],
      overallWarnings: [] as string[],
      totals: {
        items: 0,
        boxes: 0,
        racks: 0,
        total: 0,
        totalValue: 0
      },
      roomAnalysis: [] as any[],
      safeToDelete: [] as string[],
      blockedFromDeletion: [] as string[]
    }

    // Analyze each room
    for (const room of rooms) {
      const roomSafety = {
        roomId: room.id,
        roomName: room.name,
        canDelete: false,
        blockers: [] as string[],
        warnings: [] as string[],
        counts: {
          items: room._count.items,
          boxes: room._count.boxes,
          racks: room._count.racks,
          total: room._count.items + room._count.boxes + room._count.racks
        }
      }

      // Room-specific safety checks
      if (roomSafety.counts.items > 0) {
        roomSafety.blockers.push(`${roomSafety.counts.items} active items`)
      }
      
      if (roomSafety.counts.boxes > 0) {
        roomSafety.blockers.push(`${roomSafety.counts.boxes} active boxes`)
      }
      
      if (roomSafety.counts.racks > 0) {
        roomSafety.blockers.push(`${roomSafety.counts.racks} active racks`)
      }

      roomSafety.canDelete = roomSafety.blockers.length === 0

      // Calculate room value
      const roomValue = room.items.reduce((sum, item) => sum + (item.value || 0), 0)
      if (roomValue > 0) {
        roomSafety.warnings.push(`Estimated value: $${roomValue.toFixed(2)}`)
      }

      // Add to totals
      bulkAnalysis.totals.items += roomSafety.counts.items
      bulkAnalysis.totals.boxes += roomSafety.counts.boxes
      bulkAnalysis.totals.racks += roomSafety.counts.racks
      bulkAnalysis.totals.total += roomSafety.counts.total
      bulkAnalysis.totals.totalValue += roomValue

      // Categorize rooms
      if (roomSafety.canDelete) {
        bulkAnalysis.safeToDelete.push(room.id)
      } else {
        bulkAnalysis.blockedFromDeletion.push(room.id)
      }

      bulkAnalysis.roomAnalysis.push(roomSafety)
    }

    // Overall safety determination
    bulkAnalysis.canDeleteAll = bulkAnalysis.blockedFromDeletion.length === 0

    // Generate overall blockers and warnings
    if (bulkAnalysis.totals.items > 0) {
      bulkAnalysis.overallBlockers.push(`${bulkAnalysis.totals.items} active items across rooms`)
    }
    if (bulkAnalysis.totals.boxes > 0) {
      bulkAnalysis.overallBlockers.push(`${bulkAnalysis.totals.boxes} active boxes across rooms`)
    }
    if (bulkAnalysis.totals.racks > 0) {
      bulkAnalysis.overallBlockers.push(`${bulkAnalysis.totals.racks} active racks across rooms`)
    }
    if (bulkAnalysis.totals.totalValue > 100) {
      bulkAnalysis.overallWarnings.push(`Total estimated value: $${bulkAnalysis.totals.totalValue.toFixed(2)}`)
    }

    // If not safe and no override, return safety analysis
    if (!bulkAnalysis.canDeleteAll && !skipSafetyCheck && !forceDelete) {
      return NextResponse.json({
        error: 'Bulk deletion blocked by safety checks',
        canDelete: false,
        bulkAnalysis,
        message: `Cannot delete ${bulkAnalysis.blockedFromDeletion.length} of ${rooms.length} rooms due to safety restrictions`
      }, { status: 400 })
    }

    // Log bulk deletion attempt for audit trail
    console.log('Bulk room deletion attempt:', {
      roomIds,
      userId: session.user.id,
      userEmail: session.user.email,
      bulkAnalysis,
      forceDelete,
      skipSafetyCheck,
      timestamp: new Date().toISOString()
    })

    // Perform deletions
    const deletionResults = []
    const deletionTimestamp = new Date().toISOString()

    // If canDeleteAll or forceDelete, proceed with all
    const roomsToDelete = forceDelete || skipSafetyCheck 
      ? rooms 
      : rooms.filter(room => bulkAnalysis.safeToDelete.includes(room.id))

    for (const room of roomsToDelete) {
      try {
        const deletedRoom = await prisma.room.update({
          where: { id: room.id },
          data: {
            isActive: false,
            updatedAt: new Date(),
            description: `${room.description || ''} [BULK_DELETED: ${deletionTimestamp} by ${session.user.email}]`.trim()
          }
        })

        deletionResults.push({
          roomId: room.id,
          roomName: room.name,
          status: 'deleted',
          deletedAt: deletedRoom.updatedAt
        })

      } catch (error) {
        console.error(`Error deleting room ${room.id}:`, error)
        deletionResults.push({
          roomId: room.id,
          roomName: room.name,
          status: 'error',
          error: 'Failed to delete'
        })
      }
    }

    const successCount = deletionResults.filter(r => r.status === 'deleted').length
    const errorCount = deletionResults.filter(r => r.status === 'error').length

    return NextResponse.json({
      message: `Bulk deletion completed: ${successCount} deleted, ${errorCount} errors`,
      summary: {
        requestedCount: roomIds.length,
        foundCount: rooms.length,
        deletedCount: successCount,
        errorCount: errorCount,
        skippedCount: rooms.length - roomsToDelete.length
      },
      deletionResults,
      bulkAnalysis
    })

  } catch (error) {
    console.error('Error in bulk room deletion:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

