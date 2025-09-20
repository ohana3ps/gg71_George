
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// GET - Get a specific box
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const box = await prisma.box.findFirst({
      where: {
        id: params.id,
        isActive: true
      },
      include: {
        room: true,
        items: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        },
        positions: {
          include: {
            position: {
              include: {
                rack: true
              }
            }
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    })

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 })
    }

    return NextResponse.json(box)
  } catch (error) {
    console.error('Error fetching box:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// PUT - Update a box
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, size, roomId, boxNumber } = body

    // Verify box exists (shared household)
    const existingBox = await prisma.box.findFirst({
      where: {
        id: params.id,
        isActive: true
      },
      include: {
        items: {
          where: { isActive: true }
        }
      }
    })

    if (!existingBox) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 })
    }

    const updateData: any = {}
    
    if (name !== undefined) {
      updateData.name = name.trim() || null
    }
    
    if (description !== undefined) {
      updateData.description = description.trim() || null
    }
    
    if (size !== undefined) {
      updateData.size = size
    }

    // Handle room change
    if (roomId !== undefined && roomId !== existingBox.roomId) {
      // Verify target room exists
      const targetRoom = await prisma.room.findFirst({
        where: {
          id: roomId,
          isActive: true
        }
      })

      if (!targetRoom) {
        return NextResponse.json({ error: 'Target room not found' }, { status: 404 })
      }

      updateData.roomId = roomId

      // If moving to a different room, also move all items in this box
      if (existingBox.items.length > 0) {
        await prisma.item.updateMany({
          where: {
            boxId: params.id,
            isActive: true
          },
          data: {
            roomId: roomId
          }
        })
      }

      // Remove box from any rack positions since it's moving rooms
      await prisma.boxPosition.deleteMany({
        where: { boxId: params.id }
      })

      // Set to staging in the new room
      updateData.isStaging = true
    }

    // Handle box number change
    if (boxNumber !== undefined && boxNumber !== existingBox.boxNumber) {
      // Validate new box number is available in the target room
      const targetRoomId = roomId || existingBox.roomId
      
      const existingBoxWithNumber = await prisma.box.findFirst({
        where: {
          roomId: targetRoomId,
          boxNumber: parseInt(boxNumber),
          isActive: true,
          NOT: {
            id: params.id // Exclude current box
          }
        }
      })

      if (existingBoxWithNumber) {
        return NextResponse.json({ 
          error: `Box number ${boxNumber} is already in use in the selected room` 
        }, { status: 400 })
      }

      updateData.boxNumber = parseInt(boxNumber)
    }

    const box = await prisma.box.update({
      where: { id: params.id },
      data: updateData,
      include: {
        room: true,
        items: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        },
        positions: {
          include: {
            position: {
              include: {
                rack: true
              }
            }
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
    console.error('Error updating box:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// PATCH - Move box or update specific properties
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, rackId, shelfNumber, positionNumber, toStaging } = body

    // Verify box exists (shared household)
    const existingBox = await prisma.box.findFirst({
      where: {
        id: params.id,
        isActive: true
      },
      include: {
        positions: true
      }
    })

    if (!existingBox) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 })
    }

    if (action === 'move') {
      // Remove box from current position
      await prisma.boxPosition.deleteMany({
        where: { boxId: params.id }
      })

      if (toStaging) {
        // Move to staging
        await prisma.box.update({
          where: { id: params.id },
          data: { isStaging: true }
        })
      } else {
        // Move to specific position
        if (!rackId || !shelfNumber || !positionNumber) {
          return NextResponse.json({ error: 'Rack ID, shelf number, and position number are required for placement' }, { status: 400 })
        }

        // Find the position with current box positions
        const position = await prisma.position.findFirst({
          where: {
            rack: {
              id: rackId,
              isActive: true
            },
            shelfNumber: parseInt(shelfNumber),
            positionNumber: parseInt(positionNumber)
          },
          include: {
            boxPositions: true
          }
        })

        if (!position) {
          return NextResponse.json({ error: 'Position not found' }, { status: 404 })
        }

        // Check if position has available capacity
        const currentBoxCount = position.boxPositions?.length || 0
        const positionCapacity = position.capacity || 1
        
        console.log('🔍 BOX PLACEMENT: Capacity check:', {
          positionId: position.id,
          shelfNumber: parseInt(shelfNumber),
          positionNumber: parseInt(positionNumber),
          currentBoxCount,
          positionCapacity,
          hasSpace: currentBoxCount < positionCapacity,
          existingBoxes: position.boxPositions?.map(bp => bp.boxId) || []
        })

        if (currentBoxCount >= positionCapacity) {
          console.log('❌ BOX PLACEMENT: Position at capacity')
          return NextResponse.json({ 
            error: `Position is at full capacity (${currentBoxCount}/${positionCapacity} boxes)` 
          }, { status: 400 })
        }
        
        console.log('✅ BOX PLACEMENT: Position has space, proceeding with placement')

        // Place box at position
        await prisma.boxPosition.create({
          data: {
            boxId: params.id,
            positionId: position.id
          }
        })

        // Update box staging status
        await prisma.box.update({
          where: { id: params.id },
          data: { isStaging: false }
        })
      }
    }

    // Get updated box
    const box = await prisma.box.findFirst({
      where: { id: params.id },
      include: {
        room: true,
        items: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        },
        positions: {
          include: {
            position: {
              include: {
                rack: true
              }
            }
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
    console.error('Error updating box:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE - Delete a box
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify box exists and get box with items (shared household)
    const existingBox = await prisma.box.findFirst({
      where: {
        id: params.id,
        isActive: true
      },
      include: {
        items: {
          where: { isActive: true }
        },
        positions: true
      }
    })

    if (!existingBox) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 })
    }

    // Check if box has items
    if (existingBox.items.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete box with items',
        details: {
          itemCount: existingBox.items.length
        }
      }, { status: 400 })
    }

    // Remove box positions
    await prisma.boxPosition.deleteMany({
      where: { boxId: params.id }
    })

    // Soft delete the box
    await prisma.box.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: 'Box deleted successfully' })
  } catch (error) {
    console.error('Error deleting box:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
