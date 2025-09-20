

'use client'

import { useSession } from 'next-auth/react'
import { AdvancedSearch } from '@/components/search/advanced-search'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'

export default function SearchPage() {
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
            <CardDescription>Please sign in to access search features</CardDescription>
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
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="h-8 w-px bg-gray-300" />
              <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                <Search className="w-6 h-6" />
                Advanced Search
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/analytics">
                <Button variant="outline" size="sm">
                  📊 Analytics
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
              <span className="text-gray-700">Welcome, {session.user?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🔍 Advanced Search & Filter
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find anything in your inventory quickly with powerful search and filtering capabilities.
              Search across all fields and use advanced filters to narrow down results.
            </p>
          </div>

          <AdvancedSearch />
        </div>
      </main>
    </div>
  )
}

