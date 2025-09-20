
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { RBACService } from '@/lib/rbac'

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to create users
    if (!RBACService.hasPermission(currentUser.role as any, currentUser.permissions as any, 'users:create')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { email, name, role, temporaryPassword } = await request.json()

    if (!email || !name || !role || !temporaryPassword) {
      return NextResponse.json(
        { error: 'Email, name, role, and temporary password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['viewer', 'user', 'manager', 'admin', 'super_admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      )
    }

    // Check if current user can assign this role
    if (!RBACService.canAssignRole(currentUser.role as any, role as any)) {
      return NextResponse.json(
        { error: `You don't have permission to assign the role: ${role}` },
        { status: 403 }
      )
    }

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

    // Create user with force password change flag
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
        role: role,
        isAdmin: role === 'admin' || role === 'super_admin',
        forcePasswordChange: true, // This will force password change on first login
        createdBy: session.user.id
      }
    })

    // Return user without password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: userWithoutPassword,
        temporaryPassword: temporaryPassword
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Admin user creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
