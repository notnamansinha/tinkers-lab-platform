import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const toDate = (d: any) => d?.seconds ? new Date(d.seconds * 1000) : new Date(d)

export const formatDate = (d: any) => d ? toDate(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const formatDateTime = (d: any) => d ? toDate(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export function formatRelativeTime(date: any): string {
  if (!date) return '—'
  const d = toDate(date), mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  if (mins < 10080) return `${Math.floor(mins / 1440)}d ago`
  return formatDate(d)
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function generateId(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(3, '0')}`
}

