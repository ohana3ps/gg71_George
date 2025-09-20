
import { NextRequest } from 'next/server'
import { ServiceResponseHandler, itemService } from '@/lib/services'

export const dynamic = 'force-dynamic'

// GET /api/items - Get all items for the authenticated user
export async function GET(request: NextRequest) {
  return ServiceResponseHandler.handleServiceCall(async () => {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const boxId = searchParams.get('boxId')
    const category = searchParams.get('category')
    const isFood = searchParams.get('isFood')
    const search = searchParams.get('search')

    return await itemService.getAllItems({
      roomId: roomId || undefined,
      boxId: boxId || undefined,
      category: category || undefined,
      isFood: isFood ? isFood === 'true' : undefined,
      search: search || undefined,
      includeRoom: true,
      includeUser: true,
      includeBox: true,
      includePosition: true
    })
  })
}

// POST /api/items - Create a new item
export async function POST(request: NextRequest) {
  return ServiceResponseHandler.handleServiceCall(async () => {
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
      storageType,
      positionId,
      isFood,
      foodCategory,
      foodUnit,
      expirationDate
    } = body

    return await itemService.createItem({
      name,
      description,
      category,
      quantity: quantity ? parseInt(quantity) : 1,
      value: value ? parseFloat(value) : undefined,
      condition,
      location,
      notes,
      photoUrl,
      serialNumber,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      roomId,
      boxId,
      storageType,
      positionId,
      isFood: Boolean(isFood),
      foodCategory: isFood && foodCategory?.trim() ? foodCategory.trim() : undefined,
      foodUnit: isFood && foodUnit?.trim() ? foodUnit.trim() : undefined,
      expirationDate: isFood && expirationDate ? new Date(expirationDate) : undefined
    })
  })
}
