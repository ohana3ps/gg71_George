

import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface ServiceContext {
  userId: string
  userEmail: string
  isAdmin: boolean
}

export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface BaseQueryOptions extends PaginationOptions {
  includeInactive?: boolean
  orderBy?: Record<string, 'asc' | 'desc'>
}

/**
 * Base Service Class
 * Provides common functionality for all services including:
 * - Authentication context
 * - Error handling
 * - Pagination
 * - Audit logging
 */
export abstract class BaseService {
  protected prisma = prisma

  /**
   * Get authenticated user context from session
   */
  protected async getContext(): Promise<ServiceContext> {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      throw new ServiceError('Unauthorized', 401)
    }

    return {
      userId: session.user.id,
      userEmail: session.user.email || '',
      isAdmin: session.user.role === 'admin' || false
    }
  }

  /**
   * Create a successful response
   */
  protected success<T>(data: T, status = 200): ServiceResponse<T> {
    return { success: true, data, status }
  }

  /**
   * Create an error response
   */
  protected error(message: string, status = 500): ServiceResponse<never> {
    return { success: false, error: message, status }
  }

  /**
   * Apply pagination to Prisma query
   */
  protected getPaginationParams(options: PaginationOptions) {
    const page = options.page || 1
    const limit = Math.min(options.limit || 50, 100) // Max 100 items per page
    
    return {
      skip: (page - 1) * limit,
      take: limit
    }
  }

  /**
   * Log an action for audit trail
   */
  protected async logAction(
    action: string,
    entityType: string,
    entityId: string,
    entityName: string,
    context: ServiceContext,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      // We'll implement comprehensive audit logging here
      // For now, just console log for development
      console.log(`AUDIT: ${action} ${entityType} ${entityName} by ${context.userEmail}`, {
        entityId,
        details,
        timestamp: new Date().toISOString()
      })
      
      // TODO: Implement proper audit log storage in Phase 2B
    } catch (error) {
      console.error('Failed to log action:', error)
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }
}

/**
 * Custom Service Error Class
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

/**
 * Service Response Handler Utility
 */
export class ServiceResponseHandler {
  static toResponse<T>(result: ServiceResponse<T>) {
    if (result.success) {
      return Response.json(result.data, { status: result.status || 200 })
    } else {
      return Response.json({ error: result.error }, { status: result.status || 500 })
    }
  }

  static async handleServiceCall<T>(
    serviceCall: () => Promise<ServiceResponse<T>>
  ) {
    try {
      const result = await serviceCall()
      return ServiceResponseHandler.toResponse(result)
    } catch (error) {
      console.error('Service call failed:', error)
      
      if (error instanceof ServiceError) {
        return Response.json({ error: error.message }, { status: error.status })
      }
      
      return Response.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }
}

