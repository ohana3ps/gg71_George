
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Plus, Shield, Command } from 'lucide-react'
import { PermissionGate, usePermissionCheck } from '@/components/rbac/permission-gate'
import { RoleBadge } from '@/components/rbac/role-badge'
import Link from 'next/link'

interface HomeBottomToolbarProps {
  onSearchOpen: () => void
  onAddRoomOpen: () => void
}

export function HomeBottomToolbar({ onSearchOpen, onAddRoomOpen }: HomeBottomToolbarProps) {
  const { data: session } = useSession()
  const { isAdmin } = usePermissionCheck()

  if (!session) return null

  return (
    <>
      {/* Bottom padding spacer to prevent content overlap */}
      <div className="h-20" />
      
      {/* Dedicated Search Bar - Full Width */}
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
        <Card className="bg-white/95 backdrop-blur-md shadow-2xl">
          <CardContent className="p-3">
            {/* Full Width Search Bar */}
            <Button
              variant="outline"
              onClick={onSearchOpen}
              className="w-full bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 justify-start px-4 py-3 h-auto"
            >
              <Search className="h-5 w-5 mr-3" />
              <span className="text-base font-medium">Search rooms, items, actions...</span>
              <div className="ml-auto flex items-center space-x-1 text-xs text-blue-400">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
