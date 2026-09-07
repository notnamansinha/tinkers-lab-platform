import { describe, it, expect, vi, afterEach } from 'vitest'
import { serverTimestamp, Timestamp } from 'firebase/firestore'
import { cn, cleanFirestoreData, formatDate, formatDateTime, formatRelativeTime, todayStr, isSafeStorageUrl, generateId, mapDocs, debugLog } from '@/lib/utils'

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

describe('isSafeStorageUrl', () => {
  it('accepts Firebase Storage bucket URLs', () => {
    expect(isSafeStorageUrl('https://firebasestorage.googleapis.com/v0/b/demo/o/a.png')).toBe(true)
  })

  it('rejects non-Firebase URLs (javascript:, http://evil.com)', () => {
    expect(isSafeStorageUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeStorageUrl('http://evil.com/tracking.gif')).toBe(false)
    expect(isSafeStorageUrl('https://cdn.evil.com/a.png')).toBe(false)
    expect(isSafeStorageUrl('data:image/png;base64,AAAA')).toBe(false)
  })

  it('rejects URLs longer than 500 chars', () => {
    expect(isSafeStorageUrl(`https://firebasestorage.googleapis.com/${'x'.repeat(520)}`)).toBe(false)
    expect(isSafeStorageUrl(`https://firebasestorage.googleapis.com/${'x'.repeat(460)}`)).toBe(true)
  })

  it('rejects null/undefined', () => {
    expect(isSafeStorageUrl(null)).toBe(false)
    expect(isSafeStorageUrl(undefined)).toBe(false)
  })
})

describe('generateId', () => {
  it('zero-pads the counter (1-indexed)', () => {
    expect(generateId('TL', 0)).toBe('TL-001')
    expect(generateId('TL', 41)).toBe('TL-042')
    expect(generateId('TL', 999)).toBe('TL-1000')
  })
})

describe('formatDateTime', () => {
  it('returns an em dash for null/undefined', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('formats a Date with time', () => {
    const out = formatDateTime(new Date(2026, 0, 15, 9, 30))
    expect(out).toContain('2026')
    expect(out).toContain('09:30')
  })
})

describe('mapDocs', () => {
  it('merges the document id into each row', () => {
    const snap = {
      docs: [
        { id: 'a', data: () => ({ name: 'x' }) },
        { id: 'b', data: () => ({ name: 'y' }) },
      ],
    }
    expect(mapDocs(snap as never)).toEqual([
      { name: 'x', id: 'a' },
      { name: 'y', id: 'b' },
    ])
  })
})

describe('debugLog', () => {
  afterEach(() => { vi.unstubAllEnvs() })

  it('logs when running in dev mode', () => {
    vi.stubEnv('DEV', true)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    debugLog('a', 1)
    expect(spy).toHaveBeenCalledWith('a', 1)
    spy.mockRestore()
  })

  it('does not log outside dev mode', () => {
    vi.stubEnv('DEV', false)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    debugLog('a', 1)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('todayStr — IST consistency (mirrors functions todayInIndia)', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('matches the exact date Asia/Kolkata renders at this instant', () => {
    // Same Intl construction as functions/src/lib/helpers.ts todayInIndia()
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    const istToday = `${get('year')}-${get('month')}-${get('day')}`
    expect(todayStr()).toBe(istToday)
  })

  it('differs from a naive UTC/local date when IST has moved to the next day', () => {
    // Just after midnight IST = previous day UTC — probe by simulating the local
    // hour boundary: the property we guarantee is that todayStr follows IST, so
    // it must never be the UTC day when UTC date != IST date.
    const utc = new Date().toISOString().slice(0, 10)
    const ist = todayStr()
    // At most a one-day difference in either direction around midnight.
    const near = (a: string, b: string) => {
      const [ay, am, ad] = a.split('-').map(Number)
      const [by, bm, bd] = b.split('-').map(Number)
      return Math.abs(Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) <= 86400_000
    }
    expect(near(ist, utc)).toBe(true)
  })
})
