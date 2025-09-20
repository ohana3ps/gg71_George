
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rackId = params.id

    // Get all positions for this rack with occupancy info
    const positions = await prisma.position.findMany({
      where: { 
        rackId: rackId,
        rack: {
          userId: session.user.id // Ensure user owns the rack
        }
      },
      include: {
        rack: true,
        boxPositions: {
          include: {
            box: true
          }
        },
        looseItems: {
          where: {
            status: 'AVAILABLE' // Only count available items for occupancy
          }
        }
      },
      orderBy: [
        { shelfNumber: 'asc' },
        { positionNumber: 'asc' }
      ]
    })

    // Transform positions to include occupancy information
    const positionsWithOccupancy = positions.map((position: any) => ({
      id: position.id,
      rackId: position.rackId,
      shelfNumber: position.shelfNumber,
      positionNumber: position.positionNumber,
      capacity: position.capacity,
      boxPositions: position.boxPositions,
      looseItems: position.looseItems,
      occupancy: {
        boxes: position.boxPositions.length,
        looseItems: position.looseItems.length,
        total: position.boxPositions.length + position.looseItems.length,
        available: position.capacity - (position.boxPositions.length + position.looseItems.length)
      }
    }))

    return NextResponse.json(positionsWithOccupancy)

  } catch (error) {
    console.error('Error fetching positions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    )
  }
}
