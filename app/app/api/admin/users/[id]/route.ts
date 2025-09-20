
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromHeaders } from '@/lib/auth-utils'
import { Role, RBACService } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

interface Params {
  id: string
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    // Get authenticated user
    const user = await getUserFromHeaders();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check permission
    if (!RBACService.hasPermission(user.role, user.permissions || null, 'users:read')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
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
      }
    })

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        user: {
          ...targetUser,
          createdAt: targetUser.createdAt.toISOString(),
          updatedAt: targetUser.updatedAt.toISOString()
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching user:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    // Get authenticated user
    const user = await getUserFromHeaders();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check permission
    if (!RBACService.hasPermission(user.role, user.permissions || null, 'users:update')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const data = await request.json()
    const { role, permissions, name, isAdmin } = data

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true }
    })

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if user can assign the new role
    if (role && !RBACService.canAssignRole(user.role, role as Role)) {
      return new Response(
        JSON.stringify({ error: 'You cannot assign this role' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Prevent users from modifying themselves to avoid lockout
    if (params.id === user.id && role && role !== user.role) {
      return new Response(
        JSON.stringify({ error: 'You cannot change your own role' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(role && { role }),
        ...(permissions !== undefined && { permissions }),
        ...(name !== undefined && { name }),
        ...(isAdmin !== undefined && { isAdmin }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        permissions: true,
        updatedAt: true
      }
    })

    return new Response(
      JSON.stringify({
        user: {
          ...updatedUser,
          updatedAt: updatedUser.updatedAt.toISOString()
        },
        message: 'User updated successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating user:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to update user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    // Get authenticated user
    const user = await getUserFromHeaders();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    if (!RBACService.isSuperAdmin(user.role)) {
      return new Response(
        JSON.stringify({ error: 'Super admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prevent users from deleting themselves
    if (params.id === user.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, role: true }
    })

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Prevent deletion of super admins (unless by another super admin)
    if (targetUser.role === 'super_admin' && !RBACService.isSuperAdmin(user.role)) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete super admin accounts' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: params.id }
    })

    return new Response(
      JSON.stringify({
        message: `User ${targetUser.email} has been deleted successfully`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error deleting user:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to delete user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
