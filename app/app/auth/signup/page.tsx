
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff } from 'lucide-react'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaChecked, setCaptchaChecked] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!captchaChecked) {
      setError('Please verify that you are not a robot')
      setLoading(false)
      return
    }

    try {
      // First, create the account
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        return
      }

      // Then sign them in automatically
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Account created but failed to sign in. Please try signing in manually.')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Centered Logo */}
        <div className="flex justify-center">
          <div className="w-32 h-32 bg-white rounded-xl shadow-lg flex items-center justify-center border">
            <img 
              src="/garagegrid-logo.png" 
              alt="GarageGrid Logo" 
              className="w-28 h-28 object-contain"
            />
          </div>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-lg shadow-sm border p-8 space-y-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Create An Account</h1>
            <p className="text-gray-600 mt-2">Join GarageGrid Pro to start organizing your inventory</p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-medium text-gray-700">
                *Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="h-12 text-base px-4 border-gray-300 placeholder:text-gray-400"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium text-gray-700">
                *Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 text-base px-4 border-gray-300 placeholder:text-gray-400"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium text-gray-700">
                *Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="h-12 text-base px-4 pr-12 border-gray-300 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500">Password must be at least 6 characters long</p>
            </div>

            {/* reCAPTCHA-style checkbox */}
            <div className="flex items-center justify-center">
              <div className="border border-gray-300 rounded p-4 bg-gray-50 flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="captcha"
                  checked={captchaChecked}
                  onChange={(e) => setCaptchaChecked(e.target.checked)}
                  className="h-6 w-6 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <label htmlFor="captcha" className="text-base font-medium text-gray-700">
                  I'm not a robot
                </label>
                <div className="ml-auto">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Create Account Button */}
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium bg-gray-400 hover:bg-gray-500 text-white"
              disabled={loading}
            >
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </Button>
          </form>
        </div>

        {/* Footer Links */}
        <div className="flex justify-center space-x-8 text-base">
          <Link 
            href="#" 
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            onClick={(e) => {
              e.preventDefault();
              alert('Terms of Service page coming soon!');
            }}
          >
            Terms of Service
          </Link>
          <span className="text-gray-400">|</span>
          <Link 
            href="#" 
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            onClick={(e) => {
              e.preventDefault();
              alert('Privacy Policy page coming soon!');
            }}
          >
            Privacy Policy
          </Link>
          <span className="text-gray-400">|</span>
          <Link 
            href="/auth/signin" 
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
