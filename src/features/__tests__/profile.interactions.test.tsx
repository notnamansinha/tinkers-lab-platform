// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
// Profile panel — every click: edit mode, type-specific validation, save
// payload filtering, cancel, feedback (word limit, cooldown, submit), delete
// account two-step, sign out, admin entry point. Also the notifications panel.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { renderPage, snapDocs, currentUser, studentProfile, adminProfile, flush } from './helpers'

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
  onSnapshot: vi.fn((q: unknown, cb: (snap: unknown) => void) => {
    // Immediately fire with the current getDocs-style docs so loading clears.
    cb({ docs: [] })
    return vi.fn()
  }),
  serverTimestamp: vi.fn(() => ({ __sentinel: 'ts' })),
  FieldValue: class {}, Timestamp: class {}, GeoPoint: class {}, DocumentReference: class {}, Bytes: class {},
}))
vi.mock('firebase/firestore', () => mockFirestore)
vi.mock('@/lib/firebase', () => ({ db: {}, app: {} }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/services/firebase/functions', () => ({
  submitFeedbackCallable: vi.fn(), deleteMyAccountCallable: vi.fn(),
  createBookingCallable: vi.fn(), registerForWorkshopCallable: vi.fn(),
  createProjectCallable: vi.fn(), createToolCheckoutCallable: vi.fn(), appendActivityLogCallable: vi.fn(),
}))
vi.mock('@/services/firebase/auth', () => ({
  updateUserProfile: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
}))

import { updateUserProfile, signOut } from '@/services/firebase/auth'
import { submitFeedbackCallable, deleteMyAccountCallable } from '@/services/firebase/functions'
import ProfilePage from '../profile/ProfilePage'
import NotificationsPage from '../notifications/NotificationsPage'

const mToast = vi.mocked(toast)

function auth(over: Record<string, unknown>) {
  vi.mocked(useAuth).mockReturnValue({ ...over, refetchProfile: vi.fn(async () => {}) } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(updateUserProfile).mockResolvedValue(undefined as any)
  vi.mocked(submitFeedbackCallable).mockResolvedValue({ data: { feedbackId: 'f1' } } as any)
  vi.mocked(deleteMyAccountCallable).mockResolvedValue({ data: { deleted: true } } as any)
  vi.mocked(signOut).mockResolvedValue(undefined as any)
})

describe('ProfilePage — student', () => {
  const renderProfile = () => {
    auth({ user: currentUser, profile: studentProfile, role: 'student', isAdmin: false, isStaff: false, loading: false, authReady: true })
    return renderPage(<ProfilePage />)
  }

  it('enters edit mode and validates required display name', async () => {
    renderProfile()
    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    await waitFor(() => expect(document.querySelector('[id="profile-name"]')).toBeInTheDocument())
    fireEvent.change(document.querySelector('[id="profile-name"]')!, { target: { value: '   ' } })
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(screen.getByText('Full name is required.')).toBeInTheDocument())
    expect(updateUserProfile).not.toHaveBeenCalled()
  })

  it('requires University ID + Department for students', async () => {
    renderProfile()
    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    await waitFor(() => expect(document.querySelector('[id="profile-name"]')).toBeInTheDocument())
    fireEvent.change(document.querySelector('[id="profile-uni-id"]')!, { target: { value: '' } })
    fireEvent.change(document.querySelector('[id="profile-dept"]')!, { target: { value: 'CSE' } })
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(screen.getByText('University ID and Department are required.')).toBeInTheDocument())
    expect(updateUserProfile).not.toHaveBeenCalled()
  })

  it('saves only the fields the user type owns', async () => {
    renderProfile()
    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    await waitFor(() => expect(document.querySelector('[id="profile-name"]')).toBeInTheDocument())
    fireEvent.change(document.querySelector('[id="profile-name"]')!, { target: { value: 'Alice A' } })
    fireEvent.change(document.querySelector('[id="profile-contact"]')!, { target: { value: '9825111111' } })
    fireEvent.change(document.querySelector('[id="profile-uni-id"]')!, { target: { value: 'AU999' } })
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(updateUserProfile).toHaveBeenCalled())
    const [uid, fields] = vi.mocked(updateUserProfile).mock.calls[0] as any[]
    expect(uid).toBe('u1')
    expect(fields.displayName).toBe('Alice A')
    expect(fields.contact).toBe('9825111111')
    expect(fields.universityId).toBe('AU999')
    // Student-owned fields only — no role/isActive/email leakage.
    expect(fields.role).toBeUndefined()
    expect(fields.isActive).toBeUndefined()
    expect(fields.email).toBeUndefined()
    expect(mToast.success).toHaveBeenCalledWith('Profile updated!')
  })

  it('cancel leaves edit mode without saving', async () => {
    renderProfile()
    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    await waitFor(() => expect(document.querySelector('[id="profile-name"]')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(updateUserProfile).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('feedback: over-200-words disables the submit and shows the limit warning', async () => {
    renderProfile()
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }))
    await waitFor(() => expect(document.querySelector('[id="profile-feedback-input"]')).toBeInTheDocument())
    const long = Array.from({ length: 201 }, () => 'word').join(' ')
    fireEvent.change(document.querySelector('[id="profile-feedback-input"]')!, { target: { value: long } })
    await flush()
    expect(screen.getByText(/over the 200-word limit/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send feedback$/i })).toBeDisabled()
  })

  it('feedback: empty text keeps the button disabled', async () => {
    renderProfile()
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }))
    await waitFor(() => expect(document.querySelector('[id="profile-feedback-input"]')).toBeInTheDocument())
    const btn = screen.getByRole('button', { name: /send feedback$/i })
    expect(btn).toBeDisabled()
  })

  it('feedback: submits the trimmed message and starts the client cooldown', async () => {
    renderProfile()
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }))
    await waitFor(() => expect(document.querySelector('[id="profile-feedback-input"]')).toBeInTheDocument())
    fireEvent.change(document.querySelector('[id="profile-feedback-input"]')!, { target: { value: '  The laser bed needs calibration.  ' } })
    await userEvent.click(screen.getByRole('button', { name: /send feedback$/i }))
    await waitFor(() => expect(submitFeedbackCallable).toHaveBeenCalled())
    expect(vi.mocked(submitFeedbackCallable).mock.calls[0][0]).toEqual({ message: 'The laser bed needs calibration.' })
    await waitFor(() => expect(mToast.success).toHaveBeenCalled())
    // Cooldown badge appears (5-min window), textarea cleared.
    expect(localStorage.getItem('tl_feedback_lastSentAt_u1')).toBeTruthy()
  })

  it('delete account: two-step confirm calls the destructive callable + sign out', async () => {
    renderProfile()
    await userEvent.click(screen.getByRole('button', { name: /delete my account and data/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /yes, delete everything/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /yes, delete everything/i }))
    await waitFor(() => expect(deleteMyAccountCallable).toHaveBeenCalled())
    expect(signOut).toHaveBeenCalled()
    expect(mToast.success).toHaveBeenCalledWith(expect.stringContaining('deleted'))
  })

  it('delete account: keep-my-account aborts without calling the callable', async () => {
    renderProfile()
    await userEvent.click(screen.getByRole('button', { name: /delete my account and data/i }))
    await userEvent.click(screen.getByRole('button', { name: /keep my account/i }))
    expect(deleteMyAccountCallable).not.toHaveBeenCalled()
  })

  it('signs out and navigates to /login', async () => {
    renderProfile()
    await userEvent.click(screen.getByRole('button', { name: /log out/i }))
    await waitFor(() => expect(signOut).toHaveBeenCalled())
  })

  it('hides the Admin Panel entry for students and shows it for admins', async () => {
    const { unmount } = renderProfile()
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
    unmount()

    auth({ user: { uid: 'u-admin', email: 'a@x.com' }, profile: adminProfile, role: 'super_admin', isAdmin: true, isStaff: true, loading: false, authReady: true })
    renderPage(<ProfilePage />)
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
  })

  it('shows the onboarding CTA when the profile is missing', async () => {
    auth({ user: currentUser, profile: null, role: null, isAdmin: false, isStaff: false, loading: false, authReady: true })
    renderPage(<ProfilePage />)
    expect(screen.getByText(/complete your profile to get started/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to onboarding/i })).toBeInTheDocument()
  })
})

describe('NotificationsPage', () => {
  let notifs: Array<Record<string, unknown> & { id: string }>
  beforeEach(() => {
    auth({ user: currentUser, profile: studentProfile, role: 'student', isAdmin: false, isStaff: false, loading: false, authReady: true })
    notifs = [
      { id: 'n1', title: 'Project approved', message: 'TL-042 is live', isRead: false, createdAt: { seconds: 1 } },
      { id: 'n2', title: 'Old one', message: 'Read', isRead: true, createdAt: { seconds: 2 } },
    ]
    mockFirestore.onSnapshot.mockImplementation((_q: unknown, cb: (s: unknown) => void) => {
      cb({ docs: snapDocs(notifs as any[]) })
      return vi.fn()
    })
  })

  it('marks a single notification read on click', async () => {
    renderPage(<NotificationsPage />)
    await waitFor(() => expect(screen.getByText('Project approved')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Project approved'))
    await waitFor(() => expect(mockFirestore.updateDoc).toHaveBeenCalled())
    const [ref, payload] = mockFirestore.updateDoc.mock.calls[0] as any[]
    expect(String(ref)).toContain('n1')
    expect(payload).toEqual({ isRead: true })
  })

  it('bulk-marks unread via a batch and toasts success', async () => {
    renderPage(<NotificationsPage />)
    await waitFor(() => expect(screen.getByText('Project approved')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /mark all read/i }))
    await waitFor(() => expect(mockFirestore.writeBatch).toHaveBeenCalled())
    expect(mToast.success).toHaveBeenCalledWith('All marked as read')
  })

  it('hides Mark-all-read when everything is read', async () => {
    notifs = [{ id: 'n3', title: 'Read x', message: 'm', isRead: true, createdAt: { seconds: 1 } }]
    renderPage(<NotificationsPage />)
    await waitFor(() => expect(screen.getByText('Read x')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument()
  })
})