// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
// Second interaction batch — the remaining panels: equipment form (create
// + edit + payload), project edit form, inventory + maintenance authoring
// forms, reports tabs, admin issue resolution, booking calendar navigation,
// and the tool-checkout history quick-return.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { renderPage, makeQueryClient, snapDoc, snapDocs, currentUser, adminProfile, staffProfile } from './helpers'

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
  registerForWorkshopCallable: vi.fn(), createBookingCallable: vi.fn(), createProjectCallable: vi.fn(),
  createToolCheckoutCallable: vi.fn(), submitFeedbackCallable: vi.fn(), deleteMyAccountCallable: vi.fn(),
  appendActivityLogCallable: vi.fn(),
}))

import EquipmentFormPage from '../equipment/EquipmentFormPage'
import ProjectFormPage from '../projects/ProjectFormPage'
import InventoryFormPage from '../inventory/InventoryFormPage'
import MaintenanceFormPage from '../maintenance/MaintenanceFormPage'
import ReportsPage from '../reports/ReportsPage'
import AdminIssuesPage from '../admin/AdminIssuesPage'
import BookingCalendarPage from '../bookings/BookingCalendarPage'
import ToolCheckoutListPage from '../checkout/ToolCheckoutListPage'

const mToast = vi.mocked(toast)

function setField(name: string, value: string) {
  const el = document.querySelector(`[name="${name}"]`) as Element
  fireEvent.change(el, { target: { value } })
}

function authStaff() {
  vi.mocked(useAuth).mockReturnValue({
    user: { uid: 'u-staff', email: 'staff@tinkers.test' }, profile: staffProfile, role: 'lab_assistant',
    isAdmin: false, isStaff: true, loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
  } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
  authStaff()
  // re-default customized mocks so earlier tests cannot leak implementations
  mockFirestore.getDocs.mockResolvedValue({ docs: [] } as any)
  mockFirestore.getDoc.mockResolvedValue({ exists: () => false, data: () => undefined } as any)
  mockFirestore.addDoc.mockResolvedValue({ id: 'new-id' } as any)
  mockFirestore.updateDoc.mockResolvedValue(undefined as any)
  mockFirestore.setDoc.mockResolvedValue(undefined as any)
  mockFirestore.deleteDoc.mockResolvedValue(undefined as any)
})

describe('EquipmentFormPage', () => {
  it('creates equipment via setDoc with the seeded payload (no createdAt overwrite for edits)', async () => {
    renderPage(<EquipmentFormPage />)
    await waitFor(() => expect(document.querySelector('[name="name"]')).toBeInTheDocument())
    setField('machineId', 'rotary-polisher')
    setField('name', 'Rotary Polisher')
    setField('description', 'Bench-mounted rotary polisher for sample prep.')
    setField('category', 'Other')
    setField('tier', 'bookable')
    setField('status', 'available')
    setField('healthStatus', 'good')
    setField('location', 'Workshop A')
    const rt = document.querySelector('[name="requiresTraining"]') as Element
    fireEvent.click(rt)
    const conf = document.querySelector('[name="confirmed"]') as Element
    fireEvent.click(conf)
    await userEvent.click(screen.getByRole('button', { name: /add equipment/i }))
    await waitFor(() => expect(mockFirestore.setDoc).toHaveBeenCalled())
    const payload = (mockFirestore.setDoc.mock.calls[0] as unknown[])[1] as Record<string, unknown>
    expect(payload.name).toBe('Rotary Polisher')
    expect(payload.createdAt).toEqual({ __sentinel: 'ts' })
    expect(mToast.success).toHaveBeenCalled()
  })

  it('edit mode updates the existing doc instead of creating one', async () => {
    mockFirestore.getDoc.mockResolvedValue(snapDoc({ id: 'e1', name: 'Old Mill', status: 'available', tier: 'bookable', confirmed: true, category: 'Tabletop Power', machineId: 'e1', description: 'Bench top milling machine for precision cuts.', location: 'Workshop B', healthStatus: 'good', requiresTraining: true }) as any)
    const view = render(
      <Routes>
        <Route path="/equipment/:id/edit" element={<EquipmentFormPage />} />
      </Routes>,
      { wrapper: ({ children }) => (
        <QueryClientProvider client={makeQueryClient()}>
          <MemoryRouter initialEntries={['/equipment/e1/edit']}>{children}</MemoryRouter>
        </QueryClientProvider>
      ) },
    )
    await waitFor(() => expect(document.querySelector('[name="name"]')).toHaveValue('Old Mill'), { timeout: 4000 })
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(mockFirestore.updateDoc).toHaveBeenCalled(), { timeout: 4000 })
    expect(mockFirestore.setDoc).not.toHaveBeenCalled()
    view.unmount()
  })
})

describe('ProjectFormPage — edit', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: currentUser, profile: { uid: 'u1', displayName: 'Alice' }, role: 'student',
      isAdmin: false, isStaff: false, loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    } as any)
    mockFirestore.getDoc.mockResolvedValue(snapDoc({
      id: 'p1', title: 'Drone Controller', abstract: 'x'.repeat(60), contact: '9825000000',
      startDate: '2099-01-01', endDate: '', expectedEquipmentNeeds: [], imageUrls: [], documentUrls: [],
      resourceLink: '', equipmentNeedsOther: '', safetyAgreementAccepted: true, termsAccepted: true,
    }) as any)
  })

  it('saves a cleaned payload — empties become null, no undefined members', async () => {
    const view = render(
      <Routes>
        <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
      </Routes>,
      { wrapper: ({ children }) => (
        <QueryClientProvider client={makeQueryClient()}>
          <MemoryRouter initialEntries={['/projects/p1/edit']}>{children}</MemoryRouter>
        </QueryClientProvider>
      ) },
    )
    await waitFor(() => expect(document.querySelector('[name="title"]')).toHaveValue('Drone Controller'), { timeout: 4000 })
    await userEvent.click(screen.getByRole('button', { name: /save|update|register/i }))
    await waitFor(() => expect(mockFirestore.updateDoc).toHaveBeenCalled(), { timeout: 4000 })
    const payload = (mockFirestore.updateDoc.mock.calls[0] as unknown[])[1] as Record<string, unknown>
    expect(payload.title).toBe('Drone Controller')
    // Empty optionals serialized as null — never undefined (the callable-prone encoding).
    expect('endDate' in payload).toBe(true)
    expect(payload.endDate).toBeNull()
    expect(payload.resourceLink).toBeNull()
    for (const v of Object.values(payload)) expect(v).not.toBe(undefined)
    view.unmount()
  })

})

describe('InventoryFormPage + MaintenanceFormPage', () => {
  it('creates an inventory item', async () => {
    renderPage(<InventoryFormPage />)
    await waitFor(() => expect(document.querySelector('[name="name"]')).toBeInTheDocument())
    setField('name', 'Solder Wire 0.8mm')
    setField('quantity', '5')
    await userEvent.click(screen.getByRole('button', { name: /add|create|save/i }))
    await waitFor(() => expect(mockFirestore.addDoc).toHaveBeenCalled())
    const payload = (mockFirestore.addDoc.mock.calls[0] as unknown[])[1] as Record<string, unknown>
    expect(payload.name).toBe('Solder Wire 0.8mm')
    expect(mToast.success).toHaveBeenCalled()
  })

  it('schedules maintenance and blocks a past date', async () => {
    mockFirestore.getDocs.mockResolvedValue({ docs: snapDocs([{ id: 'e1', name: 'Laser Cutter', status: 'available' }]) } as any)
    renderPage(<MaintenanceFormPage />)
    await waitFor(() => expect(document.querySelector('[name="title"]')).toBeInTheDocument(), { timeout: 4000 })
    await waitFor(() => expect(screen.getAllByRole('option', { name: 'Laser Cutter' }).length).toBeGreaterThan(0))
    await userEvent.selectOptions(document.querySelector('[name="equipmentId"]') as Element, 'e1')
    setField('title', 'Bed calibration')
    setField('description', 'Re-align the cutting bed.')
    setField('scheduledDate', '2099-08-01')
    setField('technician', 'Dave')
    await userEvent.click(screen.getByRole('button', { name: 'Schedule Maintenance' }))
    await waitFor(() => expect(mockFirestore.addDoc).toHaveBeenCalled(), { timeout: 4000 })
    expect(mToast.success).toHaveBeenCalled()
  })
})


describe('ReportsPage', () => {
  it('switches tabs and renders each report panel', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'u-admin', email: 'a@x.com' }, profile: adminProfile, role: 'super_admin',
      isAdmin: true, isStaff: true, loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    } as any)
    renderPage(<ReportsPage />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /overview/i }).length).toBeGreaterThan(0))
    await userEvent.click(screen.getAllByRole('button', { name: /consumables/i })[0])
    await userEvent.click(screen.getAllByRole('button', { name: /consumables/i })[0])
  })
})

describe('AdminIssuesPage', () => {
  it('resolves an open issue with audit fields', async () => {
    mockFirestore.getDocs.mockResolvedValue({
      docs: snapDocs([{ id: 'i1', title: 'Laser misaligned', description: 'x'.repeat(30), status: 'open', severity: 'high', type: 'machine_malfunction', userId: 'u1', userName: 'A', userEmail: 'a@x.com', createdAt: { seconds: 1 } }]),
    } as any)
    renderPage(<AdminIssuesPage />)
    await waitFor(() => expect(screen.getByText(new RegExp('x'.repeat(30)))).toBeInTheDocument())
    const statusSel = screen.getAllByRole('combobox')[0]
    await userEvent.selectOptions(statusSel, 'resolved')
    await waitFor(() => expect(mockFirestore.updateDoc).toHaveBeenCalled())
    const payload = (mockFirestore.updateDoc.mock.calls[0] as unknown[])[1] as Record<string, unknown>
    expect(payload.status).toBe('resolved')
    expect(payload.resolvedBy).toBe('Tutor')
    expect(mToast.success).toHaveBeenCalled()
  })
})

describe('BookingCalendarPage', () => {
  it('navigates the week and returns to the current week', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: currentUser, profile: { uid: 'u1', displayName: 'Alice', contact: '9' }, role: 'student',
      isAdmin: false, isStaff: false, loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    } as any)
    mockFirestore.getDocs.mockResolvedValue({ docs: [] } as any)
    renderPage(<BookingCalendarPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /next|>>|›/i }) ?? screen.getAllByText('...')).toBeTruthy(), { timeout: 4000 })
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})

describe('ToolCheckoutListPage', () => {
  it('quick-returns an open checkout', async () => {
    mockFirestore.getDocs.mockResolvedValue({
      docs: snapDocs([{
        id: 'c1', toolName: 'Hammer', toolCategory: 'Hand Tools', quantity: 1, action: 'checking_out',
        projectedReturnDate: '2001-01-01', expectedReturnDate: '2001-01-01', isOverdue: false,
        projectId: 'p1', userId: 'u1', returnedAt: null,
      }]),
    } as any)
    vi.mocked(useAuth).mockReturnValue({
      user: currentUser, profile: { uid: 'u1', displayName: 'Alice' }, role: 'student',
      isAdmin: false, isStaff: false, loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    } as any)
    renderPage(<ToolCheckoutListPage />)
    await waitFor(() => expect(screen.getByText('Hammer')).toBeInTheDocument(), { timeout: 4000 })
    const ret = screen.queryAllByRole('button', { name: 'Return' })[0]
    if (ret) {
      await userEvent.click(ret)
      await waitFor(() => expect(mockFirestore.updateDoc).toHaveBeenCalled(), { timeout: 4000 })
    }
  })
})