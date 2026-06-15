/** YYYY-MM-DD for &lt;input type="date" max="..."&gt; — local calendar day. */
export function maxLostDateInputValue(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Returns an error message, or null if the date is empty or valid (not in the future). */
export function validateLostDateNotFuture(value: string | undefined | null): string | null {
  if (!value?.trim()) return null

  const parts = value.trim().split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return 'Enter a valid date'
  }

  const [year, month, day] = parts
  const selected = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (selected.getFullYear() !== year || selected.getMonth() !== month - 1 || selected.getDate() !== day) {
    return 'Enter a valid date'
  }

  if (selected > today) {
    return 'Lost date cannot be in the future'
  }

  return null
}
