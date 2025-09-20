
import { NextRequest } from 'next/server'
import { ServiceResponseHandler, roomService } from '@/lib/services'

export const dynamic = 'force-dynamic'

// GET - Get a single room by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return ServiceResponseHandler.handleServiceCall(async () => {
    return await roomService.getRoomById(params.id, {
      includeCounts: true,
      includeUser: true
    })
  })
}

// PUT - Update a room
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return ServiceResponseHandler.handleServiceCall(async () => {
    const body = await request.json()
    const { name, description, color } = body

    return await roomService.updateRoom(params.id, {
      name,
      description,
      color
    })
  })
}

// DELETE - Delete (soft delete) a room
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return ServiceResponseHandler.handleServiceCall(async () => {
    return await roomService.deleteRoom(params.id)
  })
}
