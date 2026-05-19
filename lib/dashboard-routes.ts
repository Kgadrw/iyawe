/** Roles allowed to use the staff login flow (not public observers). */
export const STAFF_LOGIN_ROLES = ['ADMIN', 'OFFICER', 'INSTITUTION'] as const

/** Self-service registration (public register page). */
export const PUBLIC_REGISTER_ROLE = 'INSTITUTION' as const

export const REGISTER_ROLE_OPTIONS = [
  { value: PUBLIC_REGISTER_ROLE, label: 'Institution' },
] as const

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  OFFICER: 'Officer',
  INSTITUTION: 'Institution',
  USER: 'Public',
}

export function registerRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? REGISTER_ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role
}

export function dashboardPathForStaffRole(role: string): string {
  if (role === 'ADMIN') return '/dashboard/admin'
  if (role === 'OFFICER' || role === 'INSTITUTION') return '/dashboard/officer'
  return '/dashboard'
}
