

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromHeaders } from '@/lib/auth-utils'
import { RBACService } from '@/lib/rbac'

interface Params {
  id: string
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  try {
    // Get authenticated user
    const user = await getUserFromHeaders();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check permission - admins can deactivate users
    if (!RBACService.hasPermission(user.role, user.permissions || null, 'users:update')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, role: true, name: true }
    })

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Prevent users from deactivating themselves
    if (params.id === user.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot deactivate your own account' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Prevent deactivation of super admins (unless by another super admin)
    if (targetUser.role === 'super_admin' && !RBACService.isSuperAdmin(user.role)) {
      return new Response(
        JSON.stringify({ error: 'Cannot deactivate super admin accounts' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // For now, we'll implement deactivation by setting name to include "(DEACTIVATED)"
    // In a full implementation, you'd add an 'active' field to the User model
    const deactivatedName = targetUser.name ? 
      `${targetUser.name} (DEACTIVATED)` : 
      `${targetUser.email} (DEACTIVATED)`

    await prisma.user.update({
      where: { id: params.id },
      data: {
        name: deactivatedName,
        updatedAt: new Date()
      }
    })

    return new Response(
      JSON.stringify({
        message: `User ${targetUser.email} has been deactivated successfully`,
        note: 'User account is marked as deactivated. Consider adding an "active" field for better implementation.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error deactivating user:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to deactivate user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

