
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// GET - Get suggested box number for a room
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 })
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

    // Get all existing box numbers for this room
    const existingBoxes = await prisma.box.findMany({
      where: {
        roomId,
        isActive: true
      },
      select: {
        boxNumber: true
      },
      orderBy: {
        boxNumber: 'asc'
      }
    })

    const usedNumbers = existingBoxes.map(box => box.boxNumber).sort((a, b) => a - b)

    // Enhanced gap analysis and multiple suggestions
    const maxNumber = Math.max(...usedNumbers, 0)
    const suggestions: number[] = []
    const gaps: number[] = []
    
    // Find gaps in sequence
    for (let i = 1; i <= maxNumber; i++) {
      if (!usedNumbers.includes(i)) {
        gaps.push(i)
      }
    }
    
    // Primary suggestion: first gap or next sequential
    let suggestedNumber = gaps.length > 0 ? gaps[0] : maxNumber + 1
    
    // Generate quick-select suggestions (up to 5)
    suggestions.push(suggestedNumber) // Primary suggestion
    
    // Add next 2 gaps if available
    if (gaps.length > 1) suggestions.push(gaps[1])
    if (gaps.length > 2) suggestions.push(gaps[2])
    
    // Add next sequential numbers
    while (suggestions.length < 4) {
      const nextNum: number = Math.max(...suggestions) + 1
      if (!usedNumbers.includes(nextNum)) {
        suggestions.push(nextNum)
      } else {
        break
      }
    }
    
    // Add a "nice" round number if space allows
    const roundNumbers = [5, 10, 15, 20, 25, 50].filter(n => 
      !usedNumbers.includes(n) && !suggestions.includes(n)
    )
    if (roundNumbers.length > 0 && suggestions.length < 5) {
      suggestions.push(roundNumbers[0])
    }

    return NextResponse.json({ 
      suggestedNumber,
      suggestions: [...new Set(suggestions)].sort((a, b) => a - b).slice(0, 5),
      gaps,
      usedNumbers: usedNumbers.sort((a, b) => a - b),
      analytics: {
        totalBoxes: usedNumbers.length,
        hasGaps: gaps.length > 0,
        largestGap: gaps.length > 0 ? Math.max(...gaps) - Math.min(...gaps) : 0,
        pattern: detectPattern(usedNumbers)
      }
    })
  } catch (error) {
    console.error('Error getting suggested box number:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// Helper function to detect numbering patterns
function detectPattern(numbers: number[]): string {
  if (numbers.length < 2) return 'sequential'
  
  const sorted = numbers.sort((a, b) => a - b)
  const gaps = []
  
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1])
  }
  
  // Check for consistent increments
  const uniqueGaps = [...new Set(gaps)]
  if (uniqueGaps.length === 1 && uniqueGaps[0] === 1) return 'sequential'
  if (uniqueGaps.length === 1 && uniqueGaps[0] > 1) return 'spaced'
  if (uniqueGaps.length <= 2) return 'mostly-sequential'
  
  return 'mixed'
}
