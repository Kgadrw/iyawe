/** Roles allowed to use the staff login flow (not public observers). */
export const STAFF_LOGIN_ROLES = ['ADMIN', 'OFFICER', 'INSTITUTION'] as const

/** Roles an admin can create from the dashboard. */
export const ADMIN_CREATABLE_ROLES = ['OFFICER', 'INSTITUTION'] as const

export const ADMIN_STAFF_ROLE_OPTIONS = [
  { value: 'OFFICER' as const, label: 'Police officer' },
  { value: 'INSTITUTION' as const, label: 'Institution' },
] as const

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  OFFICER: 'Officer',
  INSTITUTION: 'Institution',
  USER: 'Public',
}

export function registerRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? ADMIN_STAFF_ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role
}

export function dashboardPathForStaffRole(role: string): string {
  if (role === 'ADMIN') return '/dashboard/admin'
  if (role === 'OFFICER' || role === 'INSTITUTION') return '/dashboard/officer'
  return '/dashboard'
}
