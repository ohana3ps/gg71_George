
/**
 * Role-Based Access Control (RBAC) System
 * Comprehensive permissions and role management
 */

export type Permission = 
  // Room Management
  | 'rooms:create' 
  | 'rooms:read' 
  | 'rooms:update' 
  | 'rooms:delete'
  | 'rooms:manage_all'
  
  // Item Management
  | 'items:create' 
  | 'items:read' 
  | 'items:update' 
  | 'items:delete'
  | 'items:checkout'
  | 'items:manage_all'
  
  // Inventory Management
  | 'inventory:view'
  | 'inventory:export'
  | 'inventory:analytics'
  | 'inventory:manage_expiration'
  
  // User Management (Admin only)
  | 'users:create'
  | 'users:read'
  | 'users:update' 
  | 'users:delete'
  | 'users:manage_roles'
  
  // System Management (Admin only)
  | 'system:settings'
  | 'system:backup'
  | 'system:logs'
  | 'system:maintenance'
  
  // Recipe System
  | 'recipes:create'
  | 'recipes:read'
  | 'recipes:update'
  | 'recipes:delete'
  
  // Scanning & OCR
  | 'scanning:use'
  | 'scanning:manage';

export type Role = 'super_admin' | 'admin' | 'manager' | 'user' | 'viewer';

// Permission sets for each role
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    // Full access to everything
    'rooms:create', 'rooms:read', 'rooms:update', 'rooms:delete', 'rooms:manage_all',
    'items:create', 'items:read', 'items:update', 'items:delete', 'items:checkout', 'items:manage_all',
    'inventory:view', 'inventory:export', 'inventory:analytics', 'inventory:manage_expiration',
    'users:create', 'users:read', 'users:update', 'users:delete', 'users:manage_roles',
    'system:settings', 'system:backup', 'system:logs', 'system:maintenance',
    'recipes:create', 'recipes:read', 'recipes:update', 'recipes:delete',
    'scanning:use', 'scanning:manage'
  ],
  
  admin: [
    // Full content management, limited system access
    'rooms:create', 'rooms:read', 'rooms:update', 'rooms:delete', 'rooms:manage_all',
    'items:create', 'items:read', 'items:update', 'items:delete', 'items:checkout', 'items:manage_all',
    'inventory:view', 'inventory:export', 'inventory:analytics', 'inventory:manage_expiration',
    'users:read', 'users:update', // Can view and edit users but not create/delete
    'recipes:create', 'recipes:read', 'recipes:update', 'recipes:delete',
    'scanning:use', 'scanning:manage'
  ],
  
  manager: [
    // Can manage rooms and items they own, plus team inventory
    'rooms:create', 'rooms:read', 'rooms:update', 'rooms:delete',
    'items:create', 'items:read', 'items:update', 'items:delete', 'items:checkout',
    'inventory:view', 'inventory:export', 'inventory:analytics', 'inventory:manage_expiration',
    'recipes:create', 'recipes:read', 'recipes:update', 'recipes:delete',
    'scanning:use'
  ],
  
  user: [
    // Shared household user - can manage all household content
    'rooms:create', 'rooms:read', 'rooms:update', 'rooms:delete',
    'items:create', 'items:read', 'items:update', 'items:delete', 'items:checkout',
    'inventory:view', 'inventory:export',
    'recipes:create', 'recipes:read', 'recipes:update', 'recipes:delete',
    'scanning:use'
  ],
  
  viewer: [
    // Read-only access
    'rooms:read',
    'items:read',
    'inventory:view',
    'recipes:read'
  ]
};

// Helper functions for permission checking
export class RBACService {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(userRole: Role, userPermissions: Permission[] | null, permission: Permission): boolean {
    // First check role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    if (rolePermissions.includes(permission)) {
      return true;
    }
    
    // Then check custom user permissions
    if (userPermissions && userPermissions.includes(permission)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a user has any of the specified permissions
   */
  static hasAnyPermission(userRole: Role, userPermissions: Permission[] | null, permissions: Permission[]): boolean {
    return permissions.some(permission => 
      this.hasPermission(userRole, userPermissions, permission)
    );
  }
  
  /**
   * Check if a user has all of the specified permissions
   */
  static hasAllPermissions(userRole: Role, userPermissions: Permission[] | null, permissions: Permission[]): boolean {
    return permissions.every(permission => 
      this.hasPermission(userRole, userPermissions, permission)
    );
  }
  
  /**
   * Get all permissions for a user (role + custom permissions)
   */
  static getUserPermissions(userRole: Role, userPermissions: Permission[] | null): Permission[] {
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    const customPermissions = userPermissions || [];
    
    // Combine and deduplicate
    return Array.from(new Set([...rolePermissions, ...customPermissions]));
  }
  
  /**
   * Check if user can manage resource (owns it or has manage_all permission)
   */
  static canManageResource(
    userRole: Role, 
    userPermissions: Permission[] | null, 
    userId: string, 
    resourceOwnerId: string, 
    manageAllPermission: Permission
  ): boolean {
    // Owners can always manage their own resources
    if (userId === resourceOwnerId) {
      return true;
    }
    
    // Check for manage_all permission
    return this.hasPermission(userRole, userPermissions, manageAllPermission);
  }
  
  /**
   * Check if user is admin (admin, super_admin, or has admin flag)
   */
  static isAdmin(userRole: Role, isAdminFlag: boolean): boolean {
    return isAdminFlag || userRole === 'admin' || userRole === 'super_admin';
  }
  
  /**
   * Check if user is super admin
   */
  static isSuperAdmin(userRole: Role): boolean {
    return userRole === 'super_admin';
  }
  
  /**
   * Validate role assignment (who can assign what roles)
   */
  static canAssignRole(assignerRole: Role, targetRole: Role): boolean {
    // Super admins can assign any role
    if (assignerRole === 'super_admin') {
      return true;
    }
    
    // Admins can assign user, manager, viewer (but not admin or super_admin)
    if (assignerRole === 'admin') {
      return ['user', 'manager', 'viewer'].includes(targetRole);
    }
    
    // Others cannot assign roles
    return false;
  }
  
  /**
   * Get role hierarchy level (higher number = more permissions)
   */
  static getRoleLevel(role: Role): number {
    const levels: Record<Role, number> = {
      'viewer': 1,
      'user': 2,
      'manager': 3,
      'admin': 4,
      'super_admin': 5
    };
    return levels[role] || 0;
  }
  
  /**
   * Check if role A is higher than role B
   */
  static isRoleHigher(roleA: Role, roleB: Role): boolean {
    return this.getRoleLevel(roleA) > this.getRoleLevel(roleB);
  }
}

// Type guards for NextAuth session
export interface ExtendedUser {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
  role: Role;
  permissions?: Permission[] | null;
}

export interface ExtendedSession {
  user: ExtendedUser;
}

// Permission check hook for React components
export const usePermissions = () => {
  return {
    hasPermission: (user: ExtendedUser | null, permission: Permission): boolean => {
      if (!user) return false;
      return RBACService.hasPermission(user.role, user.permissions || null, permission);
    },
    
    hasAnyPermission: (user: ExtendedUser | null, permissions: Permission[]): boolean => {
      if (!user) return false;
      return RBACService.hasAnyPermission(user.role, user.permissions || null, permissions);
    },
    
    canManageResource: (user: ExtendedUser | null, resourceOwnerId: string, manageAllPermission: Permission): boolean => {
      if (!user) return false;
      return RBACService.canManageResource(user.role, user.permissions || null, user.id, resourceOwnerId, manageAllPermission);
    },
    
    isAdmin: (user: ExtendedUser | null): boolean => {
      if (!user) return false;
      return RBACService.isAdmin(user.role, user.isAdmin);
    },
    
    isSuperAdmin: (user: ExtendedUser | null): boolean => {
      if (!user) return false;
      return RBACService.isSuperAdmin(user.role);
    }
  };
};

// Middleware helper for API route protection
export const requirePermission = (permission: Permission) => {
  return (user: ExtendedUser | null): boolean => {
    if (!user) return false;
    return RBACService.hasPermission(user.role, user.permissions || null, permission);
  };
};

// Decorator for API route permission checking
export const withPermission = (permission: Permission, handler: any) => {
  return async (req: any, res: any) => {
    // This will be implemented in the middleware
    const user = req.user; // Assume user is attached by middleware
    
    if (!user || !RBACService.hasPermission(user.role, user.permissions || null, permission)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }), 
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return handler(req, res);
  };
};

export default RBACService;
