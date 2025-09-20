
'use client'

import { useSession } from 'next-auth/react'
import { ReactNode } from 'react'
import { Permission, Role, RBACService } from '@/lib/rbac'

interface PermissionGateProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  role?: Role
  minRole?: Role
  requireAdmin?: boolean
  requireSuperAdmin?: boolean
  fallback?: ReactNode
  userId?: string
  resourceOwnerId?: string
  manageAllPermission?: Permission
}

/**
 * Permission-based conditional rendering component
 */
export function PermissionGate({
  children,
  permission,
  permissions = [],
  requireAll = false,
  role,
  minRole,
  requireAdmin = false,
  requireSuperAdmin = false,
  fallback = null,
  userId,
  resourceOwnerId,
  manageAllPermission
}: PermissionGateProps) {
  const { data: session } = useSession()
  const user = session?.user as any

  // Not authenticated
  if (!user) {
    return <>{fallback}</>
  }

  const userRole = (user.role || 'user') as Role
  const userPermissions = user.permissions as Permission[] | null
  const isAdmin = user.isAdmin || false

  // Check super admin requirement
  if (requireSuperAdmin) {
    if (!RBACService.isSuperAdmin(userRole)) {
      return <>{fallback}</>
    }
  }

  // Check admin requirement
  if (requireAdmin) {
    if (!RBACService.isAdmin(userRole, isAdmin)) {
      return <>{fallback}</>
    }
  }

  // Check specific role requirement
  if (role) {
    if (userRole !== role) {
      return <>{fallback}</>
    }
  }

  // Check minimum role requirement
  if (minRole) {
    if (RBACService.getRoleLevel(userRole) < RBACService.getRoleLevel(minRole)) {
      return <>{fallback}</>
    }
  }

  // Check resource ownership/management
  if (resourceOwnerId && manageAllPermission) {
    const currentUserId = userId || user.id
    if (!RBACService.canManageResource(
      userRole,
      userPermissions,
      currentUserId,
      resourceOwnerId,
      manageAllPermission
    )) {
      return <>{fallback}</>
    }
  }

  // Check single permission
  if (permission) {
    if (!RBACService.hasPermission(userRole, userPermissions, permission)) {
      return <>{fallback}</>
    }
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const hasPermission = requireAll
      ? RBACService.hasAllPermissions(userRole, userPermissions, permissions)
      : RBACService.hasAnyPermission(userRole, userPermissions, permissions)

    if (!hasPermission) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

/**
 * Hook for permission checking in components
 */
export function usePermissionCheck() {
  const { data: session } = useSession()
  const user = session?.user as any

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false
    const userRole = (user.role || 'user') as Role
    const userPermissions = user.permissions as Permission[] | null
    return RBACService.hasPermission(userRole, userPermissions, permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false
    const userRole = (user.role || 'user') as Role
    const userPermissions = user.permissions as Permission[] | null
    return RBACService.hasAnyPermission(userRole, userPermissions, permissions)
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!user) return false
    const userRole = (user.role || 'user') as Role
    const userPermissions = user.permissions as Permission[] | null
    return RBACService.hasAllPermissions(userRole, userPermissions, permissions)
  }

  const canManageResource = (resourceOwnerId: string, manageAllPermission: Permission): boolean => {
    if (!user) return false
    const userRole = (user.role || 'user') as Role
    const userPermissions = user.permissions as Permission[] | null
    return RBACService.canManageResource(
      userRole,
      userPermissions,
      user.id,
      resourceOwnerId,
      manageAllPermission
    )
  }

  const isAdmin = (): boolean => {
    if (!user) return false
    const userRole = (user.role || 'user') as Role
    const isAdminFlag = user.isAdmin || false
    return RBACService.isAdmin(userRole, isAdminFlag)
  }

  const isSuperAdmin = (): boolean => {
    if (!user) return false
    const userRole = (user.role || 'user') as Role
    return RBACService.isSuperAdmin(userRole)
  }

  const getRoleLevel = (): number => {
    if (!user) return 0
    const userRole = (user.role || 'user') as Role
    return RBACService.getRoleLevel(userRole)
  }

  const canAssignRole = (targetRole: Role): boolean => {
    if (!user) return false
    const userRole = (user.role || 'user') as Role
    return RBACService.canAssignRole(userRole, targetRole)
  }

  return {
    user: user || null,
    isAuthenticated: !!user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManageResource,
    isAdmin,
    isSuperAdmin,
    getRoleLevel,
    canAssignRole,
    role: user?.role || 'user',
    permissions: user?.permissions || []
  }
}

export default PermissionGate
