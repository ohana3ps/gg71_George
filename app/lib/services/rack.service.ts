

import { Rack, Prisma } from '@prisma/client'
import { BaseService, ServiceResponse, BaseQueryOptions, ServiceError } from './base.service'

export interface RackCreateInput {
  name: string
  rackNumber: number
  roomId: string
}

export interface RackUpdateInput {
  name?: string
  rackNumber?: number
  roomId?: string
}

export interface RackQueryOptions extends BaseQueryOptions {
  roomId?: string
  includePositions?: boolean
  includeRoom?: boolean
  includeUser?: boolean
}

export type RackWithRelations = Rack & {
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
  positions?: {
    id: string
    shelfNumber: number
    positionNumber: number
    isOccupied: boolean
  }[]
  _count?: {
    positions: number
  }
}

/**
 * Rack Service
 * Handles all rack-related business logic
 */
export class RackService extends BaseService {

  /**
   * Get all racks with shared household visibility
   */
  async getAllRacks(options: RackQueryOptions = {}): Promise<ServiceResponse<RackWithRelations[]>> {
    try {
      const context = await this.getContext()
      
      // Build where clause
      const where: Prisma.RackWhereInput = {
        isActive: options.includeInactive ? undefined : true
      }

      if (options.roomId) {
        where.roomId = options.roomId
      }

      // Build include clause
      const include: Prisma.RackInclude = {
        _count: {
          select: {
            positions: true
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

      if (options.includePositions) {
        include.positions = {
          select: {
            id: true,
            shelfNumber: true,
            positionNumber: true,
            isOccupied: true
          },
          orderBy: [
            { shelfNumber: 'asc' },
            { positionNumber: 'asc' }
          ]
        }
      }

      const racks = await this.prisma.rack.findMany({
        where,
        include,
        orderBy: options.orderBy || { rackNumber: 'asc' },
        ...this.getPaginationParams(options)
      })

      return this.success(racks)
    } catch (error) {
      console.error('Error fetching racks:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to fetch racks')
    }
  }

  /**
   * Get a single rack by ID
   */
  async getRackById(id: string, options: RackQueryOptions = {}): Promise<ServiceResponse<RackWithRelations | null>> {
    try {
      const context = await this.getContext()
      
      // Build include clause
      const include: Prisma.RackInclude = {
        _count: {
          select: {
            positions: true
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

      if (options.includePositions) {
        include.positions = {
          select: {
            id: true,
            shelfNumber: true,
            positionNumber: true,
            isOccupied: true
          },
          orderBy: [
            { shelfNumber: 'asc' },
            { positionNumber: 'asc' }
          ]
        }
      }

      const rack = await this.prisma.rack.findFirst({
        where: {
          id,
          isActive: options.includeInactive ? undefined : true
        },
        include
      })

      if (!rack) {
        return this.error('Rack not found', 404)
      }

      return this.success(rack)
    } catch (error) {
      console.error('Error fetching rack:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to fetch rack')
    }
  }

  /**
   * Create a new rack
   */
  async createRack(input: RackCreateInput): Promise<ServiceResponse<RackWithRelations>> {
    try {
      const context = await this.getContext()
      
      // Validate required fields
      if (!input.name?.trim()) {
        return this.error('Rack name is required', 400)
      }

      if (!input.roomId) {
        return this.error('Room ID is required', 400)
      }

      if (input.rackNumber === undefined || input.rackNumber < 1) {
        return this.error('Valid rack number is required', 400)
      }

      // Verify room exists
      const room = await this.prisma.room.findFirst({
        where: { id: input.roomId, isActive: true }
      })

      if (!room) {
        return this.error('Invalid room specified', 400)
      }

      // Check for duplicate rack numbers in the same room
      const existing = await this.prisma.rack.findFirst({
        where: {
          rackNumber: input.rackNumber,
          roomId: input.roomId,
          isActive: true
        }
      })

      if (existing) {
        return this.error('Rack number already exists in this room', 400)
      }

      // Create the rack
      const rack = await this.prisma.rack.create({
        data: {
          name: input.name.trim(),
          rackNumber: input.rackNumber,
          roomId: input.roomId,
          userId: context.userId,
          createdBy: context.userEmail
        },
        include: {
          _count: {
            select: {
              positions: true
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
      await this.logAction('created', 'rack', rack.id, rack.name, context)

      return this.success(rack, 201)
    } catch (error) {
      console.error('Error creating rack:', error)
      
      if (error instanceof ServiceError) throw error
      
      // Handle Prisma-specific errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return this.error('Rack number already exists in this room', 400)
        } else if (error.code === 'P2003') {
          return this.error('Invalid room reference', 400)
        }
      }
      
      return this.error('Failed to create rack')
    }
  }

  /**
   * Update an existing rack
   */
  async updateRack(id: string, input: RackUpdateInput): Promise<ServiceResponse<RackWithRelations>> {
    try {
      const context = await this.getContext()
      
      // Check if rack exists
      const existingRack = await this.prisma.rack.findFirst({
        where: { id, isActive: true }
      })

      if (!existingRack) {
        return this.error('Rack not found', 404)
      }

      // Validate fields if provided
      if (input.name && !input.name.trim()) {
        return this.error('Rack name cannot be empty', 400)
      }

      if (input.rackNumber !== undefined && input.rackNumber < 1) {
        return this.error('Rack number must be greater than 0', 400)
      }

      // Check for duplicate rack numbers if rack number is being changed
      if (input.rackNumber && input.rackNumber !== existingRack.rackNumber) {
        const roomId = input.roomId || existingRack.roomId
        const duplicate = await this.prisma.rack.findFirst({
          where: {
            rackNumber: input.rackNumber,
            roomId: roomId,
            isActive: true,
            id: { not: id }
          }
        })

        if (duplicate) {
          return this.error('Rack number already exists in this room', 400)
        }
      }

      // Verify room exists if being changed
      if (input.roomId && input.roomId !== existingRack.roomId) {
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

      if (input.name !== undefined) {
        updateData.name = input.name.trim()
      }
      if (input.rackNumber !== undefined) {
        updateData.rackNumber = input.rackNumber
      }
      if (input.roomId !== undefined) {
        updateData.roomId = input.roomId
      }

      // Update the rack
      const rack = await this.prisma.rack.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              positions: true
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
      await this.logAction('updated', 'rack', rack.id, rack.name, context, {
        changes: input
      })

      return this.success(rack)
    } catch (error) {
      console.error('Error updating rack:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to update rack')
    }
  }

  /**
   * Soft delete a rack
   */
  async deleteRack(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const context = await this.getContext()
      
      // Check if rack exists and get its name for logging
      const existingRack = await this.prisma.rack.findFirst({
        where: { id, isActive: true },
        include: {
          positions: {
            where: { isOccupied: true }
          }
        }
      })

      if (!existingRack) {
        return this.error('Rack not found', 404)
      }

      // Check if rack has occupied positions
      if (existingRack.positions.length > 0) {
        return this.error('Cannot delete rack with occupied positions', 400)
      }

      // Soft delete the rack
      await this.prisma.rack.update({
        where: { id },
        data: {
          isActive: false,
          deletedBy: context.userEmail,
          updatedAt: new Date()
        }
      })

      // Log the action
      await this.logAction('deleted', 'rack', id, existingRack.name, context)

      return this.success(true)
    } catch (error) {
      console.error('Error deleting rack:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to delete rack')
    }
  }

  /**
   * Get the next available rack number for a room
   */
  async getNextRackNumber(roomId: string): Promise<ServiceResponse<number>> {
    try {
      const context = await this.getContext()
      
      // Verify room exists
      const room = await this.prisma.room.findFirst({
        where: { id: roomId, isActive: true }
      })

      if (!room) {
        return this.error('Room not found', 404)
      }

      // Get all rack numbers in this room
      const allRacks = await this.prisma.rack.findMany({
        where: { 
          roomId,
          isActive: true
        },
        select: { rackNumber: true }
      })

      const existingNumbers = allRacks.map(rack => rack.rackNumber).sort((a, b) => a - b)
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
      console.error('Error getting next rack number:', error)
      if (error instanceof ServiceError) throw error
      return this.error('Failed to get next rack number')
    }
  }
}

