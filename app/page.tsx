
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ArrowLeft, 
  RefreshCw,
  Calendar,
  MapPin,
  Package,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  ChefHat,
  ShoppingCart,
  Timer,
  Trash2,
  Star
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface FoodItem {
  id: string
  name: string
  category?: string
  quantity: number
  foodUnit?: string
  expirationDate?: string
  purchaseDate?: string
  photoUrl?: string
  room: {
    id: string
    name: string
    color: string
  }
  box?: {
    id: string
    boxNumber: number
    name?: string
  }
  daysUntilExpiration?: number
  expirationStatus: string
  isAlert?: boolean
}

interface ExpirationStats {
  totalItems: number
  expired: number
  expiringSoon: number
  expiringThisWeek: number
  fresh: number
}

interface AlertItem {
  id: string
  alertType: string
  daysUntilExpiry?: number
  isRead: boolean
  isSnoozed: boolean
  item: FoodItem
}

export default function ExpirationDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [stats, setStats] = useState<ExpirationStats>({
    totalItems: 0,
    expired: 0,
    expiringSoon: 0,
    expiringThisWeek: 0,
    fresh: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('urgent')
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  
  // Context from source page (e.g., recipe-generator)
  const fromSource = searchParams.get('from')
  const urlTab = searchParams.get('tab')

  useEffect(() => {
    if (session) {
      loadFoodData()
      loadAlerts()
      
      // Set up auto-refresh every minute for real-time countdowns
      const interval = setInterval(loadFoodData, 60000)
      return () => clearInterval(interval)
    }
  }, [session])

  // Handle URL parameters for deep linking
  useEffect(() => {
    if (urlTab && ['urgent', 'warning', 'fresh', 'all'].includes(urlTab)) {
      setActiveTab(urlTab)
      
      // Show welcome toast when coming from recipe generator
      if (fromSource === 'recipe-generator') {
        const tabDescriptions = {
          urgent: 'expiring items that need immediate attention',
          warning: 'items expiring this week',
          fresh: 'fresh items perfect for cooking',
          all: 'all food items in your inventory'
        }
        toast.success(`🎯 Showing ${tabDescriptions[urlTab as keyof typeof tabDescriptions]} from Recipe Generator`)
      }
    }
  }, [urlTab, fromSource])

  const loadFoodData = async () => {
    try {
      const response = await fetch('/api/food-inventory')
      if (!response.ok) throw new Error('Failed to fetch food inventory')
      
      const data = await response.json()
      setFoodItems(data.items || [])
      
      // Calculate stats
      const newStats = {
        totalItems: data.items?.length || 0,
        expired: data.items?.filter((item: FoodItem) => item.expirationStatus === 'expired').length || 0,
        expiringSoon: data.items?.filter((item: FoodItem) => item.expirationStatus === 'expiring_soon').length || 0,
        expiringThisWeek: data.items?.filter((item: FoodItem) => item.expirationStatus === 'expiring_this_week').length || 0,
        fresh: data.items?.filter((item: FoodItem) => item.expirationStatus === 'fresh').length || 0
      }
      setStats(newStats)
      
    } catch (error) {
      console.error('Error loading food data:', error)
      toast.error('Failed to load food inventory')
    }
  }

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/expiration-alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAlertAsRead = async (alertId: string) => {
    try {
      const response = await fetch(`/api/expiration-alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true })
      })
      
      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, isRead: true } : alert
        ))
      }
    } catch (error) {
      console.error('Error marking alert as read:', error)
    }
  }

  const snoozeAlert = async (alertId: string, hours: number = 24) => {
    try {
      const snoozeUntil = new Date()
      snoozeUntil.setHours(snoozeUntil.getHours() + hours)
      
      const response = await fetch(`/api/expiration-alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          isSnoozed: true,
          snoozeUntil: snoozeUntil.toISOString()
        })
      })
      
      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId))
        toast.success(`Alert snoozed for ${hours} hours`)
      }
    } catch (error) {
      console.error('Error snoozing alert:', error)
    }
  }

  const removeItem = async (itemId: string, itemName: string) => {
    try {
      // Optimistic UI update - add to removing set
      setRemovingItems(prev => new Set(prev).add(itemId))
      
      console.log('🗑️ Removing item from expiration dashboard:', { itemId, itemName })
      
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Success! Remove from UI state
      setFoodItems(prev => prev.filter(item => item.id !== itemId))
      
      // Update stats by recalculating (could be optimized)
      loadFoodData()
      
      toast.success(`"${itemName}" removed successfully`, {
        icon: '🗑️',
        duration: 4000,
      })
      
      console.log('✅ Item removed successfully')
      
    } catch (error) {
      console.error('❌ Error removing item:', error)
      toast.error(`Failed to remove "${itemName}": ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      // Remove from removing set regardless of success/failure
      setRemovingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }



  const filterItemsByStatus = (status: string) => {
    return foodItems.filter(item => {
      switch (status) {
        case 'urgent': return ['expired', 'expiring_soon'].includes(item.expirationStatus)
        case 'warning': return item.expirationStatus === 'expiring_this_week'
        case 'fresh': return item.expirationStatus === 'fresh'
        case 'all': return true
        default: return true
      }
    })
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view your expiration dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/signin">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-orange-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          {/* Top Level - Back and Refresh */}
          <div className="flex items-center justify-between mb-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            
            <Button
              variant="outline"
              size="sm"
              onClick={loadFoodData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
          
          {/* Second Level - Title and Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Timer className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Expiration Dashboard</h1>
                <p className="text-sm text-gray-500">Track freshness & avoid waste</p>
              </div>
            </div>
            
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <Clock className="w-3 h-3 mr-1" />
              Live Updates
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Context Banner when coming from Recipe Generator */}
        {fromSource === 'recipe-generator' && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <ChefHat className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  From Recipe Generator
                </p>
                <p className="text-xs text-orange-700">
                  View your food inventory details, then return to generate recipes with priority ingredients
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Now Clickable for Filtering */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card 
            className={`bg-red-50 border-red-200 cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'urgent' ? 'ring-2 ring-red-400 shadow-lg' : ''
            }`}
            onClick={() => {
              setActiveTab('urgent')
              if (stats.expired + stats.expiringSoon > 0) {
                toast.success(`Showing ${stats.expired + stats.expiringSoon} urgent items`)
              } else {
                toast('No urgent items found! 🎉', { icon: '✅' })
              }
            }}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
              <div className="text-xs text-red-500">Expired</div>
            </CardContent>
          </Card>
          
          <Card 
            className={`bg-orange-50 border-orange-200 cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'urgent' ? 'ring-2 ring-orange-400 shadow-lg' : ''
            }`}
            onClick={() => {
              setActiveTab('urgent')
              if (stats.expired + stats.expiringSoon > 0) {
                toast.success(`Showing ${stats.expired + stats.expiringSoon} urgent items`)
              } else {
                toast('No urgent items found! 🎉', { icon: '✅' })
              }
            }}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</div>
              <div className="text-xs text-orange-500">Expiring Soon</div>
            </CardContent>
          </Card>
          
          <Card 
            className={`bg-yellow-50 border-yellow-200 cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'warning' ? 'ring-2 ring-yellow-400 shadow-lg' : ''
            }`}
            onClick={() => {
              setActiveTab('warning')
              if (stats.expiringThisWeek > 0) {
                toast.success(`Showing ${stats.expiringThisWeek} items expiring this week`)
              } else {
                toast('No items expiring this week! 👍', { icon: '📅' })
              }
            }}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.expiringThisWeek}</div>
              <div className="text-xs text-yellow-500">This Week</div>
            </CardContent>
          </Card>
          
          <Card 
            className={`bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'fresh' ? 'ring-2 ring-green-400 shadow-lg' : ''
            }`}
            onClick={() => {
              setActiveTab('fresh')
              if (stats.fresh > 0) {
                toast.success(`Showing ${stats.fresh} fresh items`)
              } else {
                toast('No fresh items found. Try scanning some receipts!', { icon: '🛒' })
              }
            }}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.fresh}</div>
              <div className="text-xs text-green-500">Fresh</div>
            </CardContent>
          </Card>
          
          <Card 
            className={`bg-gray-50 border-gray-200 cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'all' ? 'ring-2 ring-gray-400 shadow-lg' : ''
            }`}
            onClick={() => {
              setActiveTab('all')
              if (stats.totalItems > 0) {
                toast.success(`Showing all ${stats.totalItems} items`)
              } else {
                toast('No items found. Start by scanning receipts!', { icon: '📦' })
              }
            }}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.totalItems}</div>
              <div className="text-xs text-gray-500">Total Items</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          {fromSource === 'recipe-generator' ? (
            <>
              <Link href="/recipe-generator">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <ChefHat className="w-4 h-4 mr-2" />
                  Back to Recipe Generator
                </Button>
              </Link>
              
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  // Enable expiring first preference and navigate back
                  router.push('/recipe-generator?useExpiring=true')
                  toast.success('🎯 Recipe Generator will prioritize expiring ingredients!')
                }}
              >
                <Star className="w-4 h-4 mr-2" />
                Generate Recipe with These Items
              </Button>
            </>
          ) : (
            <>
              <Link href="/receipt-scanner">
                <Button className="bg-green-600 hover:bg-green-700">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Scan New Receipt
                </Button>
              </Link>
              
              <Link href="/recipe-generator">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <ChefHat className="w-4 h-4 mr-2" />
                  Generate Recipes
                </Button>
              </Link>
            </>
          )}
          
          <Button 
            variant="outline"
            onClick={() => {
              toast('Alert settings coming soon! 🔔', {
                icon: '⚙️',
                duration: 3000,
              })
            }}
          >
            <Bell className="w-4 h-4 mr-2" />
            Alert Settings
          </Button>
        </div>

        {/* Items Tabs */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
                <TabsTrigger value="urgent" className="relative text-xs sm:text-sm">
                  <span className="hidden sm:inline">Urgent</span>
                  <span className="sm:hidden">🚨</span>
                  {(stats.expired + stats.expiringSoon) > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs p-0">
                      {stats.expired + stats.expiringSoon}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="warning" className="relative text-xs sm:text-sm">
                  <span className="hidden sm:inline">This Week</span>
                  <span className="sm:hidden">⏰</span>
                  {stats.expiringThisWeek > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-yellow-500 text-white text-xs p-0">
                      {stats.expiringThisWeek}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="fresh" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Fresh</span>
                  <span className="sm:hidden">✅</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">All Items</span>
                  <span className="sm:hidden">📦</span>
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="urgent" className="mt-0">
                <div className="space-y-4">
                  {filterItemsByStatus('urgent').length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">All Good! 🎉</h3>
                      <p className="text-gray-500">No items need immediate attention</p>
                    </div>
                  ) : (
                    filterItemsByStatus('urgent').map((item) => (
                      <ItemCard 
                        key={item.id} 
                        item={item} 
                        onRemove={removeItem}
                        isRemoving={removingItems.has(item.id)}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="warning" className="mt-0">
                <div className="space-y-4">
                  {filterItemsByStatus('warning').length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Looking Good</h3>
                      <p className="text-gray-500">No items expiring this week</p>
                    </div>
                  ) : (
                    filterItemsByStatus('warning').map((item) => (
                      <ItemCard 
                        key={item.id} 
                        item={item} 
                        onRemove={removeItem}
                        isRemoving={removingItems.has(item.id)}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="fresh" className="mt-0">
                <div className="space-y-4">
                  {filterItemsByStatus('fresh').length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Fresh Items</h3>
                      <p className="text-gray-500">Scan some receipts to track fresh food!</p>
                    </div>
                  ) : (
                    filterItemsByStatus('fresh').map((item) => (
                      <ItemCard 
                        key={item.id} 
                        item={item} 
                        onRemove={removeItem}
                        isRemoving={removingItems.has(item.id)}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="all" className="mt-0">
                <div className="space-y-4">
                  {foodItems.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Food Items</h3>
                      <p className="text-gray-500 mb-4">Start by scanning your grocery receipts!</p>
                      <Link href="/receipt-scanner">
                        <Button className="bg-green-600 hover:bg-green-700">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Scan Receipt
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    foodItems.map((item) => (
                      <ItemCard 
                        key={item.id} 
                        item={item} 
                        onRemove={removeItem}
                        isRemoving={removingItems.has(item.id)}
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </main>
    </div>
  )
}

// Item Card Component
function ItemCard({ 
  item, 
  onRemove, 
  isRemoving = false 
}: { 
  item: FoodItem
  onRemove: (itemId: string, itemName: string) => void
  isRemoving?: boolean
}) {
  const statusColor = getExpirationStatusColor(item.expirationStatus)
  const statusText = getExpirationStatusText(item.expirationStatus, item.daysUntilExpiration)
  const progressValue = getProgressValue(item.expirationStatus, item.daysUntilExpiration)

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-medium text-gray-900">{item.name}</h3>
            <Badge className={statusColor}>
              {item.expirationStatus === 'expired' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {statusText}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
            <div className="flex items-center space-x-1">
              <Package className="w-3 h-3" />
              <span>{item.quantity} {item.foodUnit || 'items'}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>{item.room.name}</span>
              {item.box && <span>• Box #{item.box.boxNumber}</span>}
            </div>
            
            {item.expirationDate ? (
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>Exp: {new Date(item.expirationDate).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>No expiration date</span>
              </div>
            )}
          </div>

          {/* Freshness Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                item.expirationStatus === 'expired' ? 'bg-red-500' :
                item.expirationStatus === 'expiring_soon' ? 'bg-orange-500' :
                item.expirationStatus === 'expiring_this_week' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>

        {item.photoUrl && (
          <div className="ml-4 flex-shrink-0">
            <div className="w-16 h-16 relative bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={item.photoUrl}
                alt={item.name}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" size="sm">
          <Eye className="w-3 h-3 mr-1" />
          View
        </Button>
        
        {['expired', 'expiring_soon'].includes(item.expirationStatus) && (
          <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
            <ChefHat className="w-3 h-3 mr-1" />
            Use in Recipe
          </Button>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="text-red-600 hover:text-red-700"
          onClick={() => onRemove(item.id, item.name)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
          ) : (
            <Trash2 className="w-3 h-3 mr-1" />
          )}
          {isRemoving ? 'Removing...' : 'Remove'}
        </Button>
      </div>
    </div>
  )
}

function getExpirationStatusColor(status: string) {
  switch (status) {
    case 'expired': return 'bg-red-100 text-red-800 border-red-200'
    case 'expiring_soon': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'expiring_this_week': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'fresh': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getExpirationStatusText(status: string, days?: number) {
  switch (status) {
    case 'expired': return `Expired ${Math.abs(days || 0)} days ago`
    case 'expiring_soon': return days === 0 ? 'Expires today!' : `${days} day${days === 1 ? '' : 's'} left`
    case 'expiring_this_week': return `${days} day${days === 1 ? '' : 's'} left`
    case 'fresh': return days ? `${days} days fresh` : 'Fresh'
    default: return 'Unknown'
  }
}

function getProgressValue(status: string, days?: number) {
  switch (status) {
    case 'expired': return 100
    case 'expiring_soon': return 85 + Math.min(15, (days || 0) * 5)
    case 'expiring_this_week': return 60 + Math.min(25, (days || 0) * 3)
    case 'fresh': return Math.max(0, Math.min(60, 60 - (days || 0) * 2))
    default: return 50
  }
}
