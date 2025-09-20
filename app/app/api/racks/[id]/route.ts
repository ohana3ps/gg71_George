

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// GET - Get a specific rack by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rack = await prisma.rack.findFirst({
      where: {
        id: params.id,
        isActive: true
      },
      include: {
        room: true,
        positions: {
          include: {
            boxPositions: {
              include: {
                box: {
                  include: {
                    items: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!rack) {
      return NextResponse.json({ error: 'Rack not found' }, { status: 404 })
    }

    return NextResponse.json(rack)
  } catch (error) {
    console.error('Error fetching rack:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// PUT - Update a rack
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, rackNumber, maxShelves, positionsPerShelf, shelfConfig, useAdvancedConfig } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Verify rack exists and check if it has items (shared household)
    const existingRack = await prisma.rack.findFirst({
      where: {
        id: params.id,
        isActive: true
      },
      include: {
        positions: {
          include: {
            boxPositions: {
              include: {
                box: {
                  include: {
                    items: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!existingRack) {
      return NextResponse.json({ error: 'Rack not found' }, { status: 404 })
    }

    // Check if rack has any items (which would lock the configuration)
    const hasItems = existingRack.positions.some(position => 
      position.boxPositions.some(bp => bp.box.items.length > 0)
    )

    // Validate shelf configuration if advanced config is used
    if (useAdvancedConfig && shelfConfig) {
      if (!Array.isArray(shelfConfig)) {
        return NextResponse.json({ error: 'Invalid shelf configuration' }, { status: 400 })
      }
      
      // Validate each shelf config
      for (const config of shelfConfig) {
        if (!config.shelfNumber || !config.positions || config.positions < 1 || config.positions > 15) {
          return NextResponse.json({ error: 'Each shelf must have 1-15 positions' }, { status: 400 })
        }
      }
    }

    // If configuration is locked due to items, prevent structural changes
    if (hasItems && (maxShelves || positionsPerShelf || shelfConfig)) {
      return NextResponse.json({ 
        error: 'Cannot modify rack configuration - contains items. Only name and rack number can be changed.' 
      }, { status: 400 })
    }

    // Check if rack number conflicts with another rack in the same room (if changed)
    if (rackNumber && rackNumber !== existingRack.rackNumber) {
      const conflictingRack = await prisma.rack.findFirst({
        where: {
          roomId: existingRack.roomId,
          rackNumber: parseInt(rackNumber),
          isActive: true,
          NOT: {
            id: params.id
          }
        }
      })

      if (conflictingRack) {
        return NextResponse.json({ error: 'Rack number already exists in this room' }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {
      name: name.trim(),
      configLocked: hasItems, // Lock if has items
      ...(rackNumber && { rackNumber: parseInt(rackNumber) }),
    }

    // Only allow structural changes if no items exist
    if (!hasItems) {
      if (maxShelves) updateData.maxShelves = parseInt(maxShelves)
      if (positionsPerShelf) updateData.positionsPerShelf = parseInt(positionsPerShelf)
      if (useAdvancedConfig && shelfConfig) {
        updateData.shelfConfig = shelfConfig
      } else if (!useAdvancedConfig) {
        updateData.shelfConfig = null
      }
    }

    // Update the rack
    const updatedRack = await prisma.rack.update({
      where: { id: params.id },
      data: updateData,
      include: {
        room: true,
        positions: {
          include: {
            boxPositions: {
              include: {
                box: {
                  include: {
                    items: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // If structural configuration changed and no items exist, update positions
    if (!hasItems && (maxShelves || positionsPerShelf || shelfConfig !== undefined)) {
      const newMaxShelves = maxShelves ? parseInt(maxShelves) : existingRack.maxShelves
      
      // Delete all existing positions (since we're restructuring)
      await prisma.position.deleteMany({
        where: {
          rackId: params.id
        }
      })

      // Create new positions
      const newPositions = []
      
      if (useAdvancedConfig && shelfConfig) {
        // Use individual shelf configuration
        for (const config of shelfConfig) {
          for (let position = 1; position <= config.positions; position++) {
            newPositions.push({
              rackId: params.id,
              shelfNumber: config.shelfNumber,
              positionNumber: position,
              capacity: 4 // Default capacity allows stacking 4 boxes (2 front + 2 back)
            })
          }
        }
      } else {
        // Use uniform configuration
        const newPositionsPerShelf = positionsPerShelf ? parseInt(positionsPerShelf) : existingRack.positionsPerShelf
        for (let shelf = 1; shelf <= newMaxShelves; shelf++) {
          for (let position = 1; position <= newPositionsPerShelf; position++) {
            newPositions.push({
              rackId: params.id,
              shelfNumber: shelf,
              positionNumber: position,
              capacity: 4 // Default capacity allows stacking 4 boxes (2 front + 2 back)
            })
          }
        }
      }

      if (newPositions.length > 0) {
        await prisma.position.createMany({
          data: newPositions
        })
      }
    }

    return NextResponse.json(updatedRack)
  } catch (error) {
    console.error('Error updating rack:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// PATCH - Update position capacities
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, capacities } = body

    if (action !== 'updateCapacities' || !capacities) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Verify rack exists (shared household)
    const rack = await prisma.rack.findFirst({
      where: {
        id: params.id,
        isActive: true
      }
    })

    if (!rack) {
      return NextResponse.json({ error: 'Rack not found' }, { status: 404 })
    }

    // Update position capacities
    const updatePromises = Object.entries(capacities).map(([positionId, capacity]) => {
      const numericCapacity = parseInt(capacity as string)
      
      // Validate capacity (1-4)
      if (numericCapacity < 1 || numericCapacity > 4) {
        throw new Error(`Invalid capacity: ${numericCapacity}. Must be between 1 and 4.`)
      }

      return prisma.position.update({
        where: { id: positionId },
        data: { capacity: numericCapacity }
      })
    })

    await Promise.all(updatePromises)

    // Return updated rack with positions
    const updatedRack = await prisma.rack.findFirst({
      where: { id: params.id },
      include: {
        room: true,
        positions: {
          include: {
            boxPositions: {
              include: {
                box: {
                  include: {
                    items: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedRack)
  } catch (error) {
    console.error('Error updating position capacities:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE - Delete a rack
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify rack exists and check if it has boxes (shared household)
    const rack = await prisma.rack.findFirst({
      where: {
        id: params.id,
        isActive: true
      },
      include: {
        positions: {
          include: {
            boxPositions: true
          }
        }
      }
    })

    if (!rack) {
      return NextResponse.json({ error: 'Rack not found' }, { status: 404 })
    }

    // Check if rack has boxes
    const hasBoxes = rack.positions.some(position => position.boxPositions.length > 0)
    
    if (hasBoxes) {
      return NextResponse.json({ error: 'Cannot delete rack with boxes. Please move boxes first.' }, { status: 400 })
    }

    // Hard delete the rack and its positions (since it's empty)
    // First delete all positions
    await prisma.position.deleteMany({
      where: { rackId: params.id }
    })
    
    // Then delete the rack itself
    await prisma.rack.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Rack deleted successfully' })
  } catch (error) {
    console.error('Error deleting rack:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
