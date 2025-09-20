

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Scan, 
  Plus, 
  BarChart3, 
  Clock, 
  ChefHat, 
  Camera, 
  Download, 
  DollarSign, 
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react'

interface QuickActionsChevronProps {
  onCreateRoom?: () => void
}

export function QuickActionsChevron({ onCreateRoom }: QuickActionsChevronProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const quickActions = [
    {
      id: 'scan-receipt',
      title: 'Receipt Scanner',
      description: 'Scan receipts to add items',
      icon: Scan,
      color: 'bg-blue-500',
      path: '/receipt-scanner',
      badge: 'Popular',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View insights & trends',
      icon: BarChart3,
      color: 'bg-purple-500',
      path: '/analytics',
    },
    {
      id: 'expiration-dashboard',
      title: 'Expiration Tracker',
      description: 'Items nearing expiry',
      icon: Clock,
      color: 'bg-orange-500',
      path: '/expiration-dashboard',
      badge: 'Important',
      badgeColor: 'bg-orange-100 text-orange-800'
    },
    {
      id: 'recipe-generator',
      title: 'Recipe Generator',
      description: 'AI-powered recipes',
      icon: ChefHat,
      color: 'bg-red-500',
      path: '/recipe-generator',
      badge: 'AI',
      badgeColor: 'bg-red-100 text-red-800'
    },
    {
      id: 'gallery',
      title: 'Photo Gallery',
      description: 'Browse all items',
      icon: Camera,
      color: 'bg-indigo-500',
      path: '/gallery',
    },
    {
      id: 'export',
      title: 'Export Data',
      description: 'Download inventory',
      icon: Download,
      color: 'bg-teal-500',
      path: '/export',
    },
    {
      id: 'insurance-report',
      title: 'Insurance Report',
      description: 'Generate claims reports',
      icon: DollarSign,
      color: 'bg-yellow-500',
      path: '/insurance-report',
    },
  ]

  const handleActionClick = (action: typeof quickActions[0]) => {
    if (action.path) {
      router.push(action.path)
    }
    setIsOpen(false)
  }

  return (
    <div className="w-full sm:w-auto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-center"
          >
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Quick Actions</span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4">
          <Card className="w-full border shadow-lg">
            <CardContent className="p-4">
              {/* CLIENT APPROVED: 2-across grid layout - DO NOT MODIFY */}
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto overflow-x-hidden overscroll-x-none touch-pan-y">
                {quickActions.map((action) => {
                  const IconComponent = action.icon
                  
                  return (
                    <Card 
                      key={action.id}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 border hover:border-blue-200 bg-gray-50/50 hover:bg-white"
                      onClick={() => handleActionClick(action)}
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className={`${action.color} p-2 rounded-lg`}>
                            <IconComponent className="h-4 w-4 text-white" />
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1">
                              <h3 className="font-semibold text-xs text-gray-900 truncate">
                                {action.title}
                              </h3>
                              {action.badge && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs px-1 py-0 ${action.badgeColor}`}
                                >
                                  {action.badge}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-xs text-gray-600 leading-tight">
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
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
