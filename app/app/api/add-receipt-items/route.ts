
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { receiptId, items, roomId } = await request.json()

    if (!receiptId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Get or create a kitchen room for food items (shared household)
    let targetRoom
    if (roomId) {
      targetRoom = await prisma.room.findFirst({
        where: {
          id: roomId,
          isActive: true
        }
      })
    }

    if (!targetRoom) {
      // Try to find a kitchen room (shared household)
      targetRoom = await prisma.room.findFirst({
        where: {
          isActive: true,
          name: {
            contains: 'kitchen',
            mode: 'insensitive'
          }
        }
      })

      // If no kitchen room exists, create one
      if (!targetRoom) {
        targetRoom = await prisma.room.create({
          data: {
            name: 'Kitchen',
            description: 'Kitchen pantry and food items',
            color: '#10B981', // Green color for kitchen
            userId: session.user.id,
            createdBy: session.user.email || session.user.id, // Enhanced audit
            modifiedBy: session.user.email || session.user.id // Enhanced audit
          }
        })
      }
    }

    const createdItems = []
    
    for (const item of items) {
      try {
        // Calculate expiration date based on estimated shelf life
        const expirationDate = new Date()
        expirationDate.setDate(expirationDate.getDate() + (item.estimatedShelfLife || 7))

        // Create the item
        const createdItem = await prisma.item.create({
          data: {
            name: item.name,
            description: `Added from receipt scan${item.price ? ` - $${item.price.toFixed(2)}` : ''}`,
            category: item.category || 'Food',
            quantity: Math.max(1, Math.floor(item.quantity || 1)),
            value: item.price || null,
            condition: 'New',
            location: 'Kitchen',
            notes: `Scanned from receipt. Estimated shelf life: ${item.estimatedShelfLife || 7} days`,
            roomId: targetRoom.id,
            userId: session.user.id,
            isFood: true,
            foodCategory: item.category || 'pantry',
            expirationDate: expirationDate,
            foodUnit: item.unit || 'items',
            purchaseDate: new Date()
          }
        })

        // Link the receipt item to the created item
        await prisma.receiptItem.update({
          where: { id: item.id },
          data: {
            itemId: createdItem.id,
            isProcessed: true
          }
        })

        // Create expiration alert if item expires soon
        const daysUntilExpiry = Math.floor((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilExpiry <= 7) {
          await prisma.expirationAlert.upsert({
            where: {
              userId_itemId_alertType: {
                userId: session.user.id,
                itemId: createdItem.id,
                alertType: daysUntilExpiry <= 3 ? 'expiring_soon' : 'expiring_this_week'
              }
            },
            create: {
              userId: session.user.id,
              itemId: createdItem.id,
              alertType: daysUntilExpiry <= 3 ? 'expiring_soon' : 'expiring_this_week',
              daysUntilExpiry: daysUntilExpiry
            },
            update: {
              daysUntilExpiry: daysUntilExpiry,
              isRead: false
            }
          })
        }

        createdItems.push({
          id: createdItem.id,
          name: createdItem.name,
          category: createdItem.category,
          expirationDate: createdItem.expirationDate,
          room: targetRoom.name
        })

      } catch (itemError) {
        console.error(`Error creating item ${item.name}:`, itemError)
        // Continue with other items even if one fails
      }
    }

    // Update receipt processing status
    await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        processingStatus: 'completed'
      }
    })

    return NextResponse.json({
      success: true,
      itemsAdded: createdItems.length,
      items: createdItems,
      room: {
        id: targetRoom.id,
        name: targetRoom.name
      }
    })

  } catch (error) {
    console.error('Error adding receipt items:', error)
    return NextResponse.json(
      { error: 'Failed to add items to inventory' },
      { status: 500 }
    )
  }
}
