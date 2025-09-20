
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Scan, 
  Plus, 
  BarChart3, 
  Clock, 
  ChefHat, 
  Camera, 
  Download, 
  DollarSign, 
  X,
  Zap
} from 'lucide-react'

interface QuickActionsOverlayProps {
  isOpen: boolean
  onClose: () => void
  onCreateRoom: () => void
}

export function QuickActionsOverlay({ 
  isOpen, 
  onClose, 
  onCreateRoom 
}: QuickActionsOverlayProps) {
  const router = useRouter()

  const quickActions = [
    {
      id: 'scan-receipt',
      title: 'Scan Receipt',
      description: 'Add multiple items by scanning a receipt',
      icon: Scan,
      color: 'bg-blue-500',
      path: '/receipt-scanner',
      badge: 'Popular',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'analytics',
      title: 'Analytics Dashboard',
      description: 'View detailed insights and trends',
      icon: BarChart3,
      color: 'bg-purple-500',
      path: '/analytics',
    },
    {
      id: 'expiration-dashboard',
      title: 'Expiration Alerts',
      description: 'Check items nearing expiration',
      icon: Clock,
      color: 'bg-orange-500',
      path: '/expiration-dashboard',
      badge: 'Important',
      badgeColor: 'bg-orange-100 text-orange-800'
    },
    {
      id: 'recipe-generator',
      title: 'Recipe Generator',
      description: 'Create recipes from available food items',
      icon: ChefHat,
      color: 'bg-red-500',
      path: '/recipe-generator',
      badge: 'AI-Powered',
      badgeColor: 'bg-red-100 text-red-800'
    },
    {
      id: 'gallery',
      title: 'Item Gallery',
      description: 'Browse all items in a visual gallery',
      icon: Camera,
      color: 'bg-indigo-500',
      path: '/gallery',
    },
    {
      id: 'export',
      title: 'Export Data',
      description: 'Export your inventory in various formats',
      icon: Download,
      color: 'bg-teal-500',
      path: '/export',
    },
    {
      id: 'insurance-report',
      title: 'Insurance Report',
      description: 'Generate reports for insurance claims',
      icon: DollarSign,
      color: 'bg-yellow-500',
      path: '/insurance-report',
    }
  ]

  const handleActionClick = (action: typeof quickActions[0]) => {
    if (action.path) {
      router.push(action.path)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-blue-600" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Fast access to frequently used features
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const IconComponent = action.icon
              
              return (
                <Card 
                  key={action.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-blue-200"
                  onClick={() => handleActionClick(action)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`${action.color} p-2 rounded-lg flex-shrink-0`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">
                            {action.title}
                          </h3>
                          {action.badge && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ml-2 ${action.badgeColor}`}
                            >
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
        
        <div className="border-t bg-gray-50 px-6 py-3">
          <p className="text-xs text-gray-600 text-center">
            Press <kbd className="bg-white border rounded px-1 font-mono">Esc</kbd> to close • 
            <kbd className="bg-white border rounded px-1 font-mono ml-1">Cmd+K</kbd> for universal search
          </p>
        </div>
      </Card>
    </div>
  )
}
