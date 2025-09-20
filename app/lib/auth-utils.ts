
/**
 * Authentication Utilities for RBAC System
 * Helper functions for server-side and client-side auth checks
 */

import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { authOptions } from './auth';
import { ExtendedUser, Permission, Role, RBACService } from './rbac';
import { prisma } from './db';

/**
 * Get user from API request headers (set by middleware)
 */
export async function getUserFromHeaders(): Promise<ExtendedUser | null> {
  try {
    const headersList = headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') as Role || 'user';
    const isAdmin = headersList.get('x-user-admin') === 'true';
    const userEmail = headersList.get('x-user-email');
    
    if (!userId) {
      return null;
    }

    // Get additional user data from database if needed
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        permissions: true
      }
    });

    if (!dbUser) {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || undefined,
      isAdmin: dbUser.isAdmin,
      role: dbUser.role as Role,
      permissions: dbUser.permissions as Permission[] | null
    };
  } catch (error) {
    console.error('Error getting user from headers:', error);
    return null;
  }
}

/**
 * Get authenticated user for server components
 */
export async function getAuthenticatedUser(): Promise<ExtendedUser | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return null;
    }

    // Fetch complete user data from database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        permissions: true
      }
    });

    if (!dbUser) {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || undefined,
      isAdmin: dbUser.isAdmin,
      role: dbUser.role as Role,
      permissions: dbUser.permissions as Permission[] | null
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Require authentication for API routes
 */
export async function requireAuth(): Promise<ExtendedUser> {
  const user = await getUserFromHeaders();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Require specific permission for API routes
 */
export async function requirePermission(permission: Permission): Promise<ExtendedUser> {
  const user = await requireAuth();
  
  if (!RBACService.hasPermission(user.role, user.permissions || null, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
  
  return user;
}

/**
 * Require admin access for API routes
 */
export async function requireAdmin(): Promise<ExtendedUser> {
  const user = await requireAuth();
  
  if (!RBACService.isAdmin(user.role, user.isAdmin)) {
    throw new Error('Admin access required');
  }
  
  return user;
}

/**
 * Require super admin access for API routes
 */
export async function requireSuperAdmin(): Promise<ExtendedUser> {
  const user = await requireAuth();
  
  if (!RBACService.isSuperAdmin(user.role)) {
    throw new Error('Super admin access required');
  }
  
  return user;
}

/**
 * Check if user can manage a resource (owns it or has manage_all permission)
 */
export async function requireResourceAccess(
  resourceOwnerId: string, 
  manageAllPermission: Permission
): Promise<ExtendedUser> {
  const user = await requireAuth();
  
  if (!RBACService.canManageResource(
    user.role, 
    user.permissions || null, 
    user.id, 
    resourceOwnerId, 
    manageAllPermission
  )) {
    throw new Error('Resource access denied');
  }
  
  return user;
}

/**
 * API Response helper for permission errors
 */
export function createPermissionDeniedResponse(message: string = 'Permission denied') {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * API Response helper for authentication errors
 */
export function createAuthRequiredResponse(message: string = 'Authentication required') {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Safe API handler wrapper with automatic error handling
 */
export function withAuth<T extends any[]>(
  handler: (user: ExtendedUser, ...args: T) => Promise<Response> | Response,
  options?: {
    requiredPermission?: Permission;
    requireAdmin?: boolean;
    requireSuperAdmin?: boolean;
  }
) {
  return async (...args: T): Promise<Response> => {
    try {
      let user: ExtendedUser;

      if (options?.requireSuperAdmin) {
        user = await requireSuperAdmin();
      } else if (options?.requireAdmin) {
        user = await requireAdmin();
      } else if (options?.requiredPermission) {
        user = await requirePermission(options.requiredPermission);
      } else {
        user = await requireAuth();
      }

      return await handler(user, ...args);
    } catch (error: any) {
      console.error('Auth wrapper error:', error);
      
      if (error.message.includes('Authentication required')) {
        return createAuthRequiredResponse(error.message);
      }
      
      if (error.message.includes('Permission denied') || 
          error.message.includes('access required') ||
          error.message.includes('access denied')) {
        return createPermissionDeniedResponse(error.message);
      }
      
      // Other errors
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

export default {
  getUserFromHeaders,
  getAuthenticatedUser,
  requireAuth,
  requirePermission,
  requireAdmin,
  requireSuperAdmin,
  requireResourceAccess,
  createPermissionDeniedResponse,
  createAuthRequiredResponse,
  withAuth
};
