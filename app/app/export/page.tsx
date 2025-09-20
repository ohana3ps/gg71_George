
'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  FileText, 
  Database, 
  Filter,
  Heart,
  DollarSign,
  Package,
  Calendar,
  ArrowLeft,
  AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface ExportOption {
  type: string
  name: string
  description: string
  icon: any
  color: string
  recommended?: boolean
}

export default function ExportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<Array<{id: string, name: string}>>([])
  const [categories, setCategories] = useState<string[]>([])
  
  // Export settings
  const [exportType, setExportType] = useState('location')
  const [format, setFormat] = useState('csv')
  const [selectedRoom, setSelectedRoom] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')
  const [donationDays, setDonationDays] = useState('90')

  // Redirect if not authenticated & handle URL parameters (run once)
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    // Check for URL parameters to set initial export type (only once)
    const urlParams = new URLSearchParams(window.location.search)
    const urlType = urlParams.get('type')
    if (urlType && ['location', 'insurance', 'all', 'category', 'value', 'donation', 'food'].includes(urlType)) {
      setExportType(urlType)
      console.log(`🔗 Set export type from URL: ${urlType}`)
    }
  }, [session, status, router]) // Removed exportType from dependencies to prevent re-runs

  // Fetch rooms and categories
  useEffect(() => {
    if (!session?.user?.id) return

    const fetchData = async () => {
      try {
        // Fetch rooms
        const roomsResponse = await fetch('/api/rooms')
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json()
          setRooms(roomsData)
        }

        // Fetch items to get categories
        const itemsResponse = await fetch('/api/items')
        if (itemsResponse.ok) {
          const items = await itemsResponse.json()
          const uniqueCategories = [...new Set(items.map((item: any) => item.category).filter(Boolean))] as string[]
          setCategories(uniqueCategories)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [session])

  const exportOptions: ExportOption[] = [
    {
      type: 'location',
      name: 'Inventory by Location',
      description: 'Organized by room/location for Excel filtering',
      icon: Database,
      color: 'blue',
      recommended: true
    },
    {
      type: 'insurance',
      name: 'Insurance Coverage Report',
      description: 'Household contents valuation for insurance',
      icon: DollarSign,
      color: 'green',
      recommended: true
    },
    {
      type: 'all',
      name: 'Complete Inventory',
      description: 'Export all items with full details',
      icon: Package,
      color: 'gray'
    },
    {
      type: 'category',
      name: 'By Category',
      description: 'Export items from specific categories',
      icon: Package,
      color: 'purple'
    },
    {
      type: 'value',
      name: 'By Value Range',
      description: 'Export items within a value range',
      icon: DollarSign,
      color: 'yellow'
    },
    {
      type: 'donation',
      name: 'Donation Candidates',
      description: 'Find items for donation (unused items)',
      icon: Heart,
      color: 'pink'
    },
    {
      type: 'food',
      name: 'Food Items Only',
      description: 'Export all food and perishable items',
      icon: Calendar,
      color: 'orange'
    }
  ]

  const handleExport = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        type: exportType,
        format: format,
        ...(selectedRoom !== 'all' && { roomId: selectedRoom }),
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(minValue && { minValue }),
        ...(maxValue && { maxValue }),
        ...(exportType === 'donation' && { donationDays })
      })

      console.log('🔄 Export request:', { exportType, params: params.toString() })
      
      const response = await fetch(`/api/export?${params}`)
      
      console.log('📊 Export response:', { 
        status: response.status, 
        contentType: response.headers.get('content-type') 
      })

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`)
      }
      
      if (response.headers.get('content-type')?.includes('text/csv')) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `garagegrid-${exportType}-${timestamp}.${format}`
        a.download = filename
        
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast.success(`Export completed successfully! Downloaded: ${filename}`)
        console.log('✅ CSV export completed:', filename)
      } else if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json()
        console.log('📋 Export JSON response:', data)
        
        if (data.count === 0) {
          toast.error(`No items found matching your criteria for ${exportOptions.find(opt => opt.type === exportType)?.name || exportType}`)
        } else {
          toast.success(`Found ${data.count} items for export`)
        }
      } else {
        // Handle unexpected content type (like HTML from auth redirect)
        const responseText = await response.text()
        console.log('❌ Unexpected response type:', response.headers.get('content-type'))
        console.log('❌ Response preview:', responseText.substring(0, 200))
        
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          console.log('❌ Authentication redirect detected')
          toast.error('Session expired. Please refresh the page and sign in again.')
        } else if (responseText.includes('No items found')) {
          toast.error(`No items found for ${exportOptions.find(opt => opt.type === exportType)?.name || exportType} export`)
        } else {
          toast.error(`Failed to export ${exportOptions.find(opt => opt.type === exportType)?.name || exportType}. Please try again.`)
        }
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  if (loading && status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Download className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Export Data</h1>
          </div>
        </div>
        <p className="text-gray-600">
          Export your inventory data in various formats for backup, analysis, or sharing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Export Options */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Export Options
              </CardTitle>
              <CardDescription>
                Choose what data you want to export
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Export Type Selection */}
              <div className="space-y-4">
                <div>
                  <Label>Export Type</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {exportOptions.map((option) => {
                      const IconComponent = option.icon
                      return (
                        <Card
                          key={option.type}
                          className={`cursor-pointer transition-all duration-200 ${
                            exportType === option.type
                              ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
                              : 'hover:shadow-md border-gray-200'
                          }`}
                          onClick={() => setExportType(option.type)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                option.color === 'blue' ? 'bg-blue-100' :
                                option.color === 'green' ? 'bg-green-100' :
                                option.color === 'yellow' ? 'bg-yellow-100' :
                                option.color === 'pink' ? 'bg-pink-100' :
                                option.color === 'orange' ? 'bg-orange-100' :
                                option.color === 'purple' ? 'bg-purple-100' :
                                option.color === 'gray' ? 'bg-gray-100' :
                                'bg-gray-100'
                              }`}>
                                <IconComponent className={`h-4 w-4 ${
                                  option.color === 'blue' ? 'text-blue-600' :
                                  option.color === 'green' ? 'text-green-600' :
                                  option.color === 'yellow' ? 'text-yellow-600' :
                                  option.color === 'pink' ? 'text-pink-600' :
                                  option.color === 'orange' ? 'text-orange-600' :
                                  option.color === 'purple' ? 'text-purple-600' :
                                  option.color === 'gray' ? 'text-gray-600' :
                                  'text-gray-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-medium">{option.name}</h4>
                                  {option.recommended && (
                                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{option.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  {exportType === 'category' && (
                    <div>
                      <Label htmlFor="category">Category</Label>
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
                  )}

                  {exportType === 'value' && (
                    <>
                      <div>
                        <Label htmlFor="minValue">Minimum Value ($)</Label>
                        <Input
                          id="minValue"
                          type="number"
                          value={minValue}
                          onChange={(e) => setMinValue(e.target.value)}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxValue">Maximum Value ($)</Label>
                        <Input
                          id="maxValue"
                          type="number"
                          value={maxValue}
                          onChange={(e) => setMaxValue(e.target.value)}
                          placeholder="No limit"
                          min="0"
                        />
                      </div>
                    </>
                  )}

                  {exportType === 'donation' && (
                    <div>
                      <Label htmlFor="donationDays">Unused for (days)</Label>
                      <Select value={donationDays} onValueChange={setDonationDays}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="180">6 months</SelectItem>
                          <SelectItem value="365">1 year</SelectItem>
                          <SelectItem value="730">2 years</SelectItem>
                          <SelectItem value="1095">3 years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Settings & Actions */}
        <div className="space-y-6">
          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Format</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div 
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    format === 'csv' ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setFormat('csv')}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">CSV</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Universal format, works with Excel and Google Sheets
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Action */}
          <Card>
            <CardContent className="p-6">
              <Button 
                onClick={handleExport}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800 mb-1">Tips</h4>
                  <ul className="text-xs text-amber-700 space-y-1">
                    <li>• CSV files open in Excel, Google Sheets, and other spreadsheet apps</li>
                    <li>• Use "Complete Inventory" for full backup</li>
                    <li>• "Donation Candidates" helps declutter unused items</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
