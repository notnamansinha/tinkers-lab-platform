import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/firebase', () => ({ app: {}, auth: {}, db: { __mock: true }, storage: {} }))
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>()
  return {
    ...actual,
    getDoc: vi.fn(),
    setDoc: vi.fn(async () => {}),
    serverTimestamp: vi.fn(() => 'SERVER_TS'),
    doc: vi.fn((...args: unknown[]) => ({ __ref: args })),
  }
})
vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>()
  return {
    ...actual,
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
  }
})

import { getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { signInWithGoogle, createUserProfile, updateUserProfile } from '../auth'

const mSetDoc = vi.mocked(setDoc)
const mGetDoc = vi.mocked(getDoc)

function fakeUser(over: Record<string, unknown> = {}) {
  return {
    uid: 'user-123',
    email: 'person@example.com',
    displayName: 'Person',
    ...over,
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signInWithGoogle', () => {
  it('returns the user from a successful popup', async () => {
    const u = fakeUser()
    vi.mocked(signInWithPopup).mockResolvedValue({ user: u } as never)
    await expect(signInWithGoogle()).resolves.toBe(u)
    expect(signInWithRedirect).not.toHaveBeenCalled()
  })

  it('falls back to redirect when the popup is blocked', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/popup-blocked' })
    await expect(signInWithGoogle()).rejects.toThrow('Redirecting to Google...')
    expect(signInWithRedirect).toHaveBeenCalledTimes(1)
  })

  it('falls back to redirect on cross-origin-opener-policy failures', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/cross-origin-opener-policy-failed' })
    await expect(signInWithGoogle()).rejects.toThrow('Redirecting to Google...')
    expect(signInWithRedirect).toHaveBeenCalledTimes(1)
  })

  it('re-throws unrelated auth errors', async () => {
    const err = { code: 'auth/invalid-api-key' }
    vi.mocked(signInWithPopup).mockRejectedValue(err)
    await expect(signInWithGoogle()).rejects.toBe(err)
    expect(signInWithRedirect).not.toHaveBeenCalled()
  })
})

describe('createUserProfile — privilege stripping (defence-in-depth)', () => {
  it('strips role, isActive, email and uid from extraData', async () => {
    mGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: 'student' }) } as never)
    await createUserProfile(fakeUser(), 'Person', {
      role: 'super_admin',
      isActive: false,
      email: 'hacked@example.com',
      uid: 'attacker-uid',
      displayName: 'Forged Name',
      department: 'CS',
      userType: 'Student',
    } as never)

    const written = mSetDoc.mock.calls[0][1] as Record<string, unknown>
    expect(written.role).toBe('student')          // never elevated
    expect(written.isActive).toBe(true)           // never deactivated
    expect(written.email).toBe('person@example.com') // from the auth user
    expect(written.uid).toBe('user-123')          // from the auth user
    expect(written.department).toBe('CS')         // benign field passes through
    expect(written.createdAt).toBe('SERVER_TS')
  })

  it('guarantees a student role even when extraData has no role', async () => {
    mGetDoc.mockResolvedValue({ exists: () => true, data: () => ({}) } as never)
    await createUserProfile(fakeUser(), 'Person', { userType: 'Venture Studio Startup' } as never)
    const written = mSetDoc.mock.calls[0][1] as Record<string, unknown>
    expect(written.role).toBe('student')
    expect(written.userType).toBe('Venture Studio Startup')
  })
})

describe('updateUserProfile — privilege stripping', () => {
  it('strips email, role and isActive from the update payload', async () => {
    await updateUserProfile('user-123', {
      email: 'hacked@example.com',
      role: 'super_admin',
      isActive: false,
      displayName: 'New Name',
      contact: '9999999999',
    } as never)

    const written = mSetDoc.mock.calls[0][1] as Record<string, unknown>
    expect(written).not.toHaveProperty('role')
    expect(written).not.toHaveProperty('isActive')
    expect(written).not.toHaveProperty('email')
    expect(written.displayName).toBe('New Name')
    expect(written.contact).toBe('9999999999')
    expect(written.updatedAt).toBe('SERVER_TS')
  })
})

describe('profile reads', () => {
  it('getUserProfile returns null for a missing doc', async () => {
    mGetDoc.mockResolvedValue({ exists: () => false } as never)
    const { getUserProfile } = await import('../auth')
    expect(await getUserProfile('missing')).toBeNull()
  })

  it('getUserProfile returns data for an existing doc', async () => {
    mGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: 'student' }) } as never)
    const { getUserProfile } = await import('../auth')
    expect(await getUserProfile('u1')).toEqual({ role: 'student' })
  })
})

// keep vitest from complaining about unused mocks
expect(signOut).toBeDefined()
expect(serverTimestamp).toBeDefined()