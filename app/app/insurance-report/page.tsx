
'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Shield, 
  Download, 
  DollarSign, 
  TrendingUp, 
  Home as HomeIcon,
  Package,
  AlertCircle,
  FileText,
  Calculator,
  Filter,
  ChevronRight,
  Building2
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface InsuranceItem {
  id: string
  name: string
  value: number
  condition: string
  category: string
  purchaseDate: string
  serialNumber: string
  room: {
    name: string
    color: string
  }
  box?: {
    name: string
    boxNumber: number
  }
}

interface ValueBreakdown {
  total: number
  byRoom: Record<string, number>
  byCategory: Record<string, number>
  highValueItems: InsuranceItem[]
  itemCount: number
}

export default function InsuranceReport() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [valueBreakdown, setValueBreakdown] = useState<ValueBreakdown | null>(null)
  const [minValue, setMinValue] = useState('500')
  const [selectedRoom, setSelectedRoom] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [rooms, setRooms] = useState<Array<{id: string, name: string}>>([])
  const [categories, setCategories] = useState<string[]>([])

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // Fetch insurance data
  useEffect(() => {
    if (!session?.user?.id) return

    const fetchInsuranceData = async () => {
      try {
        setLoading(true)
        
        // Fetch all items with values for analysis
        const itemsResponse = await fetch('/api/items')
        if (!itemsResponse.ok) throw new Error('Failed to fetch items')
        const items = await itemsResponse.json()

        // Fetch rooms for filtering
        const roomsResponse = await fetch('/api/rooms')
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json()
          setRooms(roomsData)
        }

        // Filter items that have values
        const valuedItems = items.filter((item: any) => item.value && item.value > 0)
        
        // Calculate breakdown
        const breakdown = calculateValueBreakdown(valuedItems, parseFloat(minValue))
        setValueBreakdown(breakdown)

        // Extract unique categories
        const uniqueCategories = [...new Set(items.map((item: any) => item.category).filter(Boolean))] as string[]
        setCategories(uniqueCategories)

      } catch (error) {
        console.error('Error fetching insurance data:', error)
        toast.error('Failed to load insurance data')
      } finally {
        setLoading(false)
      }
    }

    fetchInsuranceData()
  }, [session, minValue])

  const calculateValueBreakdown = (items: any[], threshold: number): ValueBreakdown => {
    const breakdown: ValueBreakdown = {
      total: 0,
      byRoom: {},
      byCategory: {},
      highValueItems: [],
      itemCount: items.length
    }

    items.forEach(item => {
      const value = item.value || 0
      breakdown.total += value

      // Room breakdown
      const roomName = item.room?.name || 'Unassigned'
      breakdown.byRoom[roomName] = (breakdown.byRoom[roomName] || 0) + value

      // Category breakdown
      const category = item.category || 'Uncategorized'
      breakdown.byCategory[category] = (breakdown.byCategory[category] || 0) + value

      // High value items
      if (value >= threshold) {
        breakdown.highValueItems.push({
          id: item.id,
          name: item.name,
          value: value,
          condition: item.condition || 'Unknown',
          category: category,
          purchaseDate: item.purchaseDate || '',
          serialNumber: item.serialNumber || '',
          room: item.room || { name: 'Unassigned', color: '#gray' },
          box: item.box
        })
      }
    })

    // Sort high value items by value (descending)
    breakdown.highValueItems.sort((a, b) => b.value - a.value)

    return breakdown
  }

  const handleExportReport = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      const params = new URLSearchParams({
        type: 'insurance', // Use 'insurance' type for proper insurance report format
        format: format,
        minValue: minValue,
        ...(selectedRoom !== 'all' && { roomId: selectedRoom }),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      })

      console.log('🔄 Insurance export request:', { format, minValue, selectedRoom, selectedCategory })

      const response = await fetch(`/api/export?${params}`)
      
      console.log('📊 Insurance export response:', { 
        status: response.status, 
        contentType: response.headers.get('content-type') 
      })

      if (!response.ok) {
        throw new Error(`Insurance export failed with status ${response.status}`)
      }
      
      if (response.headers.get('content-type')?.includes('text/csv')) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `insurance-report-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`Insurance report downloaded successfully! (${format.toUpperCase()})`)
        console.log('✅ Insurance CSV export completed')
      } else if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json()
        console.log('📋 Insurance export JSON response:', data)
        
        if (data.count === 0) {
          toast.error('No items found matching your insurance report criteria')
        } else {
          toast.success(`Found ${data.count} items for insurance export`)
        }
      } else {
        // Handle unexpected content type
        const responseText = await response.text()
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          console.log('❌ Authentication redirect detected in insurance export')
          toast.error('Session expired. Please refresh the page and sign in again.')
        } else {
          console.log('❌ Unexpected insurance export response:', responseText.substring(0, 200))
          toast.error('Unexpected response from server. Please try again.')
        }
      }
    } catch (error) {
      console.error('Insurance export error:', error)
      toast.error('Failed to export insurance report')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!valueBreakdown) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Insurance Data Available</h2>
          <p className="text-gray-600 mb-4">Start adding item values to generate your insurance report.</p>
          <Button onClick={() => router.push('/items')}>
            <Package className="h-4 w-4 mr-2" />
            Manage Items
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Insurance Value Report</h1>
        </div>
        <p className="text-gray-600">
          Comprehensive household inventory valuation for insurance coverage planning
        </p>
      </div>

      {/* Filters and Export */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="minValue">Minimum Value ($)</Label>
              <Input
                id="minValue"
                type="number"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                min="0"
                step="100"
              />
            </div>
            <div>
              <Label htmlFor="room">Filter by Room</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="All Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Filter by Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => handleExportReport('csv')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button onClick={() => handleExportReport('excel')} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Value</p>
                <p className="text-3xl font-bold text-blue-900">
                  {formatCurrency(valueBreakdown.total)}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Valued Items</p>
                <p className="text-3xl font-bold text-green-900">
                  {valueBreakdown.itemCount}
                </p>
              </div>
              <Package className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">High Value Items</p>
                <p className="text-3xl font-bold text-orange-900">
                  {valueBreakdown.highValueItems.length}
                </p>
                <p className="text-xs text-orange-600">(≥${minValue})</p>
              </div>
              <TrendingUp className="h-12 w-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg. Item Value</p>
                <p className="text-3xl font-bold text-purple-900">
                  {formatCurrency(valueBreakdown.total / valueBreakdown.itemCount)}
                </p>
              </div>
              <Calculator className="h-12 w-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value Breakdown by Room */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HomeIcon className="h-5 w-5" />
              Value by Room
            </CardTitle>
            <CardDescription>
              Room-specific inventory values for targeted coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(valueBreakdown.byRoom)
                .sort(([,a], [,b]) => b - a)
                .map(([room, value]) => (
                  <div key={room} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{room}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{formatCurrency(value)}</span>
                      <div className="text-xs text-gray-500">
                        {((value / valueBreakdown.total) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Value by Category
            </CardTitle>
            <CardDescription>
              Category breakdown for detailed insurance planning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(valueBreakdown.byCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, value]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-medium">{category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{formatCurrency(value)}</span>
                      <div className="text-xs text-gray-500">
                        {((value / valueBreakdown.total) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Value Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            High Value Items (≥${minValue})
          </CardTitle>
          <CardDescription>
            Individual items that may require special insurance consideration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {valueBreakdown.highValueItems.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No items found above ${minValue}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {valueBreakdown.highValueItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{item.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                      {item.condition && (
                        <Badge variant="secondary" className="text-xs">
                          {item.condition}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {item.room.name}
                      </span>
                      {item.box && (
                        <span>Box: {item.box.name || item.box.boxNumber}</span>
                      )}
                      {item.serialNumber && (
                        <span>SN: {item.serialNumber}</span>
                      )}
                      {item.purchaseDate && (
                        <span>Purchased: {new Date(item.purchaseDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(item.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insurance Tips */}
      <Card className="mt-8 bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5" />
            Insurance Planning Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Contents Coverage</h4>
              <p className="text-amber-700">
                Your total inventory value of <strong>{formatCurrency(valueBreakdown.total)}</strong> can help determine your contents replacement coverage amount. Consider 10-20% additional coverage for inflation and items not yet cataloged.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">High-Value Items</h4>
              <p className="text-amber-700">
                Items worth ${minValue}+ may need special scheduling or riders on your policy. Consider professional appraisals for very valuable items and keep receipts and photos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
