
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all boxes for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const staging = searchParams.get('staging')
    const includeItems = searchParams.get('includeItems') === 'true'
    const includePosition = searchParams.get('includePosition') === 'true'

    const where: any = {
      // Shared household - everyone sees all boxes
      isActive: true
    }

    if (roomId) {
      where.roomId = roomId
    }

    if (staging === 'true') {
      where.isStaging = true
    } else if (staging === 'false') {
      where.isStaging = false
    }

    const include: any = {
      room: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      _count: {
        select: {
          items: true
        }
      }
    }

    if (includeItems) {
      include.items = {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      }
    }

    if (includePosition) {
      include.positions = {
        include: {
          position: {
            include: {
              rack: true
            }
          }
        }
      }
    }

    const boxes = await prisma.box.findMany({
      where,
      include,
      orderBy: [
        { roomId: 'asc' },
        { boxNumber: 'asc' }
      ]
    })

    return NextResponse.json(boxes)
  } catch (error) {
    console.error('Error fetching boxes:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Create a new box
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { boxNumber, name, description, size = 'S', type = 'standard', roomId } = body

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 })
    }

    // Verify room exists (shared household)
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        isActive: true
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Validate and determine box number
    let finalBoxNumber = boxNumber
    
    if (!boxNumber) {
      // If no box number provided, auto-generate
      const maxBoxNumber = await prisma.box.aggregate({
        where: {
          roomId,
          isActive: true
        },
        _max: {
          boxNumber: true
        }
      })
      finalBoxNumber = (maxBoxNumber._max.boxNumber || 0) + 1
    } else {
      // Validate that the provided box number is not already in use
      const existingBox = await prisma.box.findFirst({
        where: {
          roomId,
          boxNumber,
          isActive: true
        }
      })
      
      if (existingBox) {
        return NextResponse.json({ 
          error: `Box ${boxNumber} already exists in this room` 
        }, { status: 400 })
      }
    }

    // Create box
    const box = await prisma.box.create({
      data: {
        boxNumber: finalBoxNumber,
        name: name?.trim() || null,
        description: description?.trim() || null,
        size,
        type,
        roomId,
        userId: session.user.id,
        createdBy: session.user.email, // Enhanced audit: Track who created this box
        isStaging: true // New boxes start in staging
      },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    })

    return NextResponse.json(box)
  } catch (error) {
    console.error('Error creating box:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
