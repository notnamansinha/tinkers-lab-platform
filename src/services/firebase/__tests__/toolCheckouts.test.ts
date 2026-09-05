import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/firebase', () => ({ app: {}, auth: {}, db: { __mock: true }, storage: {} }))
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>()
  return {
    ...actual,
    getDocs: vi.fn(),
    query: vi.fn((...args: unknown[]) => ({ __query: args })),
    where: vi.fn(),
    orderBy: vi.fn(),
    collection: vi.fn(),
    collectionGroup: vi.fn(),
    doc: vi.fn((...args: unknown[]) => ({ __ref: args })),
    updateDoc: vi.fn(async () => {}),
    serverTimestamp: vi.fn(() => 'SERVER_TS'),
  }
})
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn(async () => ({ data: { checkoutId: 'c1' } }))),
}))
vi.mock('../activityLog', () => ({
  logProjectActivity: vi.fn(async () => {}),
}))

import { getDocs, updateDoc, collectionGroup, orderBy, where } from 'firebase/firestore'
import {
  createToolCheckout, returnTool, getActiveUserCheckouts, getAllCheckouts,
  getAllActiveCheckouts, isCheckoutOverdue, markCheckoutOverdue,
} from '../toolCheckouts'
import { logProjectActivity } from '../activityLog'
import { createToolCheckoutCallable } from '../functions'

const mGetDocs = vi.mocked(getDocs)
const mUpdateDoc = vi.mocked(updateDoc)

const checkoutDoc = (id: string, data: Record<string, unknown>) => ({ id, data: () => data }) as never

beforeEach(() => {
  vi.clearAllMocks()
})

describe('returnTool', () => {
  it('updates the checkout to returning with condition and clears overdue', async () => {
    await returnTool('p1', 'c1', 'damaged', 'broke a tooth', {
      uid: 'u1', name: 'N', email: 'e@x.com',
    })
    const payload = mUpdateDoc.mock.calls[0][1] as unknown as Record<string, unknown>
    expect(payload.action).toBe('returning')
    expect(payload.conditionAtReturn).toBe('damaged')
    expect(payload.returnedAt).toBe('SERVER_TS')
    expect(payload.isOverdue).toBe(false)
    expect(payload.notes).toBe('broke a tooth')
    expect(logProjectActivity).toHaveBeenCalledWith('p1', expect.objectContaining({ type: 'return' }))
  })

  it('omits notes when none are provided', async () => {
    await returnTool('p1', 'c1', 'good')
    const payload = mUpdateDoc.mock.calls[0][1] as unknown as Record<string, unknown>
    expect(payload).not.toHaveProperty('notes')
  })
})

describe('createToolCheckout', () => {
  it('delegates to the createToolCheckoutCallable and returns the id', async () => {
    const spy = vi.mocked(createToolCheckoutCallable).mockResolvedValue({ data: { checkoutId: 'new-1' } } as never)
    const id = await createToolCheckout({
      projectId: 'p1', toolCategory: 'Hand Tools', toolName: 'Hammer',
      quantity: 1, locationOfUse: 'in_lab', expectedReturnDate: '2099-01-01',
      conditionAtCheckout: 'good', action: 'checking_out', userId: 'u1',
    } as never)
    expect(id).toBe('new-1')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ toolName: 'Hammer', quantity: 1 }))
  })
})

describe('isCheckoutOverdue', () => {
  const base: Record<string, unknown> = { expectedReturnDate: '2000-01-01', returnedAt: null, action: 'checking_out' }

  it('flags a past-due unreturned checkout', () => {
    expect(isCheckoutOverdue(base as never)).toBe(true)
  })

  it('never flags a returned checkout', () => {
    expect(isCheckoutOverdue({ ...base, returnedAt: { seconds: 1 } } as never)).toBe(false)
  })

  it('does not flag a future return date', () => {
    expect(isCheckoutOverdue({ ...base, expectedReturnDate: '2999-01-01' } as never)).toBe(false)
  })

  it('is safe when expectedReturnDate is missing', () => {
    expect(isCheckoutOverdue({ returnedAt: null } as never)).toBe(false)
  })
})

describe('markCheckoutOverdue', () => {
  it('writes isOverdue true with a server timestamp', async () => {
    await markCheckoutOverdue('p1', 'c1')
    const payload = mUpdateDoc.mock.calls[0][1] as unknown as Record<string, unknown>
    expect(payload.isOverdue).toBe(true)
    expect(payload.updatedAt).toBe('SERVER_TS')
  })
})

describe('active/overdue queries', () => {
  const c1 = checkoutDoc('a', { userId: 'u1', action: 'checking_out', returnedAt: null, createdAt: { toMillis: () => 100 } })
  const c2 = checkoutDoc('b', { userId: 'u1', action: 'checking_out', returnedAt: { seconds: 1 }, createdAt: { toMillis: () => 200 } })
  const c3 = checkoutDoc('c', { userId: 'u1', action: 'returning', returnedAt: { seconds: 2 }, createdAt: { toMillis: () => 300 } })

  it('getActiveUserCheckouts filters returnedAt null and sorts newest first', async () => {
    mGetDocs.mockResolvedValue({ docs: [c1, c2, c3] } as never)
    const res = await getActiveUserCheckouts('u1')
    expect(where).toHaveBeenCalledWith('userId', '==', 'u1')
    expect(where).toHaveBeenCalledWith('action', '==', 'checking_out')
    expect(collectionGroup).toHaveBeenCalled()
    expect(res.map((c) => c.id)).toEqual(['a'])
  })

  it('getAllCheckouts sorts by createdAt desc', async () => {
    mGetDocs.mockResolvedValue({ docs: [c1, c2] } as never)
    const res = await getAllCheckouts()
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc')
    expect(res.map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('getAllActiveCheckouts returns only unreturned checkouts', async () => {
    mGetDocs.mockResolvedValue({ docs: [c1, c2] } as never)
    const res = await getAllActiveCheckouts()
    expect(res.map((c) => c.id)).toEqual(['a'])
  })
})