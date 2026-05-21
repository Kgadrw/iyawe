'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft } from 'lucide-react'
import { apiRequest, API_ENDPOINTS } from '@/lib/api'
import { dashboardPathForStaffRole } from '@/lib/dashboard-routes'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await apiRequest(API_ENDPOINTS.login, {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to login',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Success',
        description: 'Logged in successfully',
      })

      router.push(dashboardPathForStaffRole(data.user?.role ?? ''))
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Link href="/" className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </Link>
      <Card className="w-full max-w-sm border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-3 text-center text-xs text-gray-500">
            <Link href="/register" className="text-blue-700 hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
