/**
 * Handle logout - clear local storage and token
 */
export async function handleLogout() {
  try {
    // Clear token from localStorage
    localStorage.removeItem('auth_token')
    
    // Call logout endpoint to clear server-side session
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    
    // Redirect to login
    window.location.href = '/login'
  } catch (error) {
    console.error('Logout error:', error)
    // Still redirect even if API call fails
    window.location.href = '/login'
  }
}
