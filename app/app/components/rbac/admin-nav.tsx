
'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PermissionGate, usePermissionCheck } from '@/components/rbac/permission-gate'
import { RoleBadge } from '@/components/rbac/role-badge'
import { Shield, Settings, Users, Database } from 'lucide-react'

interface AdminNavProps {
  className?: string
}

export function AdminNav({ className = '' }: AdminNavProps) {
  const { data: session } = useSession()
  const { isAdmin } = usePermissionCheck()

  if (!isAdmin()) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Link href="/admin">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2 bg-red-50 hover:bg-red-100 border-red-200"
        >
          <Shield className="h-4 w-4 text-red-600" />
          <span className="text-red-700 font-medium hidden sm:inline">Admin</span>
        </Button>
      </Link>
      
      <RoleBadge role={(session?.user as any)?.role || 'user'} size="sm" />
    </div>
  )
}

interface AdminQuickActionsProps {
  className?: string
}

export function AdminQuickActions({ className = '' }: AdminQuickActionsProps) {
  const { isAdmin, isSuperAdmin } = usePermissionCheck()

  if (!isAdmin()) {
    return null
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <PermissionGate permission="users:read">
        <Link href="/admin?tab=users">
          <Button variant="outline" className="w-full h-16 flex flex-col justify-center">
            <Users className="h-6 w-6 mb-1" />
            <span className="text-sm">Users</span>
          </Button>
        </Link>
      </PermissionGate>

      <PermissionGate permission="system:settings">
        <Link href="/admin?tab=system">
          <Button variant="outline" className="w-full h-16 flex flex-col justify-center">
            <Settings className="h-6 w-6 mb-1" />
            <span className="text-sm">Settings</span>
          </Button>
        </Link>
      </PermissionGate>

      <PermissionGate requireSuperAdmin>
        <Link href="/admin?tab=system">
          <Button variant="outline" className="w-full h-16 flex flex-col justify-center">
            <Database className="h-6 w-6 mb-1" />
            <span className="text-sm">Database</span>
          </Button>
        </Link>
      </PermissionGate>

      <PermissionGate permission="inventory:analytics">
        <Link href="/analytics">
          <Button variant="outline" className="w-full h-16 flex flex-col justify-center">
            <Shield className="h-6 w-6 mb-1" />
            <span className="text-sm">Analytics</span>
          </Button>
        </Link>
      </PermissionGate>
    </div>
  )
}

export default AdminNav
