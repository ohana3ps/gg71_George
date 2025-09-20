
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active alerts (shared household data)
    const alerts = await prisma.expirationAlert.findMany({
      where: {
        isSnoozed: false,
      },
      include: {
        item: {
          include: {
            room: {
              select: {
                id: true,
                name: true,
                color: true
              }
            },
            box: {
              select: {
                id: true,
                boxNumber: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { daysUntilExpiry: 'asc' }, // Most urgent first
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      alerts: alerts.map(alert => ({
        id: alert.id,
        alertType: alert.alertType,
        daysUntilExpiry: alert.daysUntilExpiry,
        isRead: alert.isRead,
        isSnoozed: alert.isSnoozed,
        createdAt: alert.createdAt,
        item: {
          id: alert.item.id,
          name: alert.item.name,
          category: alert.item.category,
          quantity: alert.item.quantity,
          foodUnit: alert.item.foodUnit,
          expirationDate: alert.item.expirationDate,
          photoUrl: alert.item.photoUrl,
          room: alert.item.room,
          box: alert.item.box
        }
      }))
    })

  } catch (error) {
    console.error('Error fetching expiration alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expiration alerts' },
      { status: 500 }
    )
  }
}
