
'use client'

import { Badge } from '@/components/ui/badge'
import { Role } from '@/lib/rbac'
import { Shield, ShieldCheck, Crown, Users, Eye } from 'lucide-react'

interface RoleBadgeProps {
  role: Role
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const roleConfig = {
  super_admin: {
    label: 'Super Admin',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Crown,
    description: 'Full system access'
  },
  admin: {
    label: 'Admin',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: ShieldCheck,
    description: 'Administrative access'
  },
  manager: {
    label: 'Manager',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Shield,
    description: 'Team management'
  },
  user: {
    label: 'User',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: Users,
    description: 'Standard access'
  },
  viewer: {
    label: 'Viewer',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: Eye,
    description: 'Read-only access'
  }
} as const

export function RoleBadge({ 
  role, 
  className = '', 
  showIcon = true, 
  size = 'md' 
}: RoleBadgeProps) {
  const config = roleConfig[role] || roleConfig.user
  const IconComponent = config.icon

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${sizeClasses[size]} ${className} font-medium`}
    >
      {showIcon && <IconComponent className={`${iconSizes[size]} mr-1`} />}
      {config.label}
    </Badge>
  )
}

interface RoleSelectProps {
  value: Role
  onChange: (role: Role) => void
  availableRoles?: Role[]
  disabled?: boolean
  className?: string
}

export function RoleSelect({ 
  value, 
  onChange, 
  availableRoles = ['user', 'manager', 'admin'], 
  disabled = false,
  className = ''
}: RoleSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Role)}
      disabled={disabled}
      className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    >
      {availableRoles.map((role) => {
        const config = roleConfig[role] || roleConfig.user
        return (
          <option key={role} value={role}>
            {config.label} - {config.description}
          </option>
        )
      })}
    </select>
  )
}

export default RoleBadge
