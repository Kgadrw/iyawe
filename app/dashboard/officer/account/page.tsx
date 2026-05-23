'use client'

import { useEffect, useState, FormEvent, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { apiRequest, API_ENDPOINTS } from '@/lib/api'
import { registerRoleLabel } from '@/lib/dashboard-routes'
import { User, Mail, Phone, Shield, ArrowLeft, Pencil, Building2 } from 'lucide-react'

type Profile = {
  id: string
  email: string
  name: string
  phone: string
  stationName?: string
  role: string
  createdAt?: string
}

const STAFF_STATION_ROLES = ['OFFICER', 'INSTITUTION']

function profileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatDate(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User
  label: string
  value: string
}) {
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-900 break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function OfficerAccountPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    stationName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiRequest(API_ENDPOINTS.me)
        const data = await res.json()
        if (!res.ok || !data.user) {
          toast({
            title: 'Error',
            description: 'Could not load your profile',
            variant: 'destructive',
          })
          return
        }
        setProfile(data.user)
        setForm({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          stationName: data.user.stationName || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } catch {
        toast({
          title: 'Error',
          description: 'Could not load your profile',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [toast])

  const hasUnsavedChanges = useMemo(() => {
    if (!profile) return false
    return (
      form.name.trim() !== (profile.name || '').trim() ||
      form.email.trim() !== (profile.email || '').trim() ||
      form.phone.trim() !== (profile.phone || '').trim() ||
      form.stationName.trim() !== (profile.stationName || '').trim() ||
      !!form.newPassword
    )
  }, [profile, form])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const body: Record<string, string> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      }
      if (profile && STAFF_STATION_ROLES.includes(profile.role)) {
        body.stationName = form.stationName.trim()
      }
      if (form.newPassword) {
        body.currentPassword = form.currentPassword
        body.newPassword = form.newPassword
      }

      const res = await apiRequest(API_ENDPOINTS.me, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save',
          variant: 'destructive',
        })
        return
      }

      setProfile(data.user)
      setForm((prev) => ({
        ...prev,
        name: data.user.name || '',
        email: data.user.email || '',
        phone: data.user.phone || '',
        stationName: data.user.stationName || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
      toast({ title: 'Saved', description: 'Your profile was updated.' })
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center w-full">
        <p className="text-sm text-slate-600">Loading profile…</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-12">
        <p className="text-sm text-slate-600">
          Unable to load profile.{' '}
          <Link href="/login" className="text-blue-700 underline">
            Sign in again
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl text-slate-900">My profile</h1>
          <p className="mt-1 text-sm text-slate-600">
            View your account details and update them when needed.
          </p>
        </div>
        <Button variant="outline" size="sm" className="w-full sm:w-auto shrink-0" asChild>
          <Link href="/dashboard/officer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to reports
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="h-full">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-normal text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              View profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4 pb-6 border-b border-slate-100">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#0c2340] text-2xl text-white"
                aria-hidden
              >
                {profileInitials(profile.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg text-slate-900 break-words">{profile.name}</p>
                <p className="text-sm text-slate-500 mt-0.5">{registerRoleLabel(profile.role)}</p>
                <p className="text-xs text-slate-400 mt-2">Member since {formatDate(profile.createdAt)}</p>
              </div>
            </div>

            <div className="mt-2">
              {STAFF_STATION_ROLES.includes(profile.role) ? (
                <ProfileField
                  icon={Building2}
                  label="Station name"
                  value={profile.stationName || 'Not set — edit to add'}
                />
              ) : null}
              <ProfileField icon={Mail} label="Email" value={profile.email} />
              <ProfileField icon={Phone} label="Phone" value={profile.phone} />
              <ProfileField icon={Shield} label="Role" value={registerRoleLabel(profile.role)} />
            </div>

            {hasUnsavedChanges && (
              <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                You have unsaved edits. Save on the right to update this view.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-normal text-slate-900 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-slate-500" />
              Edit profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    autoComplete="tel"
                  />
                </div>
                {STAFF_STATION_ROLES.includes(profile.role) ? (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="stationName">Station name</Label>
                    <Input
                      id="stationName"
                      placeholder="e.g. Station Muhima Downtown"
                      value={form.stationName}
                      onChange={(e) => setForm({ ...form, stationName: e.target.value })}
                    />
                    <p className="text-xs text-slate-500">
                      Shown on the public site so people know which station holds each document.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-200 pt-6 space-y-4">
                <p className="text-sm text-slate-600">Change password (optional)</p>
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={form.currentPassword}
                    onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={form.newPassword}
                      onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                      autoComplete="new-password"
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      autoComplete="new-password"
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    setForm({
                      name: profile.name || '',
                      email: profile.email || '',
                      phone: profile.phone || '',
                      stationName: profile.stationName || '',
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    })
                  }
                  disabled={saving || !hasUnsavedChanges}
                >
                  Reset changes
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
