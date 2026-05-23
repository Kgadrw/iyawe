'use client'

import { useEffect, useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { apiRequest, API_ENDPOINTS } from '@/lib/api'
import {
  ADMIN_CREATABLE_ROLES,
  ADMIN_STAFF_ROLE_OPTIONS,
  registerRoleLabel,
} from '@/lib/dashboard-routes'
import { Trash2 } from 'lucide-react'

type StaffUser = {
  id: string
  email: string
  name: string
  phone?: string
  role: string
  createdAt?: string
}

type StaffRole = (typeof ADMIN_CREATABLE_ROLES)[number]

const defaultForm: {
  name: string
  email: string
  password: string
  phone: string
  role: StaffRole
} = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'OFFICER',
}

export function AdminStaffManager() {
  const { toast } = useToast()
  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ ...defaultForm })

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await apiRequest(API_ENDPOINTS.adminUsers)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load staff')
      setUsers(data.users || [])
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load staff',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await apiRequest(API_ENDPOINTS.adminUsers, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create account')

      toast({
        title: 'Account created',
        description: `${registerRoleLabel(form.role)} account for ${form.email} is ready.`,
      })
      setForm({ ...defaultForm })
      await loadUsers()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create account',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (user: StaffUser) => {
    if (!confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`)) return

    try {
      const res = await apiRequest(API_ENDPOINTS.adminUser(user.id), { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete user')
      toast({ title: 'Removed', description: 'Staff account deleted.' })
      await loadUsers()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete user',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="platform-panel p-4 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-blue-900">Create staff account</h2>
        <p className="mt-1 text-sm text-blue-900/60">
          Officers and institutions sign in with the credentials you set here. They cannot register
          themselves.
        </p>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="staff-role" className="text-blue-900">
              Role
            </Label>
            <Select
              value={form.role}
              onValueChange={(value) => setForm({ ...form, role: value as StaffRole })}
            >
              <SelectTrigger id="staff-role" className="text-blue-900 border-gray-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_STAFF_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-name">Full name</Label>
            <Input
              id="staff-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-phone">Phone (optional)</Label>
            <Input
              id="staff-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="staff-password">Temporary password</Label>
            <Input
              id="staff-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={creating}
              className="rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6"
            >
              {creating ? 'Creating…' : 'Create account'}
            </Button>
          </div>
        </form>
      </div>

      <div className="platform-panel">
        <div className="border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="text-sm sm:text-base font-semibold text-blue-900">Staff accounts</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="px-6 py-10 text-sm text-center text-blue-900/50">No staff accounts yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-blue-900/60">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 sm:px-6 py-3 font-medium text-blue-900">{user.name}</td>
                    <td className="px-4 py-3 text-blue-900/80">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-blue-900">
                        {registerRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-blue-900/60">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {user.role !== 'ADMIN' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(user)}
                          aria-label={`Delete ${user.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
