
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Clock,
  Plus,
  Edit,
  Trash2,
  ArrowRightLeft,
  Package,
  Home,
  Grid3X3,
  Box,
  RefreshCw
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'created' | 'modified' | 'deleted' | 'checked_out' | 'returned'
  entityType: 'item' | 'room' | 'rack' | 'box'
  entityName: string
  userEmail: string
  timestamp: string
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/audit/activity-feed')
      if (!response.ok) {
        throw new Error('Failed to load activity feed')
      }
      
      const data = await response.json()
      setActivities(data.activities || [])
    } catch (error) {
      console.error('Error loading activities:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: ActivityItem['type'], entityType: ActivityItem['entityType']) => {
    const baseClasses = "h-4 w-4"
    
    switch (type) {
      case 'created':
        return <Plus className={`${baseClasses} text-green-500`} />
      case 'modified':
        return <Edit className={`${baseClasses} text-blue-500`} />
      case 'deleted':
        return <Trash2 className={`${baseClasses} text-red-500`} />
      case 'checked_out':
        return <ArrowRightLeft className={`${baseClasses} text-orange-500`} />
      case 'returned':
        return <ArrowRightLeft className={`${baseClasses} text-purple-500`} />
      default:
        return <Clock className={`${baseClasses} text-gray-400`} />
    }
  }

  const getEntityIcon = (entityType: ActivityItem['entityType']) => {
    const baseClasses = "h-3 w-3"
    
    switch (entityType) {
      case 'item':
        return <Package className={`${baseClasses} text-gray-500`} />
      case 'room':
        return <Home className={`${baseClasses} text-blue-500`} />
      case 'rack':
        return <Grid3X3 className={`${baseClasses} text-purple-500`} />
      case 'box':
        return <Box className={`${baseClasses} text-green-500`} />
      default:
        return <Package className={`${baseClasses} text-gray-500`} />
    }
  }

  const getActivityText = (activity: ActivityItem) => {
    const userName = activity.userEmail.split('@')[0]
    const entityTypeText = activity.entityType
    
    switch (activity.type) {
      case 'created':
        return `${userName} created ${entityTypeText}`
      case 'modified':
        return `${userName} modified ${entityTypeText}`
      case 'deleted':
        return `${userName} deleted ${entityTypeText}`
      case 'checked_out':
        return `${userName} checked out ${entityTypeText}`
      case 'returned':
        return `${userName} returned ${entityTypeText}`
      default:
        return `${userName} performed action on ${entityTypeText}`
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={loadActivities}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadActivities}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm mt-2">Activity will appear here as users interact with the system</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type, activity.entityType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getEntityIcon(activity.entityType)}
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.entityName}
                      </p>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2">
                      {getActivityText(activity)}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {activity.entityType}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
