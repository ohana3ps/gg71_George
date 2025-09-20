
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { PermissionGate, usePermissionCheck } from '@/components/rbac/permission-gate'
import { RoleBadge, RoleSelect } from '@/components/rbac/role-badge'
import { Role, Permission, RBACService } from '@/lib/rbac'
import { Users, Shield, Settings, Database, Activity, UserPlus, MoreVertical, Trash2, Edit } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string | null
  role: Role
  isAdmin: boolean
  permissions: Permission[] | null
  createdAt: string
  updatedAt: string
  _count: {
    rooms: number
    items: number
  }
}

interface SystemStats {
  totalUsers: number
  totalRooms: number
  totalItems: number
  adminUsers: number
  activeUsers: number
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const { isAdmin, isSuperAdmin, canAssignRole } = usePermissionCheck()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUserName, setEditingUserName] = useState('')
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'user' as Role,
    temporaryPassword: ''
  })
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [passwordResetDialog, setPasswordResetDialog] = useState<{
    isOpen: boolean
    user: User | null
    customPassword: string
    lastResetPassword: string
  }>({
    isOpen: false,
    user: null,
    customPassword: 'TempPassword123!',
    lastResetPassword: ''
  })

  // Redirect non-admins
  useEffect(() => {
    if (session && !isAdmin()) {
      router.push('/')
      return
    }
  }, [session, isAdmin, router])

  // Fetch users and stats
  useEffect(() => {
    if (isAdmin()) {
      fetchUsers()
      fetchStats()
    }
  }, [isAdmin])

  const fetchUsers = async () => {
    try {
      setFetchError(null) // Clear previous errors
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setFetchError(null)
      } else {
        const errorText = response.status === 401 ? 'Authentication expired - please refresh page' : 'Failed to fetch users'
        setFetchError(errorText)
        console.error('Failed to fetch users:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setFetchError('Network error - please check your connection')
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error('Failed to fetch stats')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: Role) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        toast.success('User role updated successfully')
        await fetchUsers()
        setIsUserDialogOpen(false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update user role')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('Error updating user role')
    }
  }

  const handleUpdateUserName = async (userId: string, newName: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })

      if (response.ok) {
        toast.success('User name updated successfully')
        await fetchUsers()
        // Update the selectedUser to reflect the new name
        setSelectedUser(prev => prev ? { ...prev, name: newName.trim() } : null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update user name')
      }
    } catch (error) {
      console.error('Error updating user name:', error)
      toast.error('Error updating user name')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('User deleted successfully')
        await fetchUsers()
        await fetchStats()
        setIsUserDialogOpen(false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Error deleting user')
    }
  }

  const handleResetPassword = async (userId: string, customPassword?: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customPassword: customPassword || passwordResetDialog.customPassword 
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPasswordResetDialog(prev => ({
          ...prev,
          lastResetPassword: data.tempPassword,
          isOpen: false
        }))
        toast.success(`✅ Password reset successfully!\n🔑 New password: ${data.tempPassword}\n⚠️ User must change this on next login`, { 
          duration: 12000,
          style: { minWidth: '400px' }
        })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      toast.error('Error resetting password')
    }
  }

  const openPasswordResetDialog = (user: User) => {
    setPasswordResetDialog({
      isOpen: true,
      user: user,
      customPassword: 'TempPassword123!',
      lastResetPassword: ''
    })
  }

  const handleDeactivateUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        toast.success('User account deactivated successfully')
        await fetchUsers()
        await fetchStats()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to deactivate user')
      }
    } catch (error) {
      console.error('Error deactivating user:', error)
      toast.error('Error deactivating user')
    }
  }

  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleInviteUser = async () => {
    try {
      if (!inviteForm.email || !inviteForm.name || !inviteForm.temporaryPassword) {
        toast.error('Please fill in all fields')
        return
      }

      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`✅ User created successfully!\n📧 Email: ${data.user.email}\n🔑 Temp Password: ${data.temporaryPassword}\n⚠️ User must change password on first login`, { 
          duration: 8000,
          style: { minWidth: '400px' }
        })
        // Refresh data
        fetchUsers()
        fetchStats()
        setIsInviteDialogOpen(false)
        setInviteForm({ email: '', name: '', role: 'user', temporaryPassword: '' })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Error creating user')
    }
  }

  const handleInviteDialogOpen = () => {
    setInviteForm({
      email: '',
      name: '',
      role: 'user',
      temporaryPassword: generateTemporaryPassword()
    })
    setIsInviteDialogOpen(true)
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!session) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users, permissions, and system settings</p>
        </div>
        <div className="flex items-center gap-4">
          <RoleBadge role={(session.user as any)?.role || 'user'} />
          <Link href="/">
            <Button variant="outline">Return Home</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Admin Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.adminUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRooms}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <PermissionGate requireSuperAdmin fallback={null}>
            <TabsTrigger value="system">System Settings</TabsTrigger>
          </PermissionGate>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <PermissionGate permission="users:create">
              <Button onClick={handleInviteDialogOpen}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </PermissionGate>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fetchError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="text-red-600 text-sm">⚠️</div>
                      <div className="text-sm text-red-800">
                        <p className="font-medium">Unable to load users</p>
                        <p>{fetchError}</p>
                        <button 
                          onClick={fetchUsers}
                          className="mt-2 text-red-600 hover:text-red-700 underline text-sm"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {loading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : filteredUsers.length === 0 && !fetchError ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No users found matching your search' : 'No users found'}
                  </div>
                ) : !fetchError ? (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.name || 'No name'}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <RoleBadge role={user.role} size="sm" />
                            {user.isAdmin && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                                Legacy Admin
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm text-gray-500">
                          <div>{user._count.rooms} rooms</div>
                          <div>{user._count.items} items</div>
                        </div>
                        
                        <PermissionGate permission="users:update">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              setEditingUserName(user.name || '')
                              setIsUserDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </PermissionGate>
                        
                        <PermissionGate permission="users:delete" requireSuperAdmin>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.email}? This will permanently delete their account and all associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </PermissionGate>
                      </div>
                    </div>
                  ))
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <PermissionGate requireSuperAdmin>
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Database className="h-6 w-6 mb-2" />
                    Database Backup
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Activity className="h-6 w-6 mb-2" />
                    System Logs
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Settings className="h-6 w-6 mb-2" />
                    Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </PermissionGate>
      </Tabs>

      {/* User Edit Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user role and permissions
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>Email</Label>
                <Input value={selectedUser.email} disabled />
              </div>
              
              <div>
                <Label>Name</Label>
                <div className="flex gap-2">
                  <Input 
                    value={editingUserName} 
                    onChange={(e) => setEditingUserName(e.target.value)}
                    placeholder="Enter user's name"
                    className="flex-1"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleUpdateUserName(selectedUser.id, editingUserName)}
                    disabled={editingUserName === selectedUser.name}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    💾 Save
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Role</Label>
                <RoleSelect
                  value={selectedUser.role}
                  onChange={(role) => handleUpdateUserRole(selectedUser.id, role)}
                  availableRoles={['viewer', 'user', 'manager', 'admin'].filter(role => 
                    canAssignRole(role as Role)
                  ) as Role[]}
                />
              </div>

              {/* Password Reset Section */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-sm font-medium text-gray-900">Password Management</Label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => openPasswordResetDialog(selectedUser)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                  <p className="text-xs text-gray-500">
                    This will reset the password to a temporary default. User should change it on next login.
                  </p>
                </div>
              </div>

              {/* Account Actions */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-sm font-medium text-gray-900">Account Actions</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    onClick={() => handleDeactivateUser(selectedUser.id)}
                  >
                    Deactivate Account
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteUser(selectedUser.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button
                  onClick={() => setIsUserDialogOpen(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User Account</DialogTitle>
            <DialogDescription>
              Manually create a new user account with temporary password
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="invite-name">Full Name *</Label>
              <Input
                id="invite-name"
                placeholder="John Doe"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="invite-role">Initial Role *</Label>
              <RoleSelect
                value={inviteForm.role}
                onChange={(role) => setInviteForm({ ...inviteForm, role })}
                availableRoles={['viewer', 'user', 'manager', 'admin'].filter(role => 
                  canAssignRole(role as Role)
                ) as Role[]}
              />
            </div>

            <div>
              <Label htmlFor="invite-password">Temporary Password *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="invite-password"
                  type="text"
                  value={inviteForm.temporaryPassword}
                  onChange={(e) => setInviteForm({ ...inviteForm, temporaryPassword: e.target.value })}
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInviteForm({ ...inviteForm, temporaryPassword: generateTemporaryPassword() })}
                >
                  🎲 Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                User will be required to change this password on first login
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 text-sm">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Manual User Setup</p>
                  <p>This creates the user account immediately with the specified credentials. No email will be sent. You'll need to provide the login details to the user manually.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsInviteDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteUser}
                className="flex-1"
                disabled={!inviteForm.email || !inviteForm.name || !inviteForm.temporaryPassword}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={passwordResetDialog.isOpen} onOpenChange={(open) => setPasswordResetDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Set a temporary password for {passwordResetDialog.user?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reset-password">Temporary Password</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="reset-password"
                  type="text"
                  value={passwordResetDialog.customPassword}
                  onChange={(e) => setPasswordResetDialog(prev => ({ 
                    ...prev, 
                    customPassword: e.target.value 
                  }))}
                  className="flex-1 font-mono text-sm"
                  placeholder="Enter temporary password"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPasswordResetDialog(prev => ({ 
                    ...prev, 
                    customPassword: 'TempPassword123!' 
                  }))}
                >
                  🔄 Default
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                User will be required to change this password on their next login
              </p>
            </div>

            {passwordResetDialog.lastResetPassword && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="text-green-600 text-sm">✅</div>
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Password Reset Complete</p>
                    <p className="font-mono text-xs bg-green-100 px-2 py-1 rounded mt-1">
                      {passwordResetDialog.lastResetPassword}
                    </p>
                    <p className="text-xs mt-1">User must change this password on next login</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 text-sm">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Password Reset Process</p>
                  <p>The user will be forced to change this password when they next log in. They cannot access the application until they create a new password.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setPasswordResetDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => passwordResetDialog.user && handleResetPassword(passwordResetDialog.user.id)}
                className="flex-1"
                disabled={!passwordResetDialog.customPassword}
              >
                <Shield className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
