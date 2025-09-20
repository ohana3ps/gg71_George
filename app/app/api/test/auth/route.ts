
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Only allow in test mode
    if (process.env.__NEXT_TEST_MODE !== '1' && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const { email = 'test@garagegrid.com', password = 'test123' } = await request.json().catch(() => ({}))

    // Test user authentication
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isAdmin: true,
        role: true,
        permissions: true,
        forcePasswordChange: true
      }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Test user not found. Please run database seeding.',
        suggestion: 'Run: yarn prisma db seed'
      }, { status: 404 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Invalid credentials' 
      }, { status: 401 })
    }

    // Create a NextAuth-compatible JWT token using jsonwebtoken
    const jwt = await import('jsonwebtoken')
    
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isAdmin: user.isAdmin,
      permissions: user.permissions,
      forcePasswordChange: user.forcePasswordChange,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
      jti: crypto.randomUUID(),
    }

    const token = jwt.sign(payload, process.env.NEXTAUTH_SECRET || 'fallback-secret-for-testing')
    
    // Create response with session cookie
    const response = NextResponse.json({ 
      success: true, 
      message: 'Test authentication successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin
      }
    })
    
    // Set NextAuth session cookie
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })
    
    // Set CSRF token
    response.cookies.set('next-auth.csrf-token', crypto.randomUUID(), {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60
    })
    
    return response
    
  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({ 
      error: 'Authentication test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    // Only allow in test mode
    if (process.env.__NEXT_TEST_MODE !== '1' && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const response = NextResponse.json({ success: true })
    
    // Clear the session cookies
    response.cookies.delete('next-auth.session-token')
    response.cookies.delete('next-auth.csrf-token')
    response.cookies.delete('next-auth.callback-url')
    
    return response
    
  } catch (error) {
    console.error('Test auth cleanup error:', error)
    return NextResponse.json({ error: 'Test auth cleanup failed' }, { status: 500 })
  }
}
