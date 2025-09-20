
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/items/[id] - Get a specific item
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const item = await prisma.item.findFirst({
      where: {
        id: params.id,
        isActive: true
      },
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
            name: true,
            size: true,
            isStaging: true
          }
        }
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error fetching item:', error)
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
  }
}

// PUT /api/items/[id] - Update an item
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      category,
      quantity,
      value,
      condition,
      location,
      notes,
      photoUrl,
      serialNumber,
      purchaseDate,
      roomId,
      boxId,
      // Position and storage fields
      positionId,
      storageType,
      // Food-specific fields
      isFood,
      foodCategory,
      foodUnit,
      expirationDate
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!roomId) {
      return NextResponse.json({ error: 'Room is required' }, { status: 400 })
    }

    // Check if item exists (shared household - any item is editable)
    const existingItem = await prisma.item.findFirst({
      where: {
        id: params.id,
        isActive: true
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Verify the room exists (shared household)
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        isActive: true
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Invalid room selected' }, { status: 400 })
    }

    // Verify box exists if provided (shared household)
    if (boxId) {
      const box = await prisma.box.findFirst({
        where: {
          id: boxId,
          roomId: roomId, // Box must be in the same room
          isActive: true
        }
      })

      if (!box) {
        return NextResponse.json({ error: 'Invalid box selected' }, { status: 400 })
      }
    }

    // Verify position exists if provided (shared household)
    if (positionId) {
      const position = await prisma.position.findFirst({
        where: {
          id: positionId
        },
        include: {
          rack: {
            select: {
              roomId: true
            }
          }
        }
      })

      if (!position) {
        return NextResponse.json({ error: 'Invalid position selected' }, { status: 400 })
      }

      // Position must be in the same room
      if (position.rack.roomId !== roomId) {
        return NextResponse.json({ error: 'Position must be in the same room as the item' }, { status: 400 })
      }
    }

    const updatedItem = await prisma.item.update({
      where: {
        id: params.id
      },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        quantity: quantity ? parseInt(quantity) : 1,
        value: value ? parseFloat(value) : null,
        condition: condition?.trim() || null,
        location: location?.trim() || null,
        notes: notes?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        roomId,
        boxId: boxId || null,
        // Position and storage fields
        positionId: positionId || null,
        storageType: storageType || 'loose',
        // Food-specific fields
        isFood: Boolean(isFood),
        foodCategory: isFood && foodCategory?.trim() ? foodCategory.trim() : null,
        foodUnit: isFood && foodUnit?.trim() ? foodUnit.trim() : null,
        expirationDate: isFood && expirationDate ? new Date(expirationDate) : null
      },
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
            name: true,
            size: true,
            isStaging: true,
            positions: {
              include: {
                position: {
                  include: {
                    rack: {
                      select: {
                        id: true,
                        name: true,
                        rackNumber: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        position: {
          include: {
            rack: {
              select: {
                id: true,
                name: true,
                rackNumber: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

// DELETE /api/items/[id] - Delete an item (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if item exists (shared household - any item is deletable)
    const item = await prisma.item.findFirst({
      where: {
        id: params.id,
        isActive: true
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Soft delete the item
    await prisma.item.update({
      where: {
        id: params.id
      },
      data: {
        isActive: false
      }
    })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
