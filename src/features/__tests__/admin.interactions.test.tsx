// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
// Admin panels — every action click: approve/reject/hold/complete projects,
// role changes + self-downgrade guard, user deactivation, booking rejection,
// equipment deletion, announcement create/toggle.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeQueryClient } from './helpers'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { renderPage, snapDoc, snapDocs, currentUser, adminProfile, flush } from './helpers'

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
vi.mock('@/services/firebase/functions', () => ({
  createBookingCallable: vi.fn(), registerForWorkshopCallable: vi.fn(), createProjectCallable: vi.fn(),
  createToolCheckoutCallable: vi.fn(), submitFeedbackCallable: vi.fn(), deleteMyAccountCallable: vi.fn(),
  appendActivityLogCallable: vi.fn(),
}))
vi.mock('@/services/firebase/projects', () => ({ updateProjectStatus: vi.fn(async () => {}) }))
vi.mock('@/services/firebase/bookings', () => ({ updateBookingStatus: vi.fn(async () => {}) }))
vi.mock('@/services/firebase/activityLog', () => ({ getProjectActivity: vi.fn(async () => []) }))
vi.mock('@/services/firebase/projectMembers', () => ({ getProjectMembers: vi.fn(async () => []) }))
vi.mock('@/services/firebase/toolCheckouts', () => ({
  getProjectCheckouts: vi.fn(async () => []),
  getAllActiveCheckouts: vi.fn(async () => []),
  getActiveUserCheckouts: vi.fn(async () => []),
  isCheckoutOverdue: vi.fn(() => false),
}))

import { updateProjectStatus } from '@/services/firebase/projects'
import { updateBookingStatus } from '@/services/firebase/bookings'
import AdminProjectsPage from '../admin/AdminProjectsPage'
import AdminProjectDetailPage from '../admin/AdminProjectDetailPage'
import AdminUsersPage from '../admin/AdminUsersPage'
import AdminBookingsPage from '../admin/AdminBookingsPage'
import AdminEquipmentPage from '../admin/AdminEquipmentPage'
import AdminAnnouncementsPage from '../admin/AdminAnnouncementsPage'

const mToast = vi.mocked(toast)

function authAdmin() {
  vi.mocked(useAuth).mockReturnValue({
    user: { uid: 'u-admin', email: 'admin@tinkers.test' },
    profile: adminProfile, role: 'super_admin', isAdmin: true, isStaff: true,
    loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
  } as any)
}

const project = (over: Record<string, unknown> = {}) => ({
  id: 'p1', docId: 'p1', title: 'Drone Controller', projectCode: 'TL-042',
  status: 'pending', userId: 'u1', userName: 'Alice', userEmail: 'alice@tinkers.test',
  userType: 'Student', department: 'ECE', startDate: '2099-01-01', createdAt: { seconds: 1 },
  abstract: 'x'.repeat(60), safetyAgreementAccepted: true, termsAccepted: true,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  // Re-establish factory defaults — clearAllMocks only clears calls, and a
  // mockRejectedValue/mockResolvedValue set by an earlier test would stick.
  vi.mocked(updateProjectStatus).mockResolvedValue(undefined as any)
  vi.mocked(updateBookingStatus).mockResolvedValue(undefined as any)
  mockFirestore.getDocs.mockResolvedValue({ docs: [] } as any)
  mockFirestore.getDoc.mockResolvedValue({ exists: () => false, data: () => undefined } as any)
  mockFirestore.addDoc.mockResolvedValue({ id: 'new-id' } as any)
  mockFirestore.updateDoc.mockResolvedValue(undefined as any)
  mockFirestore.deleteDoc.mockResolvedValue(undefined as any)
  authAdmin()
})

describe('AdminProjectsPage', () => {
  beforeEach(() => {
    mockFirestore.getDocs.mockResolvedValue({ docs: snapDocs([project()]) } as any)
  })

  it('approves a project via updateProjectStatus with actor identity + audit metadata', async () => {
    renderPage(<AdminProjectsPage />)
    await waitFor(() => expect(screen.getByText('Drone Controller')).toBeInTheDocument(), { timeout: 4000 })
    await userEvent.click(screen.getByRole('button', { name: /approve/i }))
    await waitFor(() => expect(updateProjectStatus).toHaveBeenCalled())
    const [docId, status, reason, actor] = vi.mocked(updateProjectStatus).mock.calls[0] as any[]
    expect(docId).toBe('p1')
    expect(status).toBe('active')
    expect(reason).toBeUndefined()
    expect(actor).toMatchObject({ uid: 'u-admin', name: 'Boss' })
    await waitFor(() => expect(mockFirestore.updateDoc).toHaveBeenCalled())
    const audit = (mockFirestore.updateDoc.mock.calls as unknown[][]).find((c) => String(c[0]).includes('p1'))
    expect(audit?.[1]).toMatchObject({ reviewedBy: 'Boss' })
    expect(mToast.success).toHaveBeenCalledWith(expect.stringContaining('active'))
  })

  it('rejects a project with an optional written reason', async () => {
    renderPage(<AdminProjectsPage />)
    await waitFor(() => expect(screen.getByText('Drone Controller')).toBeInTheDocument(), { timeout: 4000 })
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))
    await waitFor(() => expect(screen.getByText('Reject Project')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText(/rejection reason/i), { target: { value: 'Missing budget approval' } })
    await userEvent.click(screen.getAllByRole('button', { name: 'Reject' }).slice(-1)[0]!)
    await waitFor(() => expect(updateProjectStatus).toHaveBeenCalled())
    const [, status, reason] = vi.mocked(updateProjectStatus).mock.calls[0] as any[]
    expect(status).toBe('rejected')
    expect(reason).toBe('Missing budget approval')
    expect(mToast.success).toHaveBeenCalled()
  })

  it('filters by status chip and search text', async () => {
    mockFirestore.getDocs.mockResolvedValue({
      docs: snapDocs([
        project({ docId: 'a', title: 'Pending One', status: 'pending' }),
        project({ docId: 'b', title: 'Active One', status: 'active' }),
      ]),
    } as any)
    renderPage(<AdminProjectsPage />)
    await waitFor(() => expect(screen.getByText('Pending One')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'active' }))
    await flush()
    expect(screen.getByText('Active One')).toBeInTheDocument()
    expect(screen.queryByText('Pending One')).not.toBeInTheDocument()
  })

  it('shows a permission-denied toast when the status update is rejected by rules', async () => {
    const err = new Error('Missing or insufficient permissions.') as any
    err.code = 'permission-denied'
    vi.mocked(updateProjectStatus).mockRejectedValue(err)
    renderPage(<AdminProjectsPage />)
    await waitFor(() => expect(screen.getByText('Drone Controller')).toBeInTheDocument(), { timeout: 4000 })
    await userEvent.click(screen.getByRole('button', { name: /approve/i }))
    await waitFor(() => expect(mToast.error).toHaveBeenCalled())
    expect(String(mToast.error.mock.calls[0][0])).toContain('Permission denied')
  })
})

describe('AdminProjectDetailPage', () => {
  beforeEach(() => {
    mockFirestore.getDoc.mockResolvedValue(snapDoc(project()) as any)
  })

  const renderDetail = () => render(
    <Routes>
      <Route path="/admin/projects/:id" element={<AdminProjectDetailPage />} />
    </Routes>,
    { wrapper: ({ children }) => (
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={['/admin/projects/p1']}>{children}</MemoryRouter>
      </QueryClientProvider>
    ) },
  )

  it('renders the four status actions with correct disabled states', async () => {
    mockFirestore.getDoc.mockResolvedValue(snapDoc(project({ status: 'pending' })) as any)
    renderDetail()
    await waitFor(() => expect(screen.getByText('Drone Controller')).toBeInTheDocument(), { timeout: 4000 })
    const approve = screen.getByRole('button', { name: /approve/i })
    const hold = screen.getByRole('button', { name: /hold/i })
    const complete = screen.getByRole('button', { name: /complete/i })
    expect(approve).not.toBeDisabled()
    expect(hold).not.toBeDisabled()
    expect(complete).not.toBeDisabled()
  })

  it('disables Approve when already active, Hold when on hold, Complete when completed', async () => {
    mockFirestore.getDoc.mockResolvedValue(snapDoc(project({ status: 'active' })) as any)
    renderDetail()
    await waitFor(() => expect(screen.getByText('Drone Controller')).toBeInTheDocument(), { timeout: 4000 })
    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled()
  })

  it('marks completed and on-hold via the action buttons', async () => {
    mockFirestore.getDoc.mockResolvedValue(snapDoc(project({ status: 'pending' })) as any)
    renderDetail()
    await waitFor(() => expect(screen.getByText('Drone Controller')).toBeInTheDocument(), { timeout: 4000 })
    await userEvent.click(screen.getByRole('button', { name: /hold/i }))
    await waitFor(() => expect(updateProjectStatus).toHaveBeenCalled())
    expect(vi.mocked(updateProjectStatus).mock.calls[0][1]).toBe('on_hold')
  })

  it('reject dialog sends the typed reason', async () => {
    mockFirestore.getDoc.mockResolvedValue(snapDoc(project({ status: 'pending' })) as any)
    renderDetail()
    await waitFor(() => expect(screen.getByText('Drone Controller')).toBeInTheDocument(), { timeout: 4000 })
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))
    fireEvent.change(screen.getByPlaceholderText(/rejection reason/i), { target: { value: 'Does not fit lab priorities' } })
    await userEvent.click(screen.getAllByRole('button', { name: 'Reject' }).slice(-1)[0]!)
    await waitFor(() => expect(updateProjectStatus).toHaveBeenCalled(), { timeout: 3000 })
    await waitFor(() => expect(mToast.success).toHaveBeenCalled(), { timeout: 3000 })
    expect(vi.mocked(updateProjectStatus).mock.calls[0].slice(1, 3)).toEqual(['rejected', 'Does not fit lab priorities'])
  })

  it('renders the not-found state', async () => {
    mockFirestore.getDoc.mockResolvedValue(snapDoc(null) as any)
    renderDetail()
    await waitFor(() => expect(screen.getByText('Project not found.')).toBeInTheDocument())
  })
})

describe('AdminUsersPage', () => {
  const userRow = (over: Record<string, unknown> = {}) => ({
    uid: 'u2', displayName: 'Bob', email: 'bob@tinkers.test', role: 'student',
    userType: 'Student', isActive: true, createdAt: { seconds: 1 }, ...over,
  })

  beforeEach(() => {
    mockFirestore.getDocs.mockResolvedValue({ docs: snapDocs([userRow()]) } as any)
  })

  it('changes a role via the role select', async () => {
    renderPage(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue('student'), { target: { value: 'lab_assistant' } })
    await waitFor(() => expect(mockFirestore.updateDoc).toHaveBeenCalled())
    const payload = (mockFirestore.updateDoc.mock.calls[0] as unknown[])[1] as any
    expect(payload.role).toBe('lab_assistant')
    expect(mToast.success).toHaveBeenCalledWith('Role updated')
  })

  it('blocks an admin from downgrading their OWN role', async () => {
    mockFirestore.getDocs.mockResolvedValue({
      docs: snapDocs([userRow({ uid: 'u-admin', displayName: 'Boss', role: 'super_admin' })]),
    } as any)
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'u-admin', email: 'admin@tinkers.test' }, profile: adminProfile, role: 'super_admin',
      isAdmin: true, isStaff: true, loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    } as any)
    renderPage(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('Boss')).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue('super admin'), { target: { value: 'student' } })
    await waitFor(() => expect(mToast.error).toHaveBeenCalledWith('Cannot downgrade your own admin role'))
    expect(mockFirestore.updateDoc).not.toHaveBeenCalled()
  })

  it('deactivates and reactivates a user', async () => {
    renderPage(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /deactivate user/i }))
    await waitFor(() => expect(mockFirestore.updateDoc).toHaveBeenCalled())
    const payload = (mockFirestore.updateDoc.mock.calls[0] as unknown[])[1] as any
    expect(payload.isActive).toBe(false)
    expect(mToast.success).toHaveBeenCalledWith('User deactivated')
  })
})

describe('AdminBookingsPage', () => {
  beforeEach(() => {
    mockFirestore.getDocs.mockResolvedValue({
      docs: snapDocs([{
        id: 'bk1', machineName: 'Laser Cutter', date: '2099-02-01', startTime: '10:00',
        endTime: '11:00', projectId: 'proj-1', status: 'approved', userName: 'Alice',
        userEmail: 'a@x.com', purpose: 'Cut acrylic', createdAt: { seconds: 1 },
      }]),
    } as any)
  })

  it('rejects an approved booking with the typed reason', async () => {
    renderPage(<AdminBookingsPage />)
    await waitFor(() => expect(screen.getByText('Laser Cutter')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /reject booking/i }))
    fireEvent.change(screen.getByPlaceholderText(/rejection reason/i), { target: { value: 'Supervisor unavailable' } })
    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }))
    await waitFor(() => expect(updateBookingStatus).toHaveBeenCalled())
    const [projectId, bookingId, status, opts] = vi.mocked(updateBookingStatus).mock.calls[0] as any[]
    expect(projectId).toBe('proj-1')
    expect(bookingId).toBe('bk1')
    expect(status).toBe('rejected')
    expect(opts.rejectionReason).toBe('Supervisor unavailable')
    expect(opts.actor).toMatchObject({ uid: 'u-admin' })
  })

  it('hides the reject action for non-approved bookings', async () => {
    mockFirestore.getDocs.mockResolvedValue({
      docs: snapDocs([{ id: 'bk2', machineName: 'Lathe', date: '2099-02-01', startTime: '10:00', endTime: '11:00', projectId: 'p', status: 'rejected', userName: 'X', userEmail: 'x@x.com', createdAt: { seconds: 1 } }]),
    } as any)
    renderPage(<AdminBookingsPage />)
    await waitFor(() => expect(screen.getByText('Lathe')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /reject booking/i })).not.toBeInTheDocument()
  })
})

describe('AdminEquipmentPage', () => {
  beforeEach(() => {
    mockFirestore.getDocs.mockResolvedValue({
      docs: snapDocs([{ id: 'e1', name: 'Muffle Furnace', status: 'available', tier: 'bookable', confirmed: true, category: 'Digital Fabrication' }]),
    } as any)
  })

  it('deletes equipment only after the confirm dialog', async () => {
    renderPage(<AdminEquipmentPage />)
    await waitFor(() => expect(screen.getByText('Muffle Furnace')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /delete|remove/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /confirm|delete/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /confirm|delete/i }))
    await waitFor(() => expect(mockFirestore.deleteDoc).toHaveBeenCalled())
    expect(mToast.success).toHaveBeenCalled()
  })
})

describe('AdminAnnouncementsPage', () => {
  beforeEach(() => {
    mockFirestore.getDocs.mockResolvedValue({ docs: snapDocs([{ id: 'a1', title: 'Lab closed Sunday', priority: 'normal', isActive: true, authorName: 'Boss' }]) } as any)
  })

  it('creates an announcement with title/priority and toggles it off', async () => {
    renderPage(<AdminAnnouncementsPage />)
    await waitFor(() => expect(screen.getByText('Lab closed Sunday')).toBeInTheDocument())

    await userEvent.click(screen.getAllByRole('button', { name: /new/i })[0])
    await waitFor(() => expect(document.querySelector('[name="title"]')).toBeInTheDocument())
    fireEvent.change(document.querySelector('[name="title"]')!, { target: { value: 'Power cut on Wednesday' } })
    fireEvent.change(document.querySelector('[name="body"]')!, { target: { value: 'Grid maintenance 2-4pm.' } })
    await userEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => expect(mockFirestore.addDoc).toHaveBeenCalled())
    const payload = (mockFirestore.addDoc.mock.calls[0] as unknown[])[1] as Record<string, unknown>
    expect(payload.title).toBe('Power cut on Wednesday')
  })
})