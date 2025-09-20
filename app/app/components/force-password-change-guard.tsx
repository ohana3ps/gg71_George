
'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ForcePasswordChangeGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (status === 'loading' || !isClient) return // Still loading

    if (session?.user?.forcePasswordChange) {
      // Only redirect if not already on change-password page
      if (pathname !== '/change-password') {
        router.push('/change-password')
      }
    }
  }, [session, status, router, pathname, isClient])

  // Don't render until client-side to avoid hydration issues
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If user needs to change password and is not on change-password page, show loading
  if (session?.user?.forcePasswordChange && pathname !== '/change-password') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return <>{children}</>
}
