
import { NextRequest } from 'next/server'
import { ServiceResponseHandler, roomService } from '@/lib/services'

export const dynamic = 'force-dynamic'

// GET - List all rooms for the authenticated user
export async function GET(request: NextRequest) {
  return ServiceResponseHandler.handleServiceCall(async () => {
    return await roomService.getAllRooms({
      includeCounts: true,
      includeUser: true
    })
  })
}

// POST - Create a new room
export async function POST(request: NextRequest) {
  return ServiceResponseHandler.handleServiceCall(async () => {
    const body = await request.json()
    const { name, description, color = '#3B82F6' } = body

    return await roomService.createRoom({
      name,
      description,
      color
    })
  })
}
