import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format Firestore Timestamp or Date to readable string.
 */
export function formatDate(date: Date | { seconds: number } | string | null | undefined): string {
  if (!date) return '—'
  let d: Date
  if (typeof date === 'string') {
    d = new Date(date)
  } else if ('seconds' in date) {
    d = new Date(date.seconds * 1000)
  } else {
    d = date as Date
  }
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | { seconds: number } | null | undefined): string {
  if (!date) return '—'
  let d: Date
  if ('seconds' in date) {
    d = new Date((date as { seconds: number }).seconds * 1000)
  } else {
    d = date as Date
  }
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: Date | { seconds: number } | null | undefined): string {
  if (!date) return '—'
  let d: Date
  if ('seconds' in date) {
    d = new Date((date as { seconds: number }).seconds * 1000)
  } else {
    d = date as Date
  }
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(d)
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function generateId(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(3, '0')}`
}

/**
 * Truncate a string to maxLength, adding ellipsis if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}

/**
 * Capitalize first letter of each word.
 */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}
