

import { Box, Prisma } from '@prisma/client'
import { BaseService, ServiceResponse, BaseQueryOptions, ServiceError } from './base.service'

export interface BoxCreateInput {
  boxNumber: number
  name?: string
  size: string
  roomId: string
  isStaging?: boolean
}

export interface BoxUpdateInput {
  boxNumber?: number
  name?: string
  size?: string
  roomId?: string
  isStaging?: boolean
}

export interface BoxQueryOptions extends BaseQueryOptions {
  roomId?: string
  staging?: boolean
  includeItems?: boolean
  includePosition?: boolean
  includeRoom?: boolean
  includeUser?: boolean
}

export type BoxWithRelations = Box & {
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
  items?: {
    id: string
    name: string
    quantity: number
    isActive: boolean
  }[]
  _count?: {
    items: number
  }
  positions?: {
    position: {
      id: string
      shelfNumber: number
      positionNumber: number
      rack: {
        id: string
        name: string
        rackNumber: number
      }
    }
  }[]
}

/**
 * Box Service
 * Handles all box-related business logic
 */
export class BoxService extends BaseService {

  /**
   * Get all boxes with shared household visibility
   */
  async getAllBoxes(options: BoxQueryOptions = {}): Promise<ServiceResponse<BoxWithRelations[]>> {
    try {
      const context = await this.getContext()
      
      // Build where clause
      const where: Prisma.BoxWhereInput = {
        isActive: options.includeInactive ? undefined : true
      }

      if (options.roomId) {
        where.roomId = options.roomId
      }

      if (options.staging !== undefined) {
        where.isStaging = options.staging
      }

      // Build include clause
      const include: Prisma.BoxInclude = {
        _count: {
          select: {
            items: { where: { isActive: true } }
          }
        }
      }

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

      if (options.includeItems) {
        include.items = {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            quantity: true,
            isActive: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }

      if (options.includePosition) {
        include.positions = {
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

      const boxes = await this.prisma.box.findMany({
        where,
        include,
        orderBy: options.orderBy || { boxNumber: 'asc' },
        ...this.getPaginationParams(options)
      })

      return this.success(boxes as any)
    } catch (error) {
      console.error('Error fetching boxes:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to fetch boxes')
    }
  }

  /**
   * Get a single box by ID
   */
  async getBoxById(id: string, options: BoxQueryOptions = {}): Promise<ServiceResponse<BoxWithRelations | null>> {
    try {
      const context = await this.getContext()
      
      // Build include clause
      const include: Prisma.BoxInclude = {
        _count: {
          select: {
            items: { where: { isActive: true } }
          }
        },
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

      if (options.includeItems) {
        include.items = {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            quantity: true,
            isActive: true,
            category: true,
            photoUrl: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }

      const box = await this.prisma.box.findFirst({
        where: {
          id,
          isActive: options.includeInactive ? undefined : true
        },
        include
      })

      if (!box) {
        return this.error('Box not found', 404)
      }

      return this.success(box as any)
    } catch (error) {
      console.error('Error fetching box:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to fetch box')
    }
  }

  /**
   * Create a new box
   */
  async createBox(input: BoxCreateInput): Promise<ServiceResponse<BoxWithRelations>> {
    try {
      const context = await this.getContext()
      
      // Validate required fields
      if (!input.size?.trim()) {
        return this.error('Box size is required', 400)
      }

      if (!input.roomId) {
        return this.error('Room ID is required', 400)
      }

      if (input.boxNumber === undefined || input.boxNumber < 1) {
        return this.error('Valid box number is required', 400)
      }

      // Verify room exists
      const room = await this.prisma.room.findFirst({
        where: { id: input.roomId, isActive: true }
      })

      if (!room) {
        return this.error('Invalid room specified', 400)
      }

      // Check for duplicate box numbers in the same room
      const existing = await this.prisma.box.findFirst({
        where: {
          boxNumber: input.boxNumber,
          roomId: input.roomId,
          isActive: true
        }
      })

      if (existing) {
        return this.error('Box number already exists in this room', 400)
      }

      // Create the box
      const box = await this.prisma.box.create({
        data: {
          boxNumber: input.boxNumber,
          name: input.name?.trim() || null,
          size: input.size.trim(),
          roomId: input.roomId,
          isStaging: input.isStaging || false,
          userId: context.userId,
          createdBy: context.userEmail
        },
        include: {
          _count: {
            select: {
              items: { where: { isActive: true } }
            }
          },
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
      await this.logAction('created', 'box', box.id, `Box ${box.boxNumber}${box.name ? ` - ${box.name}` : ''}`, context)

      return this.success(box as any, 201)
    } catch (error) {
      console.error('Error creating box:', error)
      
      if (error instanceof ServiceError) throw error
      
      // Handle Prisma-specific errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return this.error('Box number already exists in this room', 400)
        } else if (error.code === 'P2003') {
          return this.error('Invalid room reference', 400)
        }
      }
      
      return this.error('Failed to create box')
    }
  }

  /**
   * Update an existing box
   */
  async updateBox(id: string, input: BoxUpdateInput): Promise<ServiceResponse<BoxWithRelations>> {
    try {
      const context = await this.getContext()
      
      // Check if box exists
      const existingBox = await this.prisma.box.findFirst({
        where: { id, isActive: true }
      })

      if (!existingBox) {
        return this.error('Box not found', 404)
      }

      // Validate fields if provided
      if (input.size && !input.size.trim()) {
        return this.error('Box size cannot be empty', 400)
      }

      if (input.boxNumber !== undefined && input.boxNumber < 1) {
        return this.error('Box number must be greater than 0', 400)
      }

      // Check for duplicate box numbers if box number is being changed
      if (input.boxNumber && input.boxNumber !== existingBox.boxNumber) {
        const roomId = input.roomId || existingBox.roomId
        const duplicate = await this.prisma.box.findFirst({
          where: {
            boxNumber: input.boxNumber,
            roomId: roomId,
            isActive: true,
            id: { not: id }
          }
        })

        if (duplicate) {
          return this.error('Box number already exists in this room', 400)
        }
      }

      // Verify room exists if being changed
      if (input.roomId && input.roomId !== existingBox.roomId) {
        const room = await this.prisma.room.findFirst({
          where: { id: input.roomId, isActive: true }
        })

        if (!room) {
          return this.error('Invalid room specified', 400)
        }
      }

      // Build update data
      const updateData: any = {
        modifiedBy: context.userEmail,
        updatedAt: new Date()
      }

      if (input.boxNumber !== undefined) {
        updateData.boxNumber = input.boxNumber
      }
      if (input.name !== undefined) {
        updateData.name = input.name?.trim() || null
      }
      if (input.size !== undefined) {
        updateData.size = input.size.trim()
      }
      if (input.roomId !== undefined) {
        updateData.roomId = input.roomId
      }
      if (input.isStaging !== undefined) {
        updateData.isStaging = input.isStaging
      }

      // Update the box
      const box = await this.prisma.box.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              items: { where: { isActive: true } }
            }
          },
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
      await this.logAction('updated', 'box', box.id, `Box ${box.boxNumber}${box.name ? ` - ${box.name}` : ''}`, context, {
        changes: input
      })

      return this.success(box as any)
    } catch (error) {
      console.error('Error updating box:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to update box')
    }
  }

  /**
   * Soft delete a box
   */
  async deleteBox(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const context = await this.getContext()
      
      // Check if box exists and get its name for logging
      const existingBox = await this.prisma.box.findFirst({
        where: { id, isActive: true },
        include: {
          _count: {
            select: {
              items: { where: { isActive: true } }
            }
          }
        }
      })

      if (!existingBox) {
        return this.error('Box not found', 404)
      }

      // Check if box has active items
      if (existingBox._count.items > 0) {
        return this.error('Cannot delete box with active items', 400)
      }

      // Soft delete the box
      await this.prisma.box.update({
        where: { id },
        data: {
          isActive: false,
          deletedBy: context.userEmail,
          updatedAt: new Date()
        }
      })

      // Log the action
      await this.logAction('deleted', 'box', id, `Box ${existingBox.boxNumber}${existingBox.name ? ` - ${existingBox.name}` : ''}`, context)

      return this.success(true)
    } catch (error) {
      console.error('Error deleting box:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to delete box')
    }
  }

  /**
   * Get the next available box number for a room
   */
  async getNextBoxNumber(roomId: string): Promise<ServiceResponse<number>> {
    try {
      const context = await this.getContext()
      
      // Verify room exists
      const room = await this.prisma.room.findFirst({
        where: { id: roomId, isActive: true }
      })

      if (!room) {
        return this.error('Room not found', 404)
      }

      // Get all box numbers in this room
      const allBoxes = await this.prisma.box.findMany({
        where: { 
          roomId,
          isActive: true
        },
        select: { boxNumber: true }
      })

      const existingNumbers = allBoxes.map(box => box.boxNumber).sort((a, b) => a - b)
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

      return this.success(nextAvailable)
    } catch (error) {
      console.error('Error getting next box number:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to get next box number')
    }
  }
}

