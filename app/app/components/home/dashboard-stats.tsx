
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  Home as HomeIcon, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  BarChart3
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Room {
  id: string
  name: string
  _count?: {
    items: number
    racks: number
  }
}

interface DashboardStatsProps {
  rooms: Room[]
  loading: boolean
}

interface StatsData {
  totalItems: number
  totalRooms: number
  expiringItems: number
  recentActivity: number
  organizationScore: number
  topCategories: { name: string; count: number }[]
  upcomingExpirations: any[]
}

export function DashboardStats({ rooms, loading }: DashboardStatsProps) {
  const router = useRouter()
  const [statsData, setStatsData] = useState<StatsData>({
    totalItems: 0,
    totalRooms: rooms.length,
    expiringItems: 0,
    recentActivity: 0,
    organizationScore: 0,
    topCategories: [],
    upcomingExpirations: []
  })
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isStatsExpanded, setIsStatsExpanded] = useState(false)

  // Calculate basic stats from rooms
  useEffect(() => {
    const totalItems = rooms.reduce((sum, room) => sum + (room._count?.items || 0), 0)
    const totalRacks = rooms.reduce((sum, room) => sum + (room._count?.racks || 0), 0)
    
    // Calculate organization score based on items vs racks ratio
    let organizationScore = 0
    if (totalRacks > 0) {
      const itemsPerRack = totalItems / totalRacks
      if (itemsPerRack <= 5) organizationScore = 100
      else if (itemsPerRack <= 10) organizationScore = 85
      else if (itemsPerRack <= 20) organizationScore = 70
      else organizationScore = 50
    }

    setStatsData(prev => ({
      ...prev,
      totalItems,
      totalRooms: rooms.length,
      organizationScore: Math.round(organizationScore)
    }))
  }, [rooms])

  // Fetch additional stats data
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true)
      try {
        // Fetch expiration alerts
        const expirationResponse = await fetch('/api/expiration-alerts')
        if (expirationResponse.ok) {
          const expirationData = await expirationResponse.json()
          const expiringItems = expirationData.filter((item: any) => {
            if (!item.expirationDate) return false
            const daysUntilExpiry = Math.ceil(
              (new Date(item.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
            return daysUntilExpiry <= 7 && daysUntilExpiry >= 0
          })

          setStatsData(prev => ({
            ...prev,
            expiringItems: expiringItems.length,
            upcomingExpirations: expiringItems.slice(0, 3)
          }))
        }

        // Fetch analytics data for categories
        const analyticsResponse = await fetch('/api/analytics')
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json()
          const topCategories = analyticsData.categoryDistribution?.slice(0, 3) || []
          
          setStatsData(prev => ({
            ...prev,
            topCategories,
            recentActivity: analyticsData.recentActivityCount || 0
          }))
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoadingStats(false)
      }
    }

    if (rooms.length > 0) {
      fetchStats()
    }
  }, [rooms])

  const getOrganizationBadge = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-800' }
    if (score >= 75) return { text: 'Good', color: 'bg-blue-100 text-blue-800' }
    if (score >= 60) return { text: 'Fair', color: 'bg-yellow-100 text-yellow-800' }
    return { text: 'Needs Work', color: 'bg-red-100 text-red-800' }
  }

  const organizationBadge = getOrganizationBadge(statsData.organizationScore)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Collapsible Statistics Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4 bg-orange-50">
          <button
            onClick={() => setIsStatsExpanded(!isStatsExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-800">Statistics</h3>
              </div>
              <p className="text-sm text-orange-700 mt-1">View inventory metrics and analytics</p>
            </div>
            {isStatsExpanded ? (
              <ChevronUp className="h-5 w-5 text-orange-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-orange-600" />
            )}
          </button>
        </div>
        
        {isStatsExpanded && (
          <div className="p-6 space-y-6">
            {/* Expiring Soon - Full Width Bar */}
            <Card 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push('/expiration-dashboard')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {isLoadingStats ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        statsData.expiringItems
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Next 7 days
                    </p>
                  </div>
                  <div className="relative">
                    <Clock className="h-8 w-8 text-orange-600" />
                    {statsData.expiringItems > 0 && (
                      <AlertTriangle className="h-4 w-4 text-red-500 absolute -top-1 -right-1" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Four Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Total Items */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Items</p>
                      <p className="text-2xl font-bold text-gray-900">{statsData.totalItems}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Across {statsData.totalRooms} rooms
                      </p>
                    </div>
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Rooms */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Rooms</p>
                      <p className="text-2xl font-bold text-gray-900">{statsData.totalRooms}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {rooms.filter(r => (r._count?.items || 0) > 0).length} active
                      </p>
                    </div>
                    <HomeIcon className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Top Categories */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Top Categories</p>
                      <p className="text-xs text-gray-500 mt-1">Most common item types</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  {isLoadingStats ? (
                    <div className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    </div>
                  ) : statsData.topCategories.length > 0 ? (
                    <div className="space-y-1">
                      {statsData.topCategories.slice(0, 2).map((category, index) => (
                        <div key={category.name} className="flex items-center justify-between text-xs">
                          <span className="font-medium truncate pr-2">{category.name}</span>
                          <span className="text-gray-600 flex-shrink-0">{category.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No categories data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Organization Score */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Organization</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-2xl font-bold text-gray-900">{statsData.organizationScore}%</p>
                        <Badge className={organizationBadge.color}>
                          {organizationBadge.text}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Items per rack ratio
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
