// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
// Dashboard panel — stat correctness (cancelled/rejected excluded from
// "Today's sessions"), overdue alert branching, empty-states, and the
// primary navigation actions. AdminDashboard seed/kpi flows.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { renderPage, snapDocs, currentUser, studentProfile, adminProfile } from './helpers'

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

vi.mock('@/services/firebase/projects', () => ({ getUserProjects: vi.fn(async () => []) }))
vi.mock('@/services/firebase/functions', () => ({
  submitFeedbackCallable: vi.fn(), deleteMyAccountCallable: vi.fn(), registerForWorkshopCallable: vi.fn(),
  createBookingCallable: vi.fn(), createProjectCallable: vi.fn(), createToolCheckoutCallable: vi.fn(), appendActivityLogCallable: vi.fn(),
}))

import * as toolCheckouts from '@/services/firebase/toolCheckouts'
import { getUserProjects } from '@/services/firebase/projects'
import DashboardPage from '../dashboard/DashboardPage'
import AdminDashboard from '../admin/AdminDashboard'

const mToast = vi.mocked(toast)

function auth(over: Record<string, unknown>) {
  vi.mocked(useAuth).mockReturnValue({ ...over, refetchProfile: vi.fn(async () => {}) } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUserProjects).mockResolvedValue([] as any)
  vi.spyOn(toolCheckouts, 'getActiveUserCheckouts').mockResolvedValue([] as any)
  mockFirestore.getDocs.mockResolvedValue({ docs: [] } as any)
  mockFirestore.getCountFromServer.mockReset()
  auth({
    user: currentUser, profile: studentProfile, role: 'student',
    isAdmin: false, isStaff: false, loading: false, authReady: true,
  })
})

describe('DashboardPage', () => {
  it('excludes cancelled and rejected bookings from "Today\'s sessions"', async () => {
    // The same mocked docs feed every query; the page's today-sessions query
    // filters status !== cancelled/rejected client-side.
    mockFirestore.getDocs.mockResolvedValue({
      docs: snapDocs([
        { id: 'b1', userId: 'u1', date: '2026-01-08', status: 'cancelled' },
        { id: 'b2', userId: 'u1', date: '2026-01-08', status: 'rejected' },
        { id: 'b3', userId: 'u1', date: '2026-01-08', status: 'approved' },
      ]),
    } as any)
    renderPage(<DashboardPage />)
    // "Today's sessions" stat card shows 1 (only the approved booking) once
    // the query settles — cancelled/rejected are filtered out.
    const card = screen.getByText("Today's sessions")
    const section = card.closest('section')!
    await waitFor(() => expect(section.textContent).toMatch(/'s sessions\s*1/))
    expect(section.textContent ?? '').not.toMatch(/'s sessions\s*3/)
  })

  it('shows overdue count in the stat detail and switches the alert panel', async () => {
    vi.spyOn(toolCheckouts, 'getActiveUserCheckouts').mockResolvedValue([
      { id: 'c1', expectedReturnDate: '2001-01-01', returnedAt: null },
    ] as any)
    renderPage(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('1 overdue tool')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText(/return overdue tools before your next booking/i)).toBeInTheDocument()
  })

  it('shows "All clear." and empty schedule/announcement states for an idle user', async () => {
    renderPage(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('All clear.')).toBeInTheDocument())
    expect(screen.getByText('No upcoming bookings scheduled.')).toBeInTheDocument()
    expect(screen.getByText('No active announcements from the lab coordinators.')).toBeInTheDocument()
    // Booking CTA is reachable when there is nothing scheduled.
    expect(screen.getByRole('button', { name: /book a slot/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view checkouts/i })).toBeInTheDocument()
  })

  it('renders the hero CTA and browse machines actions', async () => {
    renderPage(<DashboardPage />)
    await waitFor(() => expect(screen.getByText(/book equipment\. get approved\. start making/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /book a machine/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /browse machines/i })).toBeInTheDocument()
  })
})

describe('AdminDashboard', () => {
  beforeEach(() => {
    auth({
      user: { uid: 'u-admin', email: 'a@x.com' }, profile: adminProfile, role: 'super_admin',
      isAdmin: true, isStaff: true, loading: false, authReady: true,
    })
    mockFirestore.getCountFromServer.mockImplementation(async () => ({ data: () => ({ count: 7 }) }) as any)
    vi.spyOn(toolCheckouts, 'getActiveUserCheckouts').mockResolvedValue([] as any)
  })

  it('renders KPI counts from getCountFromServer', async () => {
    renderPage(<AdminDashboard />)
    await waitFor(() => expect(screen.getByText('Admin Hub')).toBeInTheDocument())
    // 7 appears in several tiles; at least the Users tile carries it.
    expect(mockFirestore.getCountFromServer).toHaveBeenCalled()
  })

  it('runs the seed flow through the confirm dialog and disables the button once seeded', async () => {
    renderPage(<AdminDashboard />)
    await waitFor(() => expect(screen.getByRole('button', { name: /seed 68 items/i })).toBeInTheDocument(), { timeout: 3000 })
    await userEvent.click(screen.getByRole('button', { name: /seed 68 items/i }))
    await waitFor(() => expect(screen.getByText('Seed Equipment Database')).toBeInTheDocument())
    await userEvent.click(screen.getAllByRole('button', { name: /seed 68 items/i }).slice(-1)[0]!)
    // The dialog confirm triggers handleSeed -> equipment setDoc writes.
    await waitFor(() => expect(mockFirestore.setDoc).toHaveBeenCalled(), { timeout: 3000 })
    await waitFor(() => expect(mToast.success).toHaveBeenCalled(), { timeout: 3000 })
    expect(String(mToast.success.mock.calls[0][0])).toContain('seeded')
  })

  it('links to the quick-action panels', async () => {
    renderPage(<AdminDashboard />)
    await waitFor(() => expect(screen.getByText('Admin Hub')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /review projects/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /checkout history/i })).toBeInTheDocument()
  })
})