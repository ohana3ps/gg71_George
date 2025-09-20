
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 === MARK AS USED API CALLED ===')
  console.log('📥 Request params:', params)
  
  try {
    // Get session with detailed logging
    console.log('🔐 Getting session...')
    const session = await getServerSession(authOptions)
    
    console.log('👤 Session details:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      sessionExpires: session?.expires
    })
    
    if (!session || !session.user?.email || !session.user?.id) {
      console.log('❌ Authentication failed - no session, email, or user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body with error handling
    console.log('📄 Parsing request body...')
    let requestBody
    try {
      requestBody = await request.json()
    } catch (parseError) {
      console.log('❌ JSON parse error:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { usageQuantity, usageType, usedAt } = requestBody

    console.log('📦 Marking item as used:', {
      itemId: params.id,
      usageQuantity,
      usageType,
      usedAt,
      userEmail: session.user.email
    })

    // Validate required fields
    if (!usageType || (usageType === 'reduce' && !usageQuantity)) {
      console.log('❌ Validation failed - missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the current item with detailed logging
    console.log('🔍 Searching for item in database...')
    console.log('🎯 Search criteria:', {
      itemId: params.id,
      userId: session.user.id,
      userEmail: session.user.email
    })
    
    let currentItem
    try {
      currentItem = await prisma.item.findFirst({
        where: {
          id: params.id,
          userId: session.user.id
        }
      })
    } catch (dbError) {
      console.log('❌ Database error when finding item:', dbError)
      return NextResponse.json({ 
        error: 'Database error while finding item',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 })
    }

    console.log('📋 Database query result:', {
      found: !!currentItem,
      itemId: currentItem?.id,
      itemName: currentItem?.name
    })

    if (!currentItem) {
      console.log('❌ Item not found in database')
      return NextResponse.json({ 
        error: 'Item not found',
        itemId: params.id,
        userId: session.user.id,
        userEmail: session.user.email 
      }, { status: 404 })
    }

    console.log('📋 Current item details:', {
      id: currentItem.id,
      name: currentItem.name,
      currentQuantity: currentItem.quantity,
      unit: currentItem.foodUnit,
      userId: currentItem.userId,
      isFood: currentItem.isFood,
      roomId: currentItem.roomId
    })

    let updatedItem
    let usageRecord

    console.log('🔄 Processing usage type:', usageType)

    if (usageType === 'remove') {
      console.log('🗑️ Processing complete removal...')
      
      try {
        // Remove item completely
        console.log('🔥 Deleting item from database...')
        updatedItem = await prisma.item.delete({
          where: {
            id: params.id
          }
        })
        console.log('✅ Item deleted successfully')
      } catch (deleteError) {
        console.log('❌ Error deleting item:', deleteError)
        return NextResponse.json({ 
          error: 'Failed to delete item',
          details: deleteError instanceof Error ? deleteError.message : String(deleteError)
        }, { status: 500 })
      }

      try {
        // Create usage record for undo functionality
        console.log('📝 Creating usage record...')
        const originalItemData = {
          name: currentItem.name,
          description: currentItem.description,
          category: currentItem.category,
          foodUnit: currentItem.foodUnit,
          quantity: currentItem.quantity,
          value: currentItem.value,
          condition: currentItem.condition,
          location: currentItem.location,
          notes: currentItem.notes,
          photoUrl: currentItem.photoUrl,
          serialNumber: currentItem.serialNumber,
          purchaseDate: currentItem.purchaseDate,
          roomId: currentItem.roomId,
          boxId: currentItem.boxId,
          userId: currentItem.userId,
          status: currentItem.status,
          isActive: currentItem.isActive,
          storageType: currentItem.storageType,
          positionId: currentItem.positionId,
          isFood: currentItem.isFood,
          foodCategory: currentItem.foodCategory,
          expirationDate: currentItem.expirationDate
        }

        console.log('💾 Original item data for restore:', originalItemData)

        usageRecord = await prisma.itemUsage.create({
          data: {
            itemId: params.id,
            itemName: currentItem.name,
            originalQuantity: currentItem.quantity || 1,
            usedQuantity: currentItem.quantity || 1,
            usageType: 'remove',
            usedAt: new Date(usedAt),
            userId: session.user.id,
            originalItemData: JSON.stringify(originalItemData)
          }
        })
        console.log('✅ Usage record created:', usageRecord.id)
      } catch (usageError) {
        console.log('❌ Error creating usage record:', usageError)
        // Item is already deleted, but we couldn't create the usage record
        // This is not critical for the operation, just log it
        console.log('⚠️ Warning: Item deleted but usage record creation failed')
      }

      console.log('🗑️ Item removal process completed')
    } else {
      console.log('📉 Processing quantity reduction...')
      
      // Reduce quantity
      const newQuantity = Math.max(0, (currentItem.quantity || 1) - usageQuantity)
      console.log('🧮 Quantity calculation:', {
        original: currentItem.quantity || 1,
        toUse: usageQuantity,
        newQuantity: newQuantity
      })
      
      try {
        if (newQuantity <= 0) {
          // If quantity becomes 0 or less, remove the item
          console.log('🗑️ New quantity is 0 or less, removing item...')
          updatedItem = await prisma.item.delete({
            where: {
              id: params.id
            }
          })
          console.log('✅ Item removed due to zero quantity')
        } else {
          // Update quantity
          console.log('🔄 Updating item quantity...')
          updatedItem = await prisma.item.update({
            where: {
              id: params.id
            },
            data: {
              quantity: newQuantity
            }
          })
          console.log('✅ Quantity updated successfully to:', newQuantity)
        }
      } catch (updateError) {
        console.log('❌ Error updating item quantity:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update item quantity',
          details: updateError instanceof Error ? updateError.message : String(updateError)
        }, { status: 500 })
      }

      try {
        // Create usage record
        console.log('📝 Creating usage record for quantity reduction...')
        usageRecord = await prisma.itemUsage.create({
          data: {
            itemId: params.id,
            itemName: currentItem.name,
            originalQuantity: currentItem.quantity || 1,
            usedQuantity: usageQuantity,
            usageType: 'reduce',
            usedAt: new Date(usedAt),
            userId: session.user.id
          }
        })
        console.log('✅ Usage record created:', usageRecord.id)
      } catch (usageError) {
        console.log('❌ Error creating usage record:', usageError)
        // Item is already updated, but we couldn't create the usage record
        // This is not critical for the operation, just log it
        console.log('⚠️ Warning: Item updated but usage record creation failed')
      }
    }

    console.log('✅ Usage processing completed')
    console.log('📤 Preparing response...')

    const response = {
      success: true,
      item: updatedItem,
      usage: usageRecord ? {
        id: usageRecord.id,
        type: usageType,
        quantity: usageType === 'remove' ? (currentItem.quantity || 1) : usageQuantity,
        usedAt: usedAt
      } : null
    }

    console.log('🚀 Sending success response:', response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ CRITICAL ERROR in mark-used API:', error)
    console.error('📊 Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      itemId: params.id
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to mark item as used',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  } finally {
    console.log('🔌 Disconnecting from database...')
    await prisma.$disconnect()
    console.log('✅ Database disconnected')
  }
}
