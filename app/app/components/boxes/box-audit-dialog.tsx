
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react'

interface BoxAuditDialogProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  onBoxNumberSelect?: (boxNumber: number) => void
}

interface AuditData {
  usedNumbers: number[]
  gaps: number[]
  suggestions: number[]
  analytics: {
    totalBoxes: number
    hasGaps: boolean
    largestGap: number
    pattern: string
  }
}

export function BoxAuditDialog({
  isOpen,
  onClose,
  roomId,
  onBoxNumberSelect
}: BoxAuditDialogProps) {
  const [auditData, setAuditData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterMode, setFilterMode] = useState<'all' | 'used' | 'available' | 'gaps'>('all')

  useEffect(() => {
    if (isOpen && roomId) {
      fetchAuditData()
    }
  }, [isOpen, roomId])

  const fetchAuditData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/boxes/suggest-number?roomId=${roomId}`)
      if (response.ok) {
        const data = await response.json()
        setAuditData({
          usedNumbers: data.usedNumbers || [],
          gaps: data.gaps || [],
          suggestions: data.suggestions || [],
          analytics: data.analytics || {
            totalBoxes: 0,
            hasGaps: false,
            largestGap: 0,
            pattern: 'sequential'
          }
        })
      }
    } catch (error) {
      console.error('Error fetching audit data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBoxNumberSelect = (boxNumber: number) => {
    if (onBoxNumberSelect) {
      onBoxNumberSelect(boxNumber)
      onClose()
    }
  }

  const getBoxStatus = (num: number) => {
    if (!auditData) return 'unknown'
    
    if (auditData.usedNumbers.includes(num)) return 'used'
    if (auditData.gaps.includes(num)) return 'gap'
    if (auditData.suggestions.includes(num)) return 'suggested'
    return 'available'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'used':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'gap':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'suggested':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'available':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'used':
        return <XCircle className="w-3 h-3" />
      case 'gap':
        return <AlertCircle className="w-3 h-3" />
      case 'suggested':
        return <CheckCircle className="w-3 h-3" />
      case 'available':
        return <CheckCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  const generateBoxNumbers = () => {
    if (!auditData) return []
    
    const maxUsed = Math.max(...auditData.usedNumbers, 0)
    const maxDisplay = Math.max(maxUsed + 5, 20) // Show at least up to 20 or maxUsed + 5
    
    const numbers = []
    for (let i = 1; i <= maxDisplay; i++) {
      const status = getBoxStatus(i)
      
      // Apply filter
      if (filterMode !== 'all') {
        if (filterMode === 'used' && status !== 'used') continue
        if (filterMode === 'available' && status === 'used') continue
        if (filterMode === 'gaps' && status !== 'gap') continue
      }
      
      numbers.push({
        number: i,
        status,
        isClickable: status !== 'used'
      })
    }
    
    return numbers
  }

  if (!auditData && !loading) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Box Number Audit
          </DialogTitle>
          <DialogDescription>
            View and manage box numbers in this room. Click available numbers to select them.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading audit data...
          </div>
        ) : auditData ? (
          <div className="space-y-6">
            {/* Analytics Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Room Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{auditData.analytics.totalBoxes}</div>
                    <div className="text-sm text-gray-600">Total Boxes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{auditData.gaps.length}</div>
                    <div className="text-sm text-gray-600">Available Gaps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{auditData.suggestions.length}</div>
                    <div className="text-sm text-gray-600">Suggestions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{auditData.analytics.pattern}</div>
                    <div className="text-sm text-gray-600">Pattern</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  Grid View
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List View
                </Button>
              </div>

              <div className="flex gap-2 items-center">
                <Filter className="w-4 h-4 text-gray-500" />
                <Button
                  variant={filterMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterMode('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterMode === 'used' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterMode('used')}
                >
                  Used
                </Button>
                <Button
                  variant={filterMode === 'available' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterMode('available')}
                >
                  Available
                </Button>
                <Button
                  variant={filterMode === 'gaps' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterMode('gaps')}
                >
                  Gaps
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-200 rounded flex items-center justify-center">
                  <XCircle className="w-2 h-2 text-red-600" />
                </div>
                <span className="text-sm">Used</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded flex items-center justify-center">
                  <AlertCircle className="w-2 h-2 text-yellow-600" />
                </div>
                <span className="text-sm">Gap (Available)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-200 rounded flex items-center justify-center">
                  <CheckCircle className="w-2 h-2 text-green-600" />
                </div>
                <span className="text-sm">Suggested</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                  <CheckCircle className="w-2 h-2 text-gray-600" />
                </div>
                <span className="text-sm">Available</span>
              </div>
            </div>

            {/* Box Numbers Display */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-2">
                {generateBoxNumbers().map(({ number, status, isClickable }) => (
                  <button
                    key={number}
                    onClick={() => isClickable && handleBoxNumberSelect(number)}
                    disabled={!isClickable}
                    className={`
                      aspect-square p-2 rounded-lg border-2 text-sm font-medium
                      flex items-center justify-center transition-all
                      ${getStatusColor(status)}
                      ${isClickable ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed opacity-60'}
                      ${status === 'suggested' ? 'ring-2 ring-green-300' : ''}
                    `}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{number}</span>
                      {getStatusIcon(status)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {generateBoxNumbers().map(({ number, status, isClickable }) => (
                  <div
                    key={number}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border
                      ${getStatusColor(status)}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status)}
                      <span className="font-medium">Box {number}</span>
                      <Badge variant="outline" className="capitalize">
                        {status === 'gap' ? 'Available Gap' : status}
                      </Badge>
                    </div>
                    {isClickable && (
                      <Button
                        size="sm"
                        onClick={() => handleBoxNumberSelect(number)}
                      >
                        Select
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            {auditData.suggestions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Select Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {auditData.suggestions.map((num) => (
                      <Button
                        key={num}
                        variant="outline"
                        size="sm"
                        onClick={() => handleBoxNumberSelect(num)}
                        className="bg-green-50 border-green-200 hover:bg-green-100"
                      >
                        Use Box {num}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No data available
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
