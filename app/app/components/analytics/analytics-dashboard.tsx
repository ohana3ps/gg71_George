

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Home, 
  DollarSign, 
  Camera, 
  Activity,
  Eye,
  Download,
  Shield,
  MapPin
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { Room } from '@prisma/client'
import Link from 'next/link'

interface AnalyticsData {
  overview: {
    totalItems: number
    totalRooms: number
    totalValue: number
    averageItemValue: number
    itemsWithPhotos: number
    photoPercentage: number
  }
  categories: Array<{
    name: string
    count: number
    totalValue: number
    totalQuantity: number
  }>
  conditions: Array<{
    name: string
    count: number
  }>
  rooms: Array<{
    id: string
    name: string
    color: string
    itemCount: number
    totalValue: number
  }>
  recentActivity: Array<{
    id: string
    name: string
    room: { name: string; color: string }
    value: number | null
    createdAt: string
  }>
  charts: {
    valueByCategory: Array<{ category: string; value: number }>
    roomDistribution: Array<{ name: string; count: number; value: number }>
  }
  topItems: Array<{
    id: string
    name: string
    value: number | null
    room: { name: string; color: string }
    photoUrl: string | null
  }>
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16']

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRooms()
    fetchAnalytics()
  }, [selectedRoom])

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms')
      if (response.ok) {
        const data = await response.json()
        setRooms(data)
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const params = selectedRoom !== 'all' ? `?roomId=${selectedRoom}` : ''
      const response = await fetch(`/api/analytics${params}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Inventory Analytics
            </CardTitle>
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: room.color }}
                      />
                      {room.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.overview.totalItems}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.overview.totalRooms}
                </p>
              </div>
              <Home className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(analytics.overview.totalValue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Value</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(analytics.overview.averageItemValue)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Photos</p>
                <p className="text-2xl font-bold text-purple-600">
                  {analytics.overview.photoPercentage}%
                </p>
              </div>
              <Camera className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Photo Count</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {analytics.overview.itemsWithPhotos}
                </p>
              </div>
              <Eye className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Location Report</h3>
              </div>
              <Link href="/export?type=location">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </Link>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              Download complete inventory organized by room and location. Perfect for Excel filtering and analysis.
            </p>
            <div className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded">
              ✨ Recommended for inventory management
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-green-900">Insurance Report</h3>
              </div>
              <Link href="/export?type=insurance">
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </Link>
            </div>
            <p className="text-sm text-green-700 mb-3">
              Generate household contents valuation for insurance coverage determination with category breakdowns.
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600 bg-green-200 px-2 py-1 rounded">
                📋 Insurance ready
              </span>
              <span className="text-green-800 font-medium">
                {formatCurrency(analytics.overview.totalValue)} total value
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Download className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold text-purple-900">All Export Options</h3>
              </div>
              <Link href="/export">
                <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  View All
                </Button>
              </Link>
            </div>
            <p className="text-sm text-purple-700 mb-3">
              Access all export formats including donation candidates, category reports, and value ranges.
            </p>
            <div className="text-xs text-purple-600 bg-purple-200 px-2 py-1 rounded">
              🎯 Custom filtering available
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Value Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Value by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.charts.valueByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Value']}
                />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Room Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Items by Room</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.charts.roomDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, count }) => `${name} (${count})`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.charts.roomDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Items']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Categories Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.categories.slice(0, 8).map((category, index) => (
                <div key={category.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-gray-600">
                        {category.count} items • Qty: {category.totalQuantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(category.totalValue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Value Items */}
        <Card>
          <CardHeader>
            <CardTitle>Highest Value Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                    {item.photoUrl ? (
                      <img 
                        src={item.photoUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.room.color }}
                      />
                      {item.room.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {item.value ? formatCurrency(item.value) : 'No value'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.room.color }}
                    />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        Added to {item.room.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {formatDate(item.createdAt)}
                    </p>
                    {item.value && (
                      <p className="text-sm font-medium text-green-600">
                        {formatCurrency(item.value)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

