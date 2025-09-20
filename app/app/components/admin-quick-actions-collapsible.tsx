
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PermissionGate, usePermissionCheck } from '@/components/rbac/permission-gate'
import { Permission } from '@/lib/rbac'
import { ChevronDown, ChevronUp, Users, Settings, Database, BarChart3 } from 'lucide-react'

interface AdminQuickActionsCollapsibleProps {
  className?: string
}



export function AdminQuickActionsCollapsible({ className = '' }: AdminQuickActionsCollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { isAdmin } = usePermissionCheck()

  if (!isAdmin()) {
    return null
  }

  const adminActions = [
    {
      id: 'users',
      title: 'Users',
      icon: Users,
      href: '/admin?tab=users',
      permission: 'users:read' as Permission,
      description: 'Manage user accounts'
    },
    {
      id: 'settings', 
      title: 'Settings',
      icon: Settings,
      href: '/admin?tab=system',
      permission: 'system:settings' as Permission,
      description: 'System configuration'
    },
    {
      id: 'database',
      title: 'Database',
      icon: Database,
      href: '/admin?tab=system',
      requireSuperAdmin: true,
      description: 'Database management'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: BarChart3,
      href: '/analytics',
      permission: 'inventory:analytics' as Permission,
      description: 'System analytics'
    }
  ]

  return (
    <div className={`${className}`}>
      <Card className="bg-purple-50 border-purple-200 hover:bg-purple-100 transition-colors duration-200">
        <CardContent className="p-4">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-purple-700 hover:text-purple-800 hover:bg-purple-100 p-0"
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span className="font-semibold">Admin Tools</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>

          {isExpanded && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {adminActions.map((action) => {
                const IconComponent = action.icon
                
                if (action.requireSuperAdmin) {
                  return (
                    <PermissionGate key={action.id} requireSuperAdmin>
                      <Link href={action.href}>
                        <Card className="bg-white border-purple-200 hover:bg-purple-50 transition-all duration-200 hover:shadow-md cursor-pointer">
                          <CardContent className="p-3 flex flex-col items-center text-center">
                            <IconComponent className="h-6 w-6 text-purple-600 mb-2" />
                            <span className="text-sm font-medium text-gray-900">{action.title}</span>
                            <span className="text-xs text-gray-500 mt-1">{action.description}</span>
                          </CardContent>
                        </Card>
                      </Link>
                    </PermissionGate>
                  )
                }
                
                return (
                  <PermissionGate key={action.id} permission={action.permission}>
                    <Link href={action.href}>
                      <Card className="bg-white border-purple-200 hover:bg-purple-50 transition-all duration-200 hover:shadow-md cursor-pointer">
                        <CardContent className="p-3 flex flex-col items-center text-center">
                          <IconComponent className="h-6 w-6 text-purple-600 mb-2" />
                          <span className="text-sm font-medium text-gray-900">{action.title}</span>
                          <span className="text-xs text-gray-500 mt-1">{action.description}</span>
                        </CardContent>
                      </Card>
                    </Link>
                  </PermissionGate>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminQuickActionsCollapsible
