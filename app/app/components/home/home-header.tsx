
'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BrandingBadge } from '@/components/ui/branding-badge'
import { RoleBadge } from '@/components/rbac/role-badge'
import { usePermissionCheck } from '@/components/rbac/permission-gate'
import { QuickActionsChevron } from '@/components/home/quick-actions-chevron'
import Link from 'next/link'
import { 
  Search, 
  Zap, 
  Settings, 
  LogOut, 
  MoreVertical, 
  Shield,
  Crown
} from 'lucide-react'

interface HomeHeaderProps {
  onOpenSearch: () => void
  onOpenQuickActions: () => void
  onChangePassword: () => void
  onCreateRoom?: () => void
}

export function HomeHeader({ 
  onOpenSearch, 
  onOpenQuickActions, 
  onChangePassword,
  onCreateRoom
}: HomeHeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { isAdmin, isSuperAdmin } = usePermissionCheck()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/auth/signin')
  }

  const userRole = (session?.user as any)?.role || 'user'

  return (
    <div className="flex flex-col space-y-4 mb-8">
      {/* Top Row: Branding + Controls */}
      <div className="flex items-start justify-between">
        {/* Left: Branding Badge */}
        <div className="flex-shrink-0">
          <BrandingBadge size="md" />
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-col items-end space-y-2 flex-shrink-0">
          {/* Top Row: 3-Dot Menu and Search */}
          <div className="flex items-center space-x-2">
            {/* 3-Dot Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Admin Access (moved from main header to dropdown for mobile) */}
                {isAdmin() && (
                  <>
                    <Link href="/admin">
                      <DropdownMenuItem>
                        <Shield className="h-4 w-4 mr-2 text-red-600" />
                        <span className="text-red-700 font-medium">Admin Panel</span>
                      </DropdownMenuItem>
                    </Link>
                    <div className="px-2 py-1.5">
                      <RoleBadge role={userRole} size="sm" />
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={onChangePassword}>
                  <Settings className="h-4 w-4 mr-2" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Button (Always Visible) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenSearch}
                    className="flex items-center space-x-2"
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden md:inline">Search</span>
                    <kbd className="hidden lg:inline ml-2 px-1.5 py-0.5 text-xs bg-gray-100 border rounded">
                      ⌘K
                    </kbd>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Universal Search (⌘K)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>


        </div>
      </div>

      {/* Second Row: Quick Actions replacing Welcome Message */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center space-y-2 sm:space-y-0">
        {/* Quick Actions Chevron - Now in Welcome area */}
        <QuickActionsChevron onCreateRoom={onCreateRoom} />
      </div>
    </div>
  )
}
