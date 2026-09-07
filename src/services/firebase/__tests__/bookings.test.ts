import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDocs, query, where, orderBy, doc, updateDoc, serverTimestamp, collection, collectionGroup } from 'firebase/firestore'

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
    doc: vi.fn(),
    updateDoc: vi.fn(),
    serverTimestamp: vi.fn(() => 'SERVER_TS'),
  }
})
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => async () => ({ data: { checkoutId: 'c1' } })),
}))
vi.mock('../activityLog', () => ({
  logProjectActivity: vi.fn(async () => {}),
}))

// __mocks__ not needed — we stub the firestore read/write fns below.
import { getBookingsForSlot, getBookingById, updateBookingStatus, getProjectBookings } from '../bookings'
import { logProjectActivity } from '../activityLog'

const mGetDocs = vi.mocked(getDocs)
const mUpdateDoc = vi.mocked(updateDoc)
const mLog = logProjectActivity

function docRef(id = 'b1') {
  return { id } as never
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getBookingsForSlot', () => {
  it('queries the slots collection by equipment and date and maps docs', async () => {
    mGetDocs.mockResolvedValue({
      docs: [{ id: 's1', data: () => ({ equipmentId: 'bambu-x1c', date: '2026-01-01' }) }],
    } as never)
    const result = await getBookingsForSlot('bambu-x1c', '2026-01-01')
    expect(where).toHaveBeenCalledWith('equipmentId', '==', 'bambu-x1c')
    expect(where).toHaveBeenCalledWith('date', '==', '2026-01-01')
    expect(collection).toHaveBeenCalled()
    expect(result[0]).toMatchObject({ id: 's1', equipmentId: 'bambu-x1c' })
  })

  it('returns an empty array when no slots exist', async () => {
    mGetDocs.mockResolvedValue({ docs: [], empty: true } as never)
    expect(await getBookingsForSlot('x', '2026-01-01')).toEqual([])
  })
})

describe('getBookingById', () => {
  it('uses a collection-group __name__ query and returns the booking', async () => {
    mGetDocs.mockResolvedValue({
      docs: [{ id: 'b1', data: () => ({ status: 'approved', userId: 'u1' }) }],
    } as never)
    const res = await getBookingById('b1')
    expect(collectionGroup).toHaveBeenCalled()
    expect(where).toHaveBeenCalledWith('__name__', '==', 'b1')
    expect(res).toMatchObject({ id: 'b1', status: 'approved' })
  })

  it('returns null when not found', async () => {
    mGetDocs.mockResolvedValue({ docs: [], empty: true } as never)
    expect(await getBookingById('missing')).toBeNull()
  })
})

describe('updateBookingStatus', () => {
  it('cancels a booking with cancelledBy and appends activity', async () => {
    mUpdateDoc.mockResolvedValue(undefined as never)
    await updateBookingStatus('p1', 'b1', 'cancelled', {
      cancelledBy: 'u1',
      actor: { uid: 'u1', name: 'N', email: 'e@x.com' },
    })
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'projects', 'p1', 'bookings', 'b1')
    const payload = mUpdateDoc.mock.calls[0][1] as unknown as Record<string, unknown>
    expect(payload.status).toBe('cancelled')
    expect(payload.cancelledBy).toBe('u1')
    expect(payload.updatedAt).toBe('SERVER_TS')
    expect(mLog).toHaveBeenCalledWith('p1', expect.objectContaining({ type: 'status_change' }))
  })

  it('rejects a booking with a rejection reason', async () => {
    mUpdateDoc.mockResolvedValue(undefined as never)
    await updateBookingStatus('p1', 'b1', 'rejected', { rejectionReason: 'Conflict' })
    const payload = mUpdateDoc.mock.calls[0][1] as unknown as Record<string, unknown>
    expect(payload.status).toBe('rejected')
    expect(payload.rejectionReason).toBe('Conflict')
    expect(payload).not.toHaveProperty('cancelledBy')
  })

  it('completes a booking without extra audit fields', async () => {
    mUpdateDoc.mockResolvedValue(undefined as never)
    await updateBookingStatus('p1', 'b1', 'completed')
    const payload = mUpdateDoc.mock.calls[0][1] as unknown as Record<string, unknown>
    expect(payload.status).toBe('completed')
    expect(payload).not.toHaveProperty('rejectionReason')
  })
})

describe('getProjectBookings', () => {
  it('queries the project subcollection and sorts by date then time desc', async () => {
    mGetDocs.mockResolvedValue({
      docs: [
        { id: 'a', data: () => ({ date: '2026-01-01', startTime: '09:00' }) },
        { id: 'b', data: () => ({ date: '2026-01-03', startTime: '10:00' }) },
        { id: 'c', data: () => ({ date: '2026-01-02', startTime: '11:00' }) },
      ],
    } as never)
    const res = await getProjectBookings('p1')
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc')
    expect(res.map((b) => b.id)).toEqual(['b', 'c', 'a'])
  })
})

// serverTimestamp import check — referenced via the mocked module above.
expect(serverTimestamp).toBeDefined()
void docRef
void query