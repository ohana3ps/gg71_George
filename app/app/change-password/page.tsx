
'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'
import { AlertCircle, Key, Shield } from 'lucide-react'

export default function ChangePasswordPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (session && !session.user?.forcePasswordChange) {
      // If user doesn't need to change password, redirect to home
      router.push('/')
    }
  }, [session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate passwords match on frontend
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error('New passwords do not match')
        setLoading(false)
        return
      }

      if (formData.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters long')
        setLoading(false)
        return
      }

      console.log('🔄 Submitting password change...')
      
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      console.log('📡 API Response:', { status: response.status, result })

      if (response.ok) {
        console.log('✅ Password change successful')
        
        // Set success state
        setSuccess(true)
        
        // Show success toast
        toast.success('🎉 Password changed successfully! Redirecting...', {
          duration: 4000,
          style: {
            background: '#10B981',
            color: 'white',
            fontWeight: 'bold'
          }
        })
        
        // Clear form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })

        // Update the session to remove the force change flag
        console.log('🔄 Updating session...')
        try {
          await update({
            ...session,
            user: {
              ...session?.user,
              forcePasswordChange: false
            }
          })
          console.log('✅ Session updated successfully')
        } catch (sessionError) {
          console.error('⚠️ Session update error:', sessionError)
          // Continue anyway - the password was changed successfully
        }

        // Delay redirect to allow toast and success state to be seen
        setTimeout(() => {
          console.log('🏠 Redirecting to home...')
          router.push('/')
        }, 3000)

      } else {
        console.error('❌ Password change failed:', result)
        toast.error(result.error || 'Failed to change password', {
          duration: 5000,
          style: {
            background: '#EF4444',
            color: 'white'
          }
        })
      }
    } catch (error) {
      console.error('💥 Password change error:', error)
      toast.error('Error changing password. Please try again.', {
        duration: 5000,
        style: {
          background: '#EF4444',
          color: 'white'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  if (!session) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle className="text-xl">Password Change Required</CardTitle>
          <CardDescription>
            Your administrator has reset your password. Please create a new password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">Password Changed Successfully!</p>
                  <p className="text-sm text-green-600">Redirecting you to the application...</p>
                </div>
              </div>
            </div>
          )}

          {/* Warning Message - only show if not successful */}
          {!success && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Security Notice</p>
                  <p>You must change your temporary password before accessing the application.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset disabled={success || loading}>
              <div>
                <Label htmlFor="current-password">Current Password (Temporary)</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder="Enter your temporary password"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Enter your new password"
                  required
                  minLength={8}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your new password"
                  required
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={loading || success}
                  className="flex-1"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {loading ? 'Changing...' : success ? 'Success!' : 'Change Password'}
                </Button>
                {!success && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLogout}
                    className="px-4"
                    disabled={loading}
                  >
                    Logout
                  </Button>
                )}
              </div>
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
