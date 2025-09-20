
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

interface Params {
  id: string
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Get room with all related data
    const room = await prisma.room.findUnique({
      where: { 
        id: params.id,
        isActive: true 
      },
      include: {
        items: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            status: true,
            value: true
          }
        },
        boxes: {
          where: { isActive: true },
          select: {
            id: true,
            boxNumber: true,
            name: true
          }
        },
        racks: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            rackNumber: true
          }
        },
        _count: {
          select: {
            items: { where: { isActive: true } },
            boxes: { where: { isActive: true } },
            racks: { where: { isActive: true } }
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // In shared household model, all users can analyze any room

    // Analyze room safety for deletion
    const counts = {
      items: room._count.items,
      boxes: room._count.boxes,
      racks: room._count.racks,
      total: room._count.items + room._count.boxes + room._count.racks
    }

    const canDelete = counts.total === 0
    
    // Debug logging
    console.log(`🔍 Safety Analysis for Room "${room.name}" (${room.id}):`, {
      items: counts.items,
      boxes: counts.boxes, 
      racks: counts.racks,
      total: counts.total,
      canDelete: canDelete
    })
    const blockers: string[] = []
    const warnings: string[] = []

    if (counts.items > 0) {
      blockers.push(`${counts.items} active item${counts.items === 1 ? '' : 's'}`)
    }

    if (counts.boxes > 0) {
      blockers.push(`${counts.boxes} box${counts.boxes === 1 ? '' : 'es'}`)
    }

    if (counts.racks > 0) {
      blockers.push(`${counts.racks} rack system${counts.racks === 1 ? '' : 's'}`)
    }

    // Additional warnings
    if (room.items && room.items.some(item => item.value && item.value > 100)) {
      warnings.push('Room contains high-value items')
    }

    if (room.items && room.items.some(item => item.status === 'CHECKED_OUT')) {
      warnings.push('Room contains items that are currently checked out')
    }

    const safetyAnalysis = {
      canDelete,
      blockers,
      warnings,
      counts,
      dependencies: {
        items: (room.items || []).map(item => ({
          id: item.id,
          name: item.name,
          status: item.status,
          value: item.value
        })),
        boxes: (room.boxes || []).map(box => ({
          id: box.id,
          boxNumber: box.boxNumber,
          name: box.name
        })),
        racks: (room.racks || []).map(rack => ({
          id: rack.id,
          name: rack.name,
          rackNumber: rack.rackNumber
        }))
      }
    }

    return NextResponse.json({ 
      room: {
        id: room.id,
        name: room.name,
        userId: room.userId
      },
      safetyAnalysis
    })
  } catch (error) {
    console.error('Error performing safety analysis:', error)
    return NextResponse.json({ error: 'Failed to perform safety analysis' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
