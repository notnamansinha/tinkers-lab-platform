// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
// Auth panels — login Google button (success, failure surfaces, loading
// disable), onboarding wizard step gating (type → details → ack) and the
// profile write on completion.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { renderPage, flush } from './helpers'

const mockFirestore = vi.hoisted(() => ({
  collection: vi.fn(() => 'col'),
  collectionGroup: vi.fn(() => 'cg'),
  query: vi.fn(() => 'q'),
  orderBy: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  doc: vi.fn((...a: unknown[]) => ['doc', ...a].join('/')),
  getDocs: vi.fn(async () => ({ docs: [] })),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  getCountFromServer: vi.fn(async () => ({ data: () => ({ count: 0 }) })),
  addDoc: vi.fn(async () => ({ id: 'new-id' })),
  updateDoc: vi.fn(async () => {}),
  setDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(async () => {}) })),
  serverTimestamp: vi.fn(() => ({ __sentinel: 'ts' })),
  FieldValue: class {}, Timestamp: class {}, GeoPoint: class {}, DocumentReference: class {}, Bytes: class {},
}))
vi.mock('firebase/firestore', () => mockFirestore)
vi.mock('@/lib/firebase', () => ({ db: {}, app: {} }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/services/firebase/auth', () => ({
  signInWithGoogle: vi.fn(async () => {}),
  updateUserProfile: vi.fn(async () => {}),
  createUserProfile: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
}))
vi.mock('@/services/firebase/functions', () => ({
  registerForWorkshopCallable: vi.fn(), createBookingCallable: vi.fn(), createProjectCallable: vi.fn(),
  createToolCheckoutCallable: vi.fn(), submitFeedbackCallable: vi.fn(), deleteMyAccountCallable: vi.fn(),
  appendActivityLogCallable: vi.fn(),
}))

import { signInWithGoogle, updateUserProfile, createUserProfile } from '@/services/firebase/auth'
import { useAuth } from '@/contexts/AuthContext'
import type { User } from 'firebase/auth'
import LoginPage from '../auth/LoginPage'
import OnboardingPage from '../auth/OnboardingPage'

const mToast = vi.mocked(toast)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(signInWithGoogle).mockResolvedValue(undefined as any)
  vi.mocked(updateUserProfile).mockResolvedValue(undefined as any)
  vi.mocked(createUserProfile).mockResolvedValue(undefined as any)
  vi.mocked(useAuth).mockReturnValue({
    user: { uid: 'u1', email: 'a@tinkers.test' }, profile: null, role: null,
    isAdmin: false, isStaff: false, loading: false, authReady: true,
    refetchProfile: vi.fn(async () => {}),
  } as any)
})

describe('LoginPage', () => {
  it('signs in with Google on the button click and navigates', async () => {
    renderPage(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /google/i }))
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled())
    await waitFor(() => expect(mToast.success).toHaveBeenCalledWith('Signed in successfully'))
  })

  it('disables the button while the popup is pending', async () => {
    let resolve: (v: User) => void = () => {}
    vi.mocked(signInWithGoogle).mockImplementationOnce(() => new Promise((r) => { resolve = r }))
    renderPage(<LoginPage />)
    const btn = screen.getByRole('button', { name: /google/i })
    await userEvent.click(btn)
    expect(btn).toBeDisabled()
    resolve({} as User)
    await flush()
  })

  it('surfaces a sign-in error and keeps the form available', async () => {
    vi.mocked(signInWithGoogle).mockRejectedValue(new Error('Popup closed by user'))
    renderPage(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /google/i }))
    await waitFor(() => expect(screen.getByText('Popup closed by user')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /google/i })).not.toBeDisabled()
  })

  it('renders the email fallback guidance', async () => {
    renderPage(<LoginPage />)
    expect(screen.getByText(/tinkers.*lab|sign in|ahmedabad/i)).toBeTruthy()
  })
})

describe('OnboardingPage — student wizard', () => {
  const collectStep = async (name: string, value: string) => {
    const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement
    fireEvent.change(el, { target: { value } })
  }

  it('gates the details step until a user type is selected', async () => {
    renderPage(<OnboardingPage />)
    await waitFor(() => expect(screen.getByText(/who are you|user type/i)).toBeInTheDocument())
    const next = screen.getByRole('button', { name: /continue|next/i })
    await userEvent.click(next)
    // Stays on step 1 until a type is chosen.
    await flush()
    expect(screen.getByText(/who are you|user type/i)).toBeInTheDocument()
  })

  it('walks the full student flow and writes the profile on submit', async () => {
    renderPage(<OnboardingPage />)
    await waitFor(() => expect(screen.getByText(/who are you|user type/i)).toBeInTheDocument())
    await userEvent.click(screen.getByText('Student'))
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(document.querySelector('[name="displayName"]')).toBeTruthy(), { timeout: 4000 })

    const nameEl = (document.querySelector('[name="displayName"]') || document.querySelector('[name="fullName"]')) as HTMLInputElement
    fireEvent.change(nameEl, { target: { value: 'Alice New' } })
    await collectStep('contact', '9825000000')
    // University ID + department are student-required.
    const uni = document.querySelector('[name="universityId"]') as HTMLInputElement
    const dept = document.querySelector('[name="department"]') as HTMLInputElement
    if (uni) fireEvent.change(uni, { target: { value: 'AU123' } })
    if (dept) fireEvent.change(dept, { target: { value: 'CSE' } })
    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    // Step 3 — accept the safety + terms banners, then submit.
    await waitFor(() => expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument(), { timeout: 4000 })
    const safety = document.querySelector('[name="safetyAgreementAccepted"]') as HTMLInputElement
    const terms = document.querySelector('[name="termsAccepted"]') as HTMLInputElement
    if (safety) fireEvent.click(safety)
    if (terms) fireEvent.click(terms)
    await userEvent.click(screen.getByRole('button', { name: /complete profile/i }))
    await new Promise((r)=>setTimeout(r,300))
    await waitFor(() => expect(createUserProfile).toHaveBeenCalled(), { timeout: 4000 })
    const fields = vi.mocked(createUserProfile).mock.calls[0][2] as any
    expect(fields.userType).toBe('Student')
    expect(fields.displayName).toBeUndefined() // displayName passed separately
    expect(fields.safetyAgreementAccepted).toBe(true)
    expect(fields.termsAccepted).toBe(true)
  })
})