
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

    const { notes, forceReturn } = await request.json()
    const itemId = params.id

    // Get the item first to validate it exists and is checked out
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { 
        room: true, 
        box: true, 
        position: { include: { rack: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.status !== 'CHECKED_OUT') {
      return NextResponse.json({ 
        error: `Item is not checked out (current status: ${item.status})` 
      }, { status: 400 })
    }

    // Get user permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    // Check permissions - can return if:
    // 1. User who checked it out (comparing by email now)
    // 2. User with canReturnAny permission
    // 3. Admin user
    const permissions = currentUser?.permissions as any
    const canReturn = 
      item.checkedOutBy === (session.user.email || session.user.id) ||
      permissions?.canReturnAny === true ||
      currentUser?.isAdmin === true ||
      forceReturn === true

    if (!canReturn) {
      return NextResponse.json({ 
        error: 'You do not have permission to return this item' 
      }, { status: 403 })
    }

    // Check if original location is still available (for capacity conflicts)
    let canReturnToOriginal = true
    let capacityWarning = null

    if (item.originalLocation) {
      const originalLoc = item.originalLocation as any

      // For loose items, check position capacity
      if (originalLoc.storageType === 'loose' && originalLoc.positionId) {
        const position = await prisma.position.findUnique({
          where: { id: originalLoc.positionId },
          include: {
            boxPositions: true,
            looseItems: { where: { status: 'AVAILABLE' } }
          }
        })

        if (position) {
          const currentOccupancy = position.boxPositions.length + position.looseItems.length
          if (currentOccupancy >= position.capacity) {
            canReturnToOriginal = false
            capacityWarning = 'Original position is now full. Please select a new location.'
          }
        }
      }

      // For boxed items, check if the box still exists and has space
      if (originalLoc.storageType === 'boxed' && originalLoc.boxId) {
        const box = await prisma.box.findUnique({
          where: { id: originalLoc.boxId }
        })

        if (!box || !box.isActive) {
          canReturnToOriginal = false
          capacityWarning = 'Original box is no longer available. Please select a new location.'
        }
      }
    }

    // If we can't return to original location, require manual placement
    if (!canReturnToOriginal && !forceReturn) {
      return NextResponse.json({
        error: 'Cannot return to original location',
        capacityWarning,
        requiresNewLocation: true,
        originalLocation: item.originalLocation
      }, { status: 409 })
    }

    // Update item to available status
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        status: 'AVAILABLE',
        returnedBy: session.user.email || session.user.id, // Store email for consistent audit display
        returnedAt: new Date(),
        modifiedBy: session.user.email || session.user.id // Enhanced audit: Track who returned the item
        // Note: We keep originalLocation for history, don't clear it
      },
      include: {
        room: true,
        box: true,
        position: { include: { rack: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    })

    // Create return log entry
    await prisma.checkoutLog.create({
      data: {
        itemId: itemId,
        userId: session.user.email || session.user.id, // Store email for consistent audit display
        action: 'return',
        returnedAt: new Date(),
        returnedBy: session.user.email || session.user.id, // Store email for consistent audit display
        notes: notes || null
      }
    })

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: canReturnToOriginal 
        ? 'Item returned successfully to original location'
        : 'Item returned successfully',
      capacityWarning
    })

  } catch (error) {
    console.error('Error returning item:', error)
    return NextResponse.json(
      { error: 'Failed to return item' },
      { status: 500 }
    )
  }
}
