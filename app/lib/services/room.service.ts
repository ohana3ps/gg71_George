

import { Room, Prisma } from '@prisma/client'
import { BaseService, ServiceResponse, BaseQueryOptions, ServiceError } from './base.service'

export interface RoomCreateInput {
  name: string
  description?: string
  color: string
}

export interface RoomUpdateInput {
  name?: string
  description?: string
  color?: string
}

export interface RoomQueryOptions extends BaseQueryOptions {
  includeCounts?: boolean
  includeUser?: boolean
}

export type RoomWithCounts = Room & {
  _count: {
    items: number
    racks: number
  }
  user?: {
    id: string
    name: string | null
    email: string
  }
}

/**
 * Room Service
 * Handles all room-related business logic
 */
export class RoomService extends BaseService {

  /**
   * Get all rooms with shared household visibility
   */
  async getAllRooms(options: RoomQueryOptions = {}): Promise<ServiceResponse<RoomWithCounts[]>> {
    try {
      const context = await this.getContext()
      
      const include: Prisma.RoomInclude = {}
      
      if (options.includeCounts !== false) {
        include._count = {
          select: {
            items: { where: { isActive: true } },
            racks: true
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

      const rooms = await this.prisma.room.findMany({
        where: {
          isActive: options.includeInactive ? undefined : true
        },
        include,
        orderBy: options.orderBy || { createdAt: 'desc' },
        ...this.getPaginationParams(options)
      })

      return this.success(rooms as RoomWithCounts[])
    } catch (error) {
      console.error('Error fetching rooms:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to fetch rooms')
    }
  }

  /**
   * Get a single room by ID
   */
  async getRoomById(id: string, options: RoomQueryOptions = {}): Promise<ServiceResponse<RoomWithCounts | null>> {
    try {
      const context = await this.getContext()
      
      const include: Prisma.RoomInclude = {}
      
      if (options.includeCounts !== false) {
        include._count = {
          select: {
            items: { where: { isActive: true } },
            racks: true
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

      const room = await this.prisma.room.findFirst({
        where: {
          id,
          isActive: options.includeInactive ? undefined : true
        },
        include
      })

      if (!room) {
        return this.error('Room not found', 404)
      }

      return this.success(room as RoomWithCounts)
    } catch (error) {
      console.error('Error fetching room:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to fetch room')
    }
  }

  /**
   * Create a new room
   */
  async createRoom(input: RoomCreateInput): Promise<ServiceResponse<RoomWithCounts>> {
    try {
      const context = await this.getContext()
      
      // Validate input
      if (!input.name?.trim()) {
        return this.error('Room name is required', 400)
      }

      // Check for duplicate names
      const existing = await this.prisma.room.findFirst({
        where: {
          name: input.name.trim(),
          isActive: true
        }
      })

      if (existing) {
        return this.error('Room name already exists', 400)
      }

      // Create the room
      const room = await this.prisma.room.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          color: input.color,
          userId: context.userId,
          createdBy: context.userEmail
        },
        include: {
          _count: {
            select: {
              items: { where: { isActive: true } },
              racks: true
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
      await this.logAction('created', 'room', room.id, room.name, context)

      return this.success(room as RoomWithCounts, 201)
    } catch (error) {
      console.error('Error creating room:', error)
      
      if (error instanceof ServiceError) throw error
      
      // Handle Prisma-specific errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return this.error('Room name already exists', 400)
        } else if (error.code === 'P2003') {
          return this.error('Authentication error. Please sign out and sign in again.', 401)
        }
      }
      
      return this.error('Failed to create room')
    }
  }

  /**
   * Update an existing room
   */
  async updateRoom(id: string, input: RoomUpdateInput): Promise<ServiceResponse<RoomWithCounts>> {
    try {
      const context = await this.getContext()
      
      // Check if room exists
      const existingRoom = await this.prisma.room.findFirst({
        where: { id, isActive: true }
      })

      if (!existingRoom) {
        return this.error('Room not found', 404)
      }

      // Validate name uniqueness if name is being changed
      if (input.name && input.name.trim() !== existingRoom.name) {
        const duplicate = await this.prisma.room.findFirst({
          where: {
            name: input.name.trim(),
            isActive: true,
            id: { not: id }
          }
        })

        if (duplicate) {
          return this.error('Room name already exists', 400)
        }
      }

      // Update the room
      const room = await this.prisma.room.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name.trim() }),
          ...(input.description !== undefined && { description: input.description?.trim() || null }),
          ...(input.color && { color: input.color }),
          modifiedBy: context.userEmail,
          updatedAt: new Date()
        },
        include: {
          _count: {
            select: {
              items: { where: { isActive: true } },
              racks: true
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
      await this.logAction('updated', 'room', room.id, room.name, context, {
        changes: input
      })

      return this.success(room as RoomWithCounts)
    } catch (error) {
      console.error('Error updating room:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to update room')
    }
  }

  /**
   * Soft delete a room
   */
  async deleteRoom(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const context = await this.getContext()
      
      // Check if room exists and get its name for logging
      const existingRoom = await this.prisma.room.findFirst({
        where: { id, isActive: true }
      })

      if (!existingRoom) {
        return this.error('Room not found', 404)
      }

      // Check if room has active items
      const activeItemsCount = await this.prisma.item.count({
        where: { roomId: id, isActive: true }
      })

      if (activeItemsCount > 0) {
        return this.error('Cannot delete room with active items', 400)
      }

      // Soft delete the room
      await this.prisma.room.update({
        where: { id },
        data: {
          isActive: false,
          deletedBy: context.userEmail,
          updatedAt: new Date()
        }
      })

      // Log the action
      await this.logAction('deleted', 'room', id, existingRoom.name, context)

      return this.success(true)
    } catch (error) {
      console.error('Error deleting room:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to delete room')
    }
  }
}

