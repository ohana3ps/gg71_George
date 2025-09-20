
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { isRead, isSnoozed, snoozeUntil } = await request.json()

    // Verify the alert belongs to the user
    const alert = await prisma.expirationAlert.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Update the alert
    const updatedAlert = await prisma.expirationAlert.update({
      where: { id: params.id },
      data: {
        ...(typeof isRead === 'boolean' && { isRead }),
        ...(typeof isSnoozed === 'boolean' && { isSnoozed }),
        ...(snoozeUntil && { snoozeUntil: new Date(snoozeUntil) }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      alert: updatedAlert
    })

  } catch (error) {
    console.error('Error updating expiration alert:', error)
    return NextResponse.json(
      { error: 'Failed to update expiration alert' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the alert belongs to the user
    const alert = await prisma.expirationAlert.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Delete the alert
    await prisma.expirationAlert.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting expiration alert:', error)
    return NextResponse.json(
      { error: 'Failed to delete expiration alert' },
      { status: 500 }
    )
  }
}
