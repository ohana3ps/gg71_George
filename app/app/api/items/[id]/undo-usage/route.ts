
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 === UNDO USAGE API CALLED ===')
  console.log('📥 Request params:', params)
  
  try {
    console.log('🔐 Getting session...')
    const session = await getServerSession(authOptions)
    
    console.log('👤 Session details:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id
    })
    
    if (!session || !session.user?.email || !session.user?.id) {
      console.log('❌ Authentication failed - no session, email, or user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { usageQuantity, usageType, originalUsedAt } = await request.json()

    console.log('↩️ Undoing item usage:', {
      itemId: params.id,
      usageQuantity,
      usageType,
      originalUsedAt
    })

    // Find the most recent usage record for this item
    console.log('🔍 Searching for usage record...')
    const usageRecord = await prisma.itemUsage.findFirst({
      where: {
        itemId: params.id,
        userId: session.user.id,
        usedAt: new Date(originalUsedAt)
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('📋 Usage record found:', !!usageRecord)

    if (!usageRecord) {
      return NextResponse.json({ error: 'Usage record not found' }, { status: 404 })
    }

    let restoredItem

    if (usageType === 'remove') {
      // Restore the completely removed item
      const originalData = JSON.parse(usageRecord.originalItemData || '{}')
      
      restoredItem = await prisma.item.create({
        data: {
          id: params.id, // Use the same ID
          name: originalData.name,
          description: originalData.description,
          category: originalData.category,
          quantity: originalData.quantity || 1,
          value: originalData.value,
          condition: originalData.condition,
          location: originalData.location,
          notes: originalData.notes,
          photoUrl: originalData.photoUrl,
          serialNumber: originalData.serialNumber,
          purchaseDate: originalData.purchaseDate ? new Date(originalData.purchaseDate) : null,
          status: originalData.status || 'AVAILABLE',
          isActive: originalData.isActive !== undefined ? originalData.isActive : true,
          storageType: originalData.storageType || 'boxed',
          positionId: originalData.positionId,
          isFood: originalData.isFood || false,
          foodCategory: originalData.foodCategory,
          expirationDate: originalData.expirationDate ? new Date(originalData.expirationDate) : null,
          foodUnit: originalData.foodUnit,
          room: {
            connect: {
              id: originalData.roomId
            }
          },
          box: originalData.boxId ? {
            connect: {
              id: originalData.boxId
            }
          } : undefined,
          user: {
            connect: {
              id: session.user.id
            }
          }
        }
      })

      console.log('🔄 Item completely restored')
    } else {
      // Restore quantity (add back the used amount)
      const currentItem = await prisma.item.findFirst({
        where: {
          id: params.id,
          userId: session.user.id
        }
      })

      if (!currentItem) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      const restoredQuantity = (currentItem.quantity || 0) + usageQuantity

      restoredItem = await prisma.item.update({
        where: {
          id: params.id
        },
        data: {
          quantity: restoredQuantity
        }
      })

      console.log('📈 Quantity restored to:', restoredQuantity)
    }

    // Remove the usage record
    await prisma.itemUsage.delete({
      where: {
        id: usageRecord.id
      }
    })

    console.log('✅ Usage undone successfully')

    return NextResponse.json({
      success: true,
      item: restoredItem,
      restored: {
        type: usageType,
        quantity: usageQuantity,
        undoneAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error undoing item usage:', error)
    return NextResponse.json(
      { error: 'Failed to undo item usage' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
