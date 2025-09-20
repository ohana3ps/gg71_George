

import { Item, Prisma } from '@prisma/client'
import { BaseService, ServiceResponse, BaseQueryOptions, ServiceError } from './base.service'

export interface ItemCreateInput {
  name: string
  description?: string
  category?: string
  quantity: number
  value?: number
  condition?: string
  location?: string
  notes?: string
  photoUrl?: string
  serialNumber?: string
  purchaseDate?: Date
  roomId: string
  boxId?: string
  storageType?: string
  positionId?: string
  isFood?: boolean
  foodCategory?: string
  expirationDate?: Date
  foodUnit?: string
}

export interface ItemUpdateInput {
  name?: string
  description?: string
  category?: string
  quantity?: number
  value?: number
  condition?: string
  location?: string
  notes?: string
  photoUrl?: string
  serialNumber?: string
  purchaseDate?: Date
  roomId?: string
  boxId?: string
  storageType?: string
  positionId?: string
  isFood?: boolean
  foodCategory?: string
  expirationDate?: Date
  foodUnit?: string
}

export interface ItemQueryOptions extends BaseQueryOptions {
  roomId?: string
  boxId?: string
  includeRoom?: boolean
  includeBox?: boolean
  includePosition?: boolean
  includeUser?: boolean
  category?: string
  isFood?: boolean
  search?: string
}

export type ItemWithRelations = Item & {
  room?: {
    id: string
    name: string
    color: string
  }
  user?: {
    id: string
    name: string | null
    email: string
  }
  box?: {
    id: string
    boxNumber: number
    name: string | null
    size: string
    isStaging: boolean
    positions?: {
      position: {
        rack: {
          id: string
          name: string
          rackNumber: number
        }
      }
    }[]
  }
  position?: {
    id: string
    shelfNumber: number
    positionNumber: number
    rack: {
      id: string
      name: string
      rackNumber: number
    }
  }
}

/**
 * Item Service
 * Handles all item-related business logic
 */
export class ItemService extends BaseService {

  /**
   * Get all items with shared household visibility
   */
  async getAllItems(options: ItemQueryOptions = {}): Promise<ServiceResponse<ItemWithRelations[]>> {
    try {
      const context = await this.getContext()
      
      // Build where clause
      const where: Prisma.ItemWhereInput = {
        isActive: options.includeInactive ? undefined : true
      }

      if (options.roomId) {
        where.roomId = options.roomId
      }

      if (options.boxId) {
        where.boxId = options.boxId
      }

      if (options.category) {
        where.category = options.category
      }

      if (options.isFood !== undefined) {
        where.isFood = options.isFood
      }

      if (options.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } },
          { category: { contains: options.search, mode: 'insensitive' } },
          { notes: { contains: options.search, mode: 'insensitive' } }
        ]
      }

      // Build include clause
      const include: Prisma.ItemInclude = {}

      if (options.includeRoom !== false) {
        include.room = {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }

      if (options.includeUser !== false) {
        include.user = {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }

      if (options.includeBox) {
        include.box = {
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
        }
      }

      if (options.includePosition) {
        include.position = {
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

      const items = await this.prisma.item.findMany({
        where,
        include,
        orderBy: options.orderBy || { createdAt: 'desc' },
        ...this.getPaginationParams(options)
      })

      return this.success(items as any[])
    } catch (error) {
      console.error('Error fetching items:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to fetch items')
    }
  }

  /**
   * Get a single item by ID
   */
  async getItemById(id: string, options: ItemQueryOptions = {}): Promise<ServiceResponse<ItemWithRelations | null>> {
    try {
      const context = await this.getContext()
      
      // Build include clause
      const include: Prisma.ItemInclude = {
        room: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }

      if (options.includeBox) {
        include.box = {
          select: {
            id: true,
            boxNumber: true,
            name: true,
            size: true,
            isStaging: true
          }
        }
      }

      if (options.includePosition) {
        include.position = {
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

      const item = await this.prisma.item.findFirst({
        where: {
          id,
          isActive: options.includeInactive ? undefined : true
        },
        include
      })

      if (!item) {
        return this.error('Item not found', 404)
      }

      return this.success(item as any)
    } catch (error) {
      console.error('Error fetching item:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to fetch item')
    }
  }

  /**
   * Create a new item
   */
  async createItem(input: ItemCreateInput): Promise<ServiceResponse<ItemWithRelations>> {
    try {
      const context = await this.getContext()
      
      // Validate required fields
      if (!input.name?.trim()) {
        return this.error('Item name is required', 400)
      }

      if (!input.roomId) {
        return this.error('Room ID is required', 400)
      }

      if (input.quantity === undefined || input.quantity < 0) {
        return this.error('Valid quantity is required', 400)
      }

      // Verify room exists
      const room = await this.prisma.room.findFirst({
        where: { id: input.roomId, isActive: true }
      })

      if (!room) {
        return this.error('Invalid room specified', 400)
      }

      // Verify box exists if provided
      if (input.boxId) {
        const box = await this.prisma.box.findFirst({
          where: { id: input.boxId, isActive: true }
        })

        if (!box) {
          return this.error('Invalid box specified', 400)
        }
      }

      // Verify position exists if provided
      if (input.positionId) {
        const position = await this.prisma.position.findFirst({
          where: { id: input.positionId }
        })

        if (!position) {
          return this.error('Invalid position specified', 400)
        }
      }

      // Create the item
      const item = await this.prisma.item.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          category: input.category?.trim() || null,
          quantity: input.quantity,
          value: input.value || null,
          condition: input.condition?.trim() || null,
          location: input.location?.trim() || null,
          notes: input.notes?.trim() || null,
          photoUrl: input.photoUrl || null,
          serialNumber: input.serialNumber?.trim() || null,
          purchaseDate: input.purchaseDate || null,
          roomId: input.roomId,
          boxId: input.boxId || null,
          storageType: input.storageType || undefined,
          positionId: input.positionId || null,
          isFood: input.isFood || false,
          foodCategory: input.foodCategory?.trim() || null,
          expirationDate: input.expirationDate || null,
          foodUnit: input.foodUnit?.trim() || null,
          userId: context.userId,
          createdBy: context.userEmail
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
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

      // Log the action
      await this.logAction('created', 'item', item.id, item.name, context, {
        roomId: input.roomId,
        quantity: input.quantity
      })

      return this.success(item as any, 201)
    } catch (error) {
      console.error('Error creating item:', error)
      
      if (error instanceof ServiceError) throw error
      
      // Handle Prisma-specific errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return this.error('Invalid reference data provided', 400)
        }
      }
      
      return this.error('Failed to create item')
    }
  }

  /**
   * Update an existing item
   */
  async updateItem(id: string, input: ItemUpdateInput): Promise<ServiceResponse<ItemWithRelations>> {
    try {
      const context = await this.getContext()
      
      // Check if item exists
      const existingItem = await this.prisma.item.findFirst({
        where: { id, isActive: true }
      })

      if (!existingItem) {
        return this.error('Item not found', 404)
      }

      // Validate fields if provided
      if (input.name && !input.name.trim()) {
        return this.error('Item name cannot be empty', 400)
      }

      if (input.quantity !== undefined && input.quantity < 0) {
        return this.error('Quantity cannot be negative', 400)
      }

      // Verify room exists if being changed
      if (input.roomId && input.roomId !== existingItem.roomId) {
        const room = await this.prisma.room.findFirst({
          where: { id: input.roomId, isActive: true }
        })

        if (!room) {
          return this.error('Invalid room specified', 400)
        }
      }

      // Build update data
      const updateData: Prisma.ItemUpdateInput = {
        modifiedBy: context.userEmail,
        updatedAt: new Date()
      }

      // Map input fields to update data
      if (input.name !== undefined) {
        updateData.name = input.name?.trim()
      }
      if (input.description !== undefined) {
        updateData.description = input.description?.trim() || null
      }
      if (input.category !== undefined) {
        updateData.category = input.category?.trim() || null
      }
      if (input.quantity !== undefined) {
        updateData.quantity = input.quantity
      }
      if (input.value !== undefined) {
        updateData.value = input.value
      }
      if (input.condition !== undefined) {
        updateData.condition = input.condition?.trim() || null
      }
      if (input.location !== undefined) {
        updateData.location = input.location?.trim() || null
      }
      if (input.notes !== undefined) {
        updateData.notes = input.notes?.trim() || null
      }
      if (input.photoUrl !== undefined) {
        updateData.photoUrl = input.photoUrl?.trim() || null
      }
      if (input.serialNumber !== undefined) {
        updateData.serialNumber = input.serialNumber?.trim() || null
      }
      if (input.purchaseDate !== undefined) {
        updateData.purchaseDate = input.purchaseDate
      }
      if (input.roomId !== undefined) {
        updateData.room = { connect: { id: input.roomId } }
      }
      if (input.boxId !== undefined) {
        updateData.box = input.boxId ? { connect: { id: input.boxId } } : { disconnect: true }
      }
      if (input.storageType !== undefined) {
        updateData.storageType = input.storageType?.trim() || undefined
      }
      if (input.positionId !== undefined) {
        updateData.position = input.positionId ? { connect: { id: input.positionId } } : { disconnect: true }
      }
      if (input.isFood !== undefined) {
        updateData.isFood = input.isFood
      }
      if (input.foodCategory !== undefined) {
        updateData.foodCategory = input.foodCategory?.trim() || null
      }
      if (input.foodUnit !== undefined) {
        updateData.foodUnit = input.foodUnit?.trim() || null
      }
      if (input.expirationDate !== undefined) {
        updateData.expirationDate = input.expirationDate
      }

      // Update the item
      const item = await this.prisma.item.update({
        where: { id },
        data: updateData,
        include: {
          room: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
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

      // Log the action
      await this.logAction('updated', 'item', item.id, item.name, context, {
        changes: input
      })

      return this.success(item as any)
    } catch (error) {
      console.error('Error updating item:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to update item')
    }
  }

  /**
   * Soft delete an item
   */
  async deleteItem(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const context = await this.getContext()
      
      // Check if item exists and get its name for logging
      const existingItem = await this.prisma.item.findFirst({
        where: { id, isActive: true }
      })

      if (!existingItem) {
        return this.error('Item not found', 404)
      }

      // Soft delete the item
      await this.prisma.item.update({
        where: { id },
        data: {
          isActive: false,
          deletedBy: context.userEmail,
          updatedAt: new Date()
        }
      })

      // Log the action
      await this.logAction('deleted', 'item', id, existingItem.name, context)

      return this.success(true)
    } catch (error) {
      console.error('Error deleting item:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to delete item')
    }
  }

  /**
   * Move an item to a different room or storage location
   */
  async moveItem(
    id: string, 
    destination: { roomId?: string; boxId?: string; positionId?: string }
  ): Promise<ServiceResponse<ItemWithRelations>> {
    try {
      const context = await this.getContext()
      
      // Check if item exists
      const existingItem = await this.prisma.item.findFirst({
        where: { id, isActive: true }
      })

      if (!existingItem) {
        return this.error('Item not found', 404)
      }

      // Verify destination validity
      if (destination.roomId) {
        const room = await this.prisma.room.findFirst({
          where: { id: destination.roomId, isActive: true }
        })
        if (!room) {
          return this.error('Invalid destination room', 400)
        }
      }

      // Update the item location
      const item = await this.prisma.item.update({
        where: { id },
        data: {
          roomId: destination.roomId || existingItem.roomId,
          boxId: destination.boxId || null,
          positionId: destination.positionId || null,
          modifiedBy: context.userEmail,
          updatedAt: new Date()
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Log the action
      await this.logAction('moved', 'item', item.id, item.name, context, {
        destination
      })

      return this.success(item as any)
    } catch (error) {
      console.error('Error moving item:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to move item')
    }
  }
}

