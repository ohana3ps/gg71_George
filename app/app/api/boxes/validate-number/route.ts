
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// GET - Validate if box number is available in a room
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const boxNumberStr = searchParams.get('boxNumber')

    if (!roomId || !boxNumberStr) {
      return NextResponse.json({ error: 'Room ID and box number are required' }, { status: 400 })
    }

    const boxNumber = parseInt(boxNumberStr)
    if (isNaN(boxNumber) || boxNumber < 1) {
      return NextResponse.json({ error: 'Invalid box number' }, { status: 400 })
    }

    // Verify room exists (shared household)
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        isActive: true
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check if box number already exists
    const existingBox = await prisma.box.findFirst({
      where: {
        roomId,
        boxNumber,
        isActive: true
      }
    })

    const isAvailable = !existingBox

    // If not available, provide comprehensive alternatives
    let suggestion = boxNumber + 1
    let alternatives: number[] = []
    let reason = ''

    if (!isAvailable) {
      // Get all existing box numbers for comprehensive analysis
      const existingBoxes = await prisma.box.findMany({
        where: {
          roomId,
          isActive: true
        },
        select: {
          boxNumber: true,
          name: true
        },
        orderBy: {
          boxNumber: 'asc'
        }
      })

      const usedNumbers = existingBoxes.map(box => box.boxNumber).sort((a, b) => a - b)
      const conflictingBox = existingBoxes.find(box => box.boxNumber === boxNumber)
      
      // Create detailed reason
      reason = conflictingBox?.name 
        ? `Box ${boxNumber} is already used for "${conflictingBox.name}"`
        : `Box ${boxNumber} is already in use in this room`

      // Find gaps first (priority alternatives)
      const gaps: number[] = []
      const maxNumber = Math.max(...usedNumbers, 0)
      for (let i = 1; i <= maxNumber; i++) {
        if (!usedNumbers.includes(i)) {
          gaps.push(i)
        }
      }

      // Build alternatives list
      alternatives = []

      // Add first few gaps
      alternatives.push(...gaps.slice(0, 3))

      // Add sequential alternatives
      for (let i = 1; i <= 5; i++) {
        const candidate = boxNumber + i
        if (!usedNumbers.includes(candidate) && !alternatives.includes(candidate)) {
          alternatives.push(candidate)
        }
      }

      // Add some lower alternatives if space permits
      for (let i = 1; i <= 3; i++) {
        const candidate = boxNumber - i
        if (candidate > 0 && !usedNumbers.includes(candidate) && !alternatives.includes(candidate)) {
          alternatives.unshift(candidate) // Add to beginning
        }
      }

      // Add round numbers as final alternatives
      const roundNumbers = [5, 10, 15, 20, 25, 30, 50].filter(n => 
        !usedNumbers.includes(n) && !alternatives.includes(n)
      )
      alternatives.push(...roundNumbers.slice(0, 2))

      // Clean up and limit alternatives
      alternatives = [...new Set(alternatives)].sort((a, b) => {
        // Prioritize gaps, then lower numbers, then higher numbers
        const aIsGap = gaps.includes(a)
        const bIsGap = gaps.includes(b)
        if (aIsGap && !bIsGap) return -1
        if (bIsGap && !aIsGap) return 1
        return a - b
      }).slice(0, 6)

      // Primary suggestion is first alternative
      suggestion = alternatives[0] || boxNumber + 1
    }

    return NextResponse.json({ 
      isAvailable,
      suggestion: isAvailable ? null : suggestion,
      alternatives: isAvailable ? [] : alternatives,
      reason: isAvailable ? null : reason
    })
  } catch (error) {
    console.error('Error validating box number:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
