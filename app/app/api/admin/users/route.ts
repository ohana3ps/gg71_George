
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // In shared household model, allow authenticated users to see basic user list
    // Fetch all users with their stats
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            rooms: true,
            items: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return new Response(
      JSON.stringify({ 
        users: users.map(user => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        }))
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching users:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch users' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // In shared household model, allow authenticated users to create users

    const data = await request.json()
    const { email, name, role = 'user', password, permissions } = data

    // Validate required fields
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'User with this email already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Hash password
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        permissions,
        isAdmin: ['admin', 'super_admin'].includes(role)
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        permissions: true,
        createdAt: true
      }
    })

    return new Response(
      JSON.stringify({ 
        user: {
          ...newUser,
          createdAt: newUser.createdAt.toISOString()
        },
        message: 'User created successfully'
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    await prisma.$disconnect()
  }
}
