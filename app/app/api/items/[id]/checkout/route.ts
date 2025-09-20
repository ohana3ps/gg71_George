
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notes } = await request.json()
    const itemId = params.id

    // Get the item first to validate it exists and is available
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { room: true, box: true, position: true }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.status !== 'AVAILABLE') {
      return NextResponse.json({ 
        error: `Item is currently ${item.status.toLowerCase()}` 
      }, { status: 400 })
    }

    // Store original location for return
    const originalLocation = {
      roomId: item.roomId,
      boxId: item.boxId,
      positionId: item.positionId,
      storageType: item.storageType
    }

    // Update item to checked out status
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        status: 'CHECKED_OUT',
        checkedOutBy: session.user.email || session.user.id, // Store email for consistent audit display
        checkedOutAt: new Date(),
        originalLocation: originalLocation,
        returnedBy: null,
        returnedAt: null,
        modifiedBy: session.user.email || session.user.id // Enhanced audit: Track who checked out
      },
      include: {
        room: true,
        box: true,
        position: { include: { rack: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    })

    // Create checkout log entry
    await prisma.checkoutLog.create({
      data: {
        itemId: itemId,
        userId: session.user.email || session.user.id, // Store email for consistent audit display
        action: 'checkout',
        checkedOutAt: new Date(),
        notes: notes || null
      }
    })

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: 'Item checked out successfully'
    })

  } catch (error) {
    console.error('Error checking out item:', error)
    return NextResponse.json(
      { error: 'Failed to check out item' },
      { status: 500 }
    )
  }
}
