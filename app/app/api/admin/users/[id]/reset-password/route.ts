

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromHeaders } from '@/lib/auth-utils'
import { RBACService } from '@/lib/rbac'
import bcrypt from 'bcryptjs'

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

    // Check permission - admins can reset passwords
    if (!RBACService.hasPermission(user.role, user.permissions || null, 'users:update')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the custom password from request body (if provided)
    const body = await request.json().catch(() => ({}));
    const customPassword = body.customPassword;

    // Check if target user exists
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

    // Prevent users from resetting their own password through admin
    if (params.id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Use profile settings to change your own password' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Use custom password if provided, otherwise use default temporary password
    const tempPassword = customPassword || 'TempPassword123!'
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    // Update user password and force password change
    await prisma.user.update({
      where: { id: params.id },
      data: {
        password: hashedPassword,
        forcePasswordChange: true,
        updatedAt: new Date()
      }
    })

    return new Response(
      JSON.stringify({
        message: `Password reset successfully for ${targetUser.email}`,
        tempPassword: tempPassword,
        instructions: 'User will be required to change this password on next login'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error resetting password:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to reset password' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    await prisma.$disconnect()
  }
}

