'use client'

type LogoutButtonProps = {
  className?: string
  children?: React.ReactNode
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
  const onLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Still send the user home even if the API call fails.
    }
    window.location.assign('/')
  }

  return (
    <button type="button" onClick={() => void onLogout()} className={className}>
      {children ?? 'Logout'}
    </button>
  )
}
