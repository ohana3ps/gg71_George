
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// GET - List all racks for the authenticated user
export async function GET(request: NextRequest) {
  try {
    let session
    try {
      session = await getServerSession(authOptions)
      console.log('🔍 RACK GET API: Session retrieved:', { 
        hasSession: !!session, 
        userId: session?.user?.id 
      })
    } catch (sessionError) {
      console.error('❌ RACK GET API: Session retrieval failed:', sessionError)
      return NextResponse.json({ 
        error: 'Authentication service error', 
        details: process.env.NODE_ENV === 'development' ? String(sessionError) : undefined 
      }, { status: 503 })
    }
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const nextNumber = searchParams.get('nextNumber')

    // Special endpoint for getting next available rack number
    if (nextNumber && roomId) {
      const allRacksInRoom = await prisma.rack.findMany({
        where: { roomId },
        select: { rackNumber: true }
      })
      
      const existingNumbers = allRacksInRoom.map(rack => rack.rackNumber).sort((a, b) => a - b)
      let nextAvailable = 1
      
      // Find the first available number starting from 1
      for (let i = 1; i <= existingNumbers.length + 1; i++) {
        if (!existingNumbers.includes(i)) {
          nextAvailable = i
          break
        }
      }
      
      // If no gaps were found and we're still at 1, it means 1 is taken
      // so we need the next number after the highest existing number
      if (existingNumbers.includes(1) && nextAvailable === 1) {
        nextAvailable = existingNumbers[existingNumbers.length - 1] + 1
      }
      
      return NextResponse.json({ nextAvailableRackNumber: nextAvailable })
    }

    const where: any = {
      // Shared household - everyone sees all racks
      isActive: true
    }

    if (roomId) {
      where.roomId = roomId
    }

    const racks = await prisma.rack.findMany({
      where,
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
        },
        _count: {
          select: {
            positions: true
          }
        }
      },
      orderBy: [
        { roomId: 'asc' },
        { rackNumber: 'asc' }
      ]
    })

    return NextResponse.json(racks)
  } catch (error) {
    console.error('Error fetching racks:', error)
    
    // Check if it's a database/service error (503) vs application error (500)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isDatabaseError = errorMessage.includes('database') || 
                            errorMessage.includes('connection') ||
                            errorMessage.includes('timeout') ||
                            errorMessage.includes('ECONNREFUSED')
    
    const statusCode = isDatabaseError ? 503 : 500
    const responseMessage = isDatabaseError ? 'Service temporarily unavailable' : 'Internal Server Error'
    
    return NextResponse.json({ 
      error: responseMessage,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
    }, { status: statusCode })
  } finally {
    try {
      await prisma.$disconnect()
    } catch (disconnectError) {
      console.error('Error disconnecting from database:', disconnectError)
    }
  }
}

// POST - Create a new rack
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 RACK API: Starting rack creation request')
    
    let session
    try {
      session = await getServerSession(authOptions)
      console.log('🔍 RACK API: Session retrieved successfully:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        userEmail: session?.user?.email 
      })
    } catch (sessionError) {
      console.error('❌ RACK API: Session retrieval failed:', sessionError)
      return NextResponse.json({ 
        error: 'Authentication service error', 
        details: process.env.NODE_ENV === 'development' ? String(sessionError) : undefined 
      }, { status: 503 })
    }
    
    if (!session?.user?.id) {
      console.log('❌ RACK API: No session or user ID - returning 401')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('🔍 RACK API: Parsing request body...')
    const body = await request.json()
    console.log('🔍 RACK API: Request body:', body)
    
    const { 
      name, 
      rackNumber, 
      maxShelves = 5, 
      positionsPerShelf = 6, 
      shelfConfig, 
      useAdvancedConfig,
      roomId 
    } = body

    if (!name || !roomId || !rackNumber) {
      console.log('❌ RACK API: Missing required fields:', { name: !!name, roomId: !!roomId, rackNumber: !!rackNumber })
      return NextResponse.json({ error: 'Name, rack number, and room ID are required' }, { status: 400 })
    }

    console.log('✅ RACK API: Required fields validated')

    // Enhanced validation for shelf configuration with debugging
    if (useAdvancedConfig && shelfConfig) {
      console.log('🔍 RACK API: Validating shelf config:', {
        shelfConfig,
        maxShelves,
        shelfConfigLength: shelfConfig?.length,
        isArray: Array.isArray(shelfConfig)
      })

      if (!Array.isArray(shelfConfig)) {
        return NextResponse.json({ error: 'Shelf configuration must be an array' }, { status: 400 })
      }

      if (shelfConfig.length !== parseInt(maxShelves)) {
        return NextResponse.json({ 
          error: `Shelf configuration length (${shelfConfig.length}) doesn't match max shelves (${maxShelves})` 
        }, { status: 400 })
      }
      
      // Validate each shelf config with detailed error messages
      for (let i = 0; i < shelfConfig.length; i++) {
        const config = shelfConfig[i]
        console.log(`🔍 DEBUG: Validating shelf ${i + 1}:`, config)
        
        if (!config.shelfNumber || typeof config.shelfNumber !== 'number') {
          return NextResponse.json({ 
            error: `Shelf ${i + 1}: Invalid shelf number (${config.shelfNumber})` 
          }, { status: 400 })
        }
        
        if (!config.positions || typeof config.positions !== 'number' || config.positions < 1 || config.positions > 15) {
          return NextResponse.json({ 
            error: `Shelf ${config.shelfNumber}: Invalid positions count (${config.positions}). Must be 1-15.` 
          }, { status: 400 })
        }
      }
    }

    console.log('🔍 RACK API: Checking for existing rack number...')
    // Check if rack number already exists in the room (regardless of active status)
    // This prevents unique constraint violations
    const existingRack = await prisma.rack.findFirst({
      where: {
        roomId,
        rackNumber: parseInt(rackNumber)
      }
    })

    if (existingRack) {
      console.log('❌ RACK API: Rack number already exists:', rackNumber)
      return NextResponse.json({ error: 'Rack number already exists in this room' }, { status: 400 })
    }

    console.log('✅ RACK API: Rack number available')

    console.log('🔍 RACK API: Verifying room exists...')
    // Verify room exists (shared household)
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        isActive: true
      }
    })

    if (!room) {
      console.log('❌ RACK API: Room not found:', roomId)
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    console.log('✅ RACK API: Room verified:', room.name)

    console.log('🔍 RACK API: Creating rack in database...')
    // Create rack
    const rack = await prisma.rack.create({
      data: {
        name: name.trim(),
        rackNumber: parseInt(rackNumber),
        maxShelves: parseInt(maxShelves),
        positionsPerShelf: parseInt(positionsPerShelf),
        shelfConfig: useAdvancedConfig ? shelfConfig : null,
        roomId,
        userId: session.user.id,
        createdBy: session.user.email // Enhanced audit: Track who created this rack
      },
      include: {
        room: true
      }
    })

    console.log('✅ RACK API: Rack created successfully:', rack.id)

    // Create positions for the rack with enhanced debugging
    const positions = []
    
    if (useAdvancedConfig && shelfConfig) {
      console.log('🔍 DEBUG: Creating positions with advanced config:', shelfConfig)
      // Use individual shelf configuration
      for (const config of shelfConfig) {
        console.log(`🔍 DEBUG: Creating ${config.positions} positions for shelf ${config.shelfNumber}`)
        for (let position = 1; position <= config.positions; position++) {
          positions.push({
            rackId: rack.id,
            shelfNumber: parseInt(config.shelfNumber),
            positionNumber: position
          })
        }
      }
    } else {
      console.log('🔍 DEBUG: Creating positions with uniform config:', {
        maxShelves: parseInt(maxShelves),
        positionsPerShelf: parseInt(positionsPerShelf)
      })
      // Use uniform configuration
      for (let shelf = 1; shelf <= parseInt(maxShelves); shelf++) {
        for (let position = 1; position <= parseInt(positionsPerShelf); position++) {
          positions.push({
            rackId: rack.id,
            shelfNumber: shelf,
            positionNumber: position,
            capacity: 4 // Default capacity allows stacking 4 boxes (2 front + 2 back)
          })
        }
      }
    }

    console.log('🔍 DEBUG: Total positions to create:', positions.length)
    console.log('🔍 DEBUG: First few positions:', positions.slice(0, 3))

    try {
      await prisma.position.createMany({
        data: positions
      })
      console.log('✅ DEBUG: Positions created successfully')
    } catch (positionError) {
      console.error('❌ DEBUG: Error creating positions:', positionError)
      throw positionError
    }

    console.log('🎉 RACK API: Rack creation completed successfully')
    return NextResponse.json(rack)
  } catch (error) {
    console.error('💥 RACK API ERROR:', error)
    
    // Safely extract error details with proper typing
    const errorDetails: any = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : {
      name: 'Unknown Error',
      message: String(error),
      stack: undefined
    }
    
    // Check for Prisma-specific error properties
    const prismaError = error as any
    if (prismaError?.code) {
      errorDetails.code = prismaError.code
    }
    if (prismaError?.meta) {
      errorDetails.meta = prismaError.meta
    }
    
    console.error('💥 RACK API ERROR DETAILS:', errorDetails)
    
    // Check if it's a database/service error (503) vs application error (500)
    const isDatabaseError = errorDetails.message?.includes('database') || 
                            errorDetails.message?.includes('connection') ||
                            errorDetails.message?.includes('timeout') ||
                            errorDetails.message?.includes('ECONNREFUSED') ||
                            prismaError?.code === 'P1001' // Prisma connection error
    
    const statusCode = isDatabaseError ? 503 : 500
    const errorMessage = isDatabaseError ? 'Service temporarily unavailable' : 'Internal Server Error'
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails.message : undefined
    }, { status: statusCode })
  } finally {
    try {
      await prisma.$disconnect()
    } catch (disconnectError) {
      console.error('Error disconnecting from database:', disconnectError)
    }
  }
}
