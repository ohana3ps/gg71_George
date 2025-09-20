
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { HomeHeader } from '@/components/home/home-header'
import { UniversalSearch } from '@/components/home/universal-search'
import { QuickActionsOverlay } from '@/components/home/quick-actions-overlay'
import { DashboardStats } from '@/components/home/dashboard-stats'
import { RoomManagement } from '@/components/home/room-management'
import { AdminQuickActionsCollapsible } from '@/components/admin-quick-actions-collapsible'
import { HomeBottomToolbar } from '@/components/home-bottom-toolbar'
import ActivityFeed from '@/components/audit/activity-feed'
import { useHomeData } from '@/hooks/use-home-data'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const {
    rooms,
    allItems,
    loading,
    isRefreshing,
    recentRooms,
    searchHistory,
    isQuickAccessOpen,
    setIsQuickAccessOpen,
    isUniversalSearchOpen,
    setIsUniversalSearchOpen,
    trackRoomVisit,
    addToSearchHistory,
    handleForceRefresh,
    session,
    status
  } = useHomeData()

  const [isActivityFeedExpanded, setIsActivityFeedExpanded] = useState(false)

  // Redirect if not authenticated (bypassed for development)
  useEffect(() => {
    if (status === 'loading') return
    // For development, bypass authentication
    if (!session && process.env.NODE_ENV !== 'development') {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // Handle room form opening from quick actions
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false)
  const handleCreateRoom = () => {
    setIsRoomFormOpen(true)
  }

  // Show loading state (bypassed for development)
  if (status === 'loading' || (!session && process.env.NODE_ENV !== 'development')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <HomeHeader
          onOpenSearch={() => setIsUniversalSearchOpen(true)}
          onOpenQuickActions={() => setIsQuickAccessOpen(true)}
          onChangePassword={() => router.push('/change-password')}
          onCreateRoom={handleCreateRoom}
        />

        {/* 🔑 PRIMARY: Room Management (My Grid) - Must be visible without scrolling */}
        <div className="mb-8">
          <RoomManagement
            rooms={rooms}
            loading={loading}
            isRefreshing={isRefreshing}
            onRefresh={handleForceRefresh}
            onTrackRoomVisit={trackRoomVisit}
          />
        </div>

        {/* 📊 COLLAPSIBLE: Dashboard Stats */}
        <div className="mb-8">
          <DashboardStats rooms={rooms} loading={loading} />
        </div>

        {/* 📋 COLLAPSIBLE: Activity Feed */}
        <div className="mb-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <button
                onClick={() => setIsActivityFeedExpanded(!isActivityFeedExpanded)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <p className="text-sm text-gray-600">Track changes and updates</p>
                </div>
                {isActivityFeedExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            
            {isActivityFeedExpanded && (
              <div className="px-6 py-4">
                <ActivityFeed />
              </div>
            )}
          </div>
        </div>

        {/* ⚙️ COLLAPSIBLE: Admin Quick Actions (for admins only) */}
        <AdminQuickActionsCollapsible />
      </div>

      {/* Bottom Toolbar */}
      <HomeBottomToolbar 
        onSearchOpen={() => setIsUniversalSearchOpen(true)}
        onAddRoomOpen={handleCreateRoom}
      />

      {/* Overlays */}
      <UniversalSearch
        isOpen={isUniversalSearchOpen}
        onClose={() => setIsUniversalSearchOpen(false)}
        rooms={rooms}
        allItems={allItems}
        recentRooms={recentRooms}
        searchHistory={searchHistory}
        onTrackRoomVisit={trackRoomVisit}
        onAddToSearchHistory={addToSearchHistory}
      />

      <QuickActionsOverlay
        isOpen={isQuickAccessOpen}
        onClose={() => setIsQuickAccessOpen(false)}
        onCreateRoom={handleCreateRoom}
      />
    </div>
  )
}
