
'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff } from 'lucide-react'

export default function SignIn() {
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
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        // Refresh session and redirect
        await getSession()
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
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center">
              <img 
                src="/garagegrid-logo.png" 
                alt="GarageGrid Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          
          {/* Brand & Tagline */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">
              GarageGrid Pro
            </h1>
            <p className="text-lg text-white/90 font-medium leading-relaxed">
              Your complete home organization &<br/>
              kitchen management system
            </p>
          </div>
          
          {/* Feature Showcase - CLIENT APPROVED TEXT - DO NOT MODIFY WITHOUT WRITTEN APPROVAL */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-white/90 text-sm font-medium mb-3">
              "I'd like my app to…"
            </p>
            <div className="space-y-3 text-sm text-white/90">
              <div className="flex items-center text-left pl-2">
                <span>📸 Snap a photo → add an item instantly</span>
              </div>
              <div className="flex items-center text-left pl-2">
                <span>🥘 Turn pantry inventory into meal ideas</span>
              </div>
              <div className="flex items-center text-left pl-2">
                <span>📦 Stay organized, stress-free</span>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Login Form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username/Email Field */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                *Username/Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Username/Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-10 text-sm px-3 border-gray-300 placeholder:text-gray-400"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                *Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10 text-sm px-3 pr-10 border-gray-300 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* reCAPTCHA-style checkbox */}
            <div className="flex items-center justify-center py-2">
              <div className="border border-gray-300 rounded p-3 bg-gray-50 flex items-center space-x-3 w-full max-w-xs">
                <input
                  type="checkbox"
                  id="captcha"
                  checked={captchaChecked}
                  onChange={(e) => setCaptchaChecked(e.target.checked)}
                  className="h-5 w-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <label htmlFor="captcha" className="text-sm font-medium text-gray-700">
                  I'm not a robot
                </label>
                <div className="ml-auto">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-sm"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Login Button */}
            <Button 
              type="submit" 
              className="w-full h-10 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={loading}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </Button>
          </form>
        </div>

        {/* Call-to-Action & Footer Links */}
        <div className="space-y-3">
          {/* Prominent Create Account Button */}
          <div className="text-center">
            <Link href="/auth/signup">
              <Button className="w-full h-10 text-sm font-medium bg-white hover:bg-gray-50 text-blue-600 border-2 border-white shadow-lg hover:shadow-xl transition-all duration-200">
                Create Account
              </Button>
            </Link>
          </div>
          
          {/* Helper Links */}
          <div className="flex justify-center space-x-6 text-xs">
            <Link 
              href="#" 
              className="text-white/80 hover:text-white hover:underline font-medium transition-colors"
              onClick={(e) => {
                e.preventDefault();
                alert('Password reset functionality coming soon!');
              }}
            >
              Forgot Password?
            </Link>
            <Link 
              href="#" 
              className="text-white/80 hover:text-white hover:underline font-medium transition-colors"
              onClick={(e) => {
                e.preventDefault();
                alert('Username recovery functionality coming soon!');
              }}
            >
              Need Help?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
