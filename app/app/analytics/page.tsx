

'use client'

import { useSession } from 'next-auth/react'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function AnalyticsPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access analytics features</CardDescription>
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
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  <ArrowLeft className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                </Button>
              </Link>
              <div className="h-8 w-px bg-gray-300 hidden sm:block" />
              <h1 className="text-lg sm:text-2xl font-bold text-blue-600 flex items-center gap-1 sm:gap-2 truncate">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="truncate">Analytics</span>
              </h1>
            </div>
            
            {/* Mobile-optimized right section */}
            <div className="flex items-center space-x-1 sm:space-x-4 flex-shrink-0">
              {/* Mobile: Only search icon */}
              <div className="sm:hidden">
                <Link href="/search">
                  <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                    🔍
                  </Button>
                </Link>
              </div>
              
              {/* Desktop: All buttons */}
              <div className="hidden sm:flex items-center space-x-4">
                <Link href="/search">
                  <Button variant="outline" size="sm">
                    🔍 Search
                  </Button>
                </Link>
                <Link href="/rooms">
                  <Button variant="outline" size="sm">
                    🏠 Rooms
                  </Button>
                </Link>
                <Link href="/items">
                  <Button variant="outline" size="sm">
                    📦 Items
                  </Button>
                </Link>
                <span className="text-gray-700 hidden lg:inline">Welcome, {session.user?.name}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              📊 Inventory Analytics & Insights
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get valuable insights into your inventory with comprehensive analytics, 
              charts, and statistics to help you manage your home organization effectively.
            </p>
          </div>

          <AnalyticsDashboard />
        </div>
      </main>
    </div>
  )
}

