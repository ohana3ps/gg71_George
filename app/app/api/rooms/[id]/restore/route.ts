

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// POST - Restore a soft-deleted room
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the deleted room
    const deletedRoom = await prisma.room.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        isActive: false
      }
    })

    if (!deletedRoom) {
      return NextResponse.json({ error: 'Deleted room not found' }, { status: 404 })
    }

    // Check if room is still within recovery window (30 days)
    const recoveryWindowDays = 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - recoveryWindowDays)

    if (deletedRoom.updatedAt < cutoffDate) {
      return NextResponse.json({
        error: 'Room recovery window has expired',
        deletedAt: deletedRoom.updatedAt,
        recoveryWindow: `${recoveryWindowDays} days`,
        message: 'This room was deleted more than 30 days ago and cannot be recovered'
      }, { status: 400 })
    }

    // Check for name conflicts (another active room with the same name)
    const conflictingRoom = await prisma.room.findFirst({
      where: {
        userId: session.user.id,
        name: deletedRoom.name,
        isActive: true
      }
    })

    let finalName = deletedRoom.name
    if (conflictingRoom) {
      // Generate a unique name
      const timestamp = new Date().toLocaleDateString()
      finalName = `${deletedRoom.name} (Restored ${timestamp})`
      
      // Check if this name is also taken (unlikely but possible)
      const finalConflict = await prisma.room.findFirst({
        where: {
          userId: session.user.id,
          name: finalName,
          isActive: true
        }
      })
      
      if (finalConflict) {
        finalName = `${deletedRoom.name} (Restored ${Date.now()})`
      }
    }

    // Clean up description by removing deletion metadata
    const cleanDescription = deletedRoom.description?.replace(/\s*\[(?:BULK_)?DELETED:.*?\].*$/, '').trim() || null

    // Restore the room
    const restoredRoom = await prisma.room.update({
      where: {
        id: params.id
      },
      data: {
        isActive: true,
        name: finalName,
        description: cleanDescription,
        updatedAt: new Date()
      }
    })

    // Log restoration for audit trail
    console.log('Room restoration:', {
      roomId: params.id,
      originalName: deletedRoom.name,
      restoredName: finalName,
      userId: session.user.id,
      userEmail: session.user.email,
      originalDeletionDate: deletedRoom.updatedAt,
      restorationDate: new Date().toISOString()
    })

    return NextResponse.json({
      message: 'Room restored successfully',
      restoredRoom: {
        id: restoredRoom.id,
        name: restoredRoom.name,
        description: restoredRoom.description,
        color: restoredRoom.color,
        restoredAt: restoredRoom.updatedAt
      },
      nameChanged: finalName !== deletedRoom.name,
      originalName: deletedRoom.name
    })

  } catch (error) {
    console.error('Error restoring room:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

