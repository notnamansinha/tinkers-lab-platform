import { describe, it, expect } from 'vitest'
import { serverTimestamp, Timestamp } from 'firebase/firestore'
import { cn, cleanFirestoreData, formatDate, formatRelativeTime, todayStr } from '@/lib/utils'

describe('cleanFirestoreData', () => {
  it('strips undefined values at the top level', () => {
    expect(cleanFirestoreData({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' })
  })

  it('strips undefined values in nested objects', () => {
    expect(cleanFirestoreData({ nested: { keep: true, drop: undefined } })).toEqual({
      nested: { keep: true },
    })
  })

  it('removes undefined entries from arrays', () => {
    expect(cleanFirestoreData({ list: [1, undefined, 2] })).toEqual({ list: [1, 2] })
  })

  it('preserves Firestore sentinels like serverTimestamp()', () => {
    const sentinel = serverTimestamp()
    const result = cleanFirestoreData({ createdAt: sentinel, note: undefined })
    expect(result).toEqual({ createdAt: sentinel })
  })

  it('preserves Date values', () => {
    const d = new Date()
    expect(cleanFirestoreData({ when: d })).toEqual({ when: d })
  })

  it('returns primitives unchanged', () => {
    expect(cleanFirestoreData('x' as unknown as Record<string, unknown>)).toBe('x')
    expect(cleanFirestoreData(42 as unknown as Record<string, unknown>)).toBe(42)
    expect(cleanFirestoreData(null as unknown as Record<string, unknown>)).toBe(null)
  })
})

describe('formatDate', () => {
  it('returns an em dash for null/undefined', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('formats a Date', () => {
    const out = formatDate(new Date(2026, 0, 15))
    expect(out).toContain('2026')
    expect(out).toContain('Jan')
  })

  it('formats a Firestore Timestamp', () => {
    const ts = Timestamp.fromDate(new Date(2026, 5, 1))
    expect(formatDate(ts)).toContain('2026')
  })

  it('formats a plain { seconds } object', () => {
    const out = formatDate({ seconds: 1767225600, nanoseconds: 0 })
    expect(out).toContain('2026')
  })
})

describe('formatRelativeTime', () => {
  it('returns em dash for null', () => {
    expect(formatRelativeTime(null)).toBe('—')
  })

  it('returns "just now" for a recent timestamp', () => {
    expect(formatRelativeTime(new Date())).toBe('just now')
  })

  it('returns a day-scale relative phrase for past dates', () => {
    const out = formatRelativeTime(new Date(Date.now() - 2 * 86400_000))
    expect(out).toContain('day')
  })
})

describe('todayStr', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('cn', () => {
  it('merges and dedupes tailwind classes', () => {
    expect(cn('px-2', 'px-3')).toBe('px-3')
    expect(cn('bg-red-500', undefined, '', 'text-black')).toBe('bg-red-500 text-black')
  })
})
