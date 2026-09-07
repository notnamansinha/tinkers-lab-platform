// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
// Booking flow + tool checkout + issue reporting — the three high-traffic
// student panels. Drives real clicks: machine/project gating, time-slot
// selection, safety agreement, submit payload assembly (consumables
// pruning, undefined stripping), validation, and error surfaces.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { renderPage, snapDocs, currentUser, studentProfile, flush } from './helpers'

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
  FieldValueSentinel: { increment: vi.fn(), serverTimestamp: vi.fn() },
}))
vi.mock('firebase/firestore', () => mockFirestore)
vi.mock('@/lib/firebase', () => ({ db: {}, app: {} }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))

vi.mock('@/services/firebase/functions', () => ({
  createBookingCallable: vi.fn(),
  registerForWorkshopCallable: vi.fn(),
  createProjectCallable: vi.fn(),
  createToolCheckoutCallable: vi.fn(),
  submitFeedbackCallable: vi.fn(),
  deleteMyAccountCallable: vi.fn(),
  appendActivityLogCallable: vi.fn(),
}))
vi.mock('@/services/firebase/projects', () => ({ getUserProjects: vi.fn(async () => []) }))
vi.mock('@/services/firebase/bookings', () => ({
  getBookingsForSlot: vi.fn(async () => []),
  updateBookingStatus: vi.fn(async () => {}),
}))


import { createBookingCallable } from '@/services/firebase/functions'
import { getUserProjects } from '@/services/firebase/projects'
import { getBookingsForSlot } from '@/services/firebase/bookings'
import { createToolCheckoutCallable, appendActivityLogCallable } from '@/services/firebase/functions'
import * as toolCheckouts from '@/services/firebase/toolCheckouts'
import BookingFormPage from '../bookings/BookingFormPage'
import ToolCheckoutPage from '../checkout/ToolCheckoutPage'
import IssueFormPage from '../issues/IssueFormPage'

const mToast = vi.mocked(toast)


/** Wait until a select has an option matching the label, then return it. */
async function selectByOption(name: string, optionLabel: RegExp, value: string) {
  const matching = await screen.findAllByRole('option', { name: optionLabel })
  expect(matching.length).toBeGreaterThan(0)
  const el = document.querySelector(`[name="${name}"]`) as HTMLSelectElement
  await userEvent.selectOptions(el, value)
  return el
}

function authStudent(over: Record<string, unknown> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user: currentUser, profile: { ...studentProfile, ...over }, role: 'student',
    isAdmin: false, isStaff: false, loading: false, authReady: true,
    refetchProfile: vi.fn(async () => {}),
  } as any)
}

const printer = { id: 'p1', machineId: 'p1', name: 'Bambu X1 Carbon (3D Printer)', tier: 'bookable', confirmed: true, status: 'available', category: 'Digital Fabrication' }
const laser = { id: 'l1', machineId: 'l1', name: 'Laser Cutter', tier: 'bookable', confirmed: true, status: 'available', category: 'Digital Fabrication' }
const unconfirmed = { id: 'uc', machineId: 'uc', name: 'Hidden Printer', tier: 'bookable', confirmed: false, status: 'available', category: 'Digital Fabrication' }
const nonBookable = { id: 'nb', machineId: 'nb', name: 'Drill', tier: 'checkout', confirmed: true, status: 'available', category: 'Power Tools' }

const activeProject = { docId: 'proj-1', projectCode: 'TL-001', title: 'My Robot', status: 'active' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BookingFormPage', () => {
  beforeEach(() => {
    // Freeze ONLY the Date clock at 2026-01-08 10:00 IST — waitFor keeps real
    // timers, so all 'today' slot gating is deterministic in any timezone.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-08T04:30:00Z'))
    authStudent()
    vi.mocked(getUserProjects).mockResolvedValue([activeProject] as any)
    vi.mocked(getBookingsForSlot).mockResolvedValue([])
    mockFirestore.getDocs.mockResolvedValue({ docs: snapDocs([printer, laser, unconfirmed, nonBookable]) } as any)
  })

  const pickProjectAndMachine = async (machineId = 'p1') => {
    await selectByOption('projectId', /TL-001 — My Robot/, 'proj-1')
    return selectByOption('equipmentId', /Bambu.*printer|Laser Cutter/i, machineId)
  }

  it('shows the no-project guard and disables booking when the user has no projects', async () => {
    vi.mocked(getUserProjects).mockResolvedValue([])
    renderPage(<BookingFormPage />)
    await waitFor(() => expect(screen.getByText(/you need an approved project first/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /confirm booking|booking…/i })).toBeDisabled()
  })

  it('only lists confirmed, bookable, available machines', async () => {
    renderPage(<BookingFormPage />)
    await selectByOption('projectId', /TL-001 — My Robot/, 'proj-1')
    const machine = document.querySelector('[name="equipmentId"]') as HTMLSelectElement
    await waitFor(() => {
      const opts = Array.from(machine.querySelectorAll('option')).map((o) => o.textContent)
      expect(opts).toEqual(expect.arrayContaining(['Bambu X1 Carbon (3D Printer)', 'Laser Cutter']))
      expect(opts).not.toContain('Hidden Printer')
      expect(opts).not.toContain('Drill')
    })
  })

  it('submits a minimal booking without undefined/null consumable members', async () => {
    vi.mocked(createBookingCallable).mockResolvedValue({ data: { bookingId: 'bk1' } } as any)
    renderPage(<BookingFormPage />)
    await pickProjectAndMachine('p1')

    // 3D printer → filament section
    await waitFor(() => expect(screen.getByText(/filament details/i)).toBeInTheDocument())
    fireEvent.change(document.querySelector('[name="purpose"]')!, { target: { value: 'Print an enclosure for the PCB project' } })
    fireEvent.change(document.querySelector('[name="filamentType"]')!, { target: { value: 'PLA' } })

    // Pick a start + end slot (start grid renders before the end grid)
    const start10 = screen.getAllByRole('button', { name: '10:00' })[0]
    await userEvent.click(start10)
    await flush()
    const end11 = screen.getAllByRole('button', { name: '11:00' }).filter((b) => !b.hasAttribute('disabled')).slice(-1)[0]!
    await userEvent.click(end11)

    fireEvent.click(document.querySelector('[name="safetyAgreementAccepted"]')!)
    await userEvent.click(screen.getByRole('button', { name: /confirm booking/i }))

    await waitFor(() => expect(mToast.success.mock.calls.length + mToast.error.mock.calls.length).toBeGreaterThan(0))
    await waitFor(() => expect(createBookingCallable).toHaveBeenCalled())
    const payload = vi.mocked(createBookingCallable).mock.calls[0][0] as Record<string, any>
    expect(payload.projectId).toBe('proj-1')
    expect(payload.machineId).toBe('p1')
    expect(payload.startTime).toBe('10:00')
    expect(payload.endTime).toBe('11:00')
    expect(payload.safetyAgreementAccepted).toBe(true)
    // Only the filled consumable survives — undefined/null members are pruned.
    expect(payload.consumables).toEqual({ filamentType: 'PLA' })
    // And no field may carry an explicit undefined (serializer turns it into null).
    for (const v of Object.values(payload)) {
      expect(v).not.toBe(undefined)
    }
    expect(mToast.success).toHaveBeenCalled()
  })

  it('disables the chosen end slot (cannot equal start) and booked slot times', async () => {
    renderPage(<BookingFormPage />)
    await pickProjectAndMachine('p1')

    await waitFor(() => expect(screen.getAllByRole('button', { name: '10:00' })[0]).toBeEnabled())
    await userEvent.click(screen.getAllByRole('button', { name: '10:00' })[0])
    // The end-slot grid starts at 10:00 — once selected as start it is blocked as an end.
    expect(screen.getAllByRole('button', { name: '10:00' })[1]).toBeDisabled()
  })

  it('shows booked-slot conflict state from getBookingsForSlot and blocks that time', async () => {
    vi.mocked(getBookingsForSlot).mockResolvedValue([
      { id: 'b1', startTime: '09:00', endTime: '11:00' },
    ] as any)
    renderPage(<BookingFormPage />)
    await pickProjectAndMachine('p1')

    await waitFor(() => expect(screen.getByText(/1 slot\(s\) already booked/i)).toBeInTheDocument())
    // 10:00 falls inside the booked 09:00–11:00 window → disabled.
    const tens = screen.getAllByRole('button', { name: '10:00' })
    expect(tens.length).toBe(2)
    expect(tens.every((b) => b.hasAttribute('disabled'))).toBe(true)
  })

  it('invalid submission shows a toast with the first field error', async () => {
    renderPage(<BookingFormPage />)
    await pickProjectAndMachine('p1')

    fireEvent.click(document.querySelector('[name="safetyAgreementAccepted"]')!)
    await userEvent.click(screen.getByRole('button', { name: /confirm booking/i }))
    await waitFor(() => expect(mToast.error).toHaveBeenCalled())
    expect(createBookingCallable).not.toHaveBeenCalled()
  })
})

describe('ToolCheckoutPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-08T04:30:00Z'))
    authStudent()
    vi.mocked(getUserProjects).mockResolvedValue([activeProject] as any)
    vi.spyOn(toolCheckouts, 'getActiveUserCheckouts').mockResolvedValue([])
    vi.mocked(createToolCheckoutCallable).mockResolvedValue({ data: { checkoutId: 'co-x' } } as any)
    vi.mocked(appendActivityLogCallable).mockResolvedValue({ data: { logId: 'l-1' } } as any)
  })

  const fillCheckoutFields = async (category: RegExp, tool: string, qty = '2') => {
    await selectByOption('projectId', /TL-001 — My Robot/, 'proj-1')
    await selectByOption('toolCategory', category, (category.source === 'Hand Tools' ? 'Hand Tools' : 'Safety Equipment'))
    await waitFor(() => expect(document.querySelector('[name="toolName"]')).toBeTruthy())
    fireEvent.change(document.querySelector('[name="toolName"]')!, { target: { value: tool } })
    fireEvent.change(document.querySelector('[name="quantity"]')!, { target: { value: qty } })
    fireEvent.change(document.querySelector('[name="expectedReturnDate"]')!, { target: { value: '2099-08-01' } })
  }

  it('in-lab checkout never serializes an outsideLocation field (previous prod bug)', async () => {
    renderPage(<ToolCheckoutPage />)
    await fillCheckoutFields(/hand tools/i, 'Hammer')
    await userEvent.click(screen.getByRole('button', { name: /confirm checkout/i }))
    await waitFor(() => expect(createToolCheckoutCallable).toHaveBeenCalled())
    const payload = vi.mocked(createToolCheckoutCallable).mock.calls[0][0] as unknown as Record<string, unknown>
    expect(payload.projectId).toBe('proj-1')
    expect(payload.toolName).toBe('Hammer')
    expect(payload.quantity).toBe(2)
    expect(payload.locationOfUse).toBe('in_lab')
    expect('outsideLocation' in payload).toBe(false)
    for (const v of Object.values(payload)) {
      expect(v).not.toBe(undefined)
    }
    expect(mToast.success).toHaveBeenCalled()
  })

  it('taking-outside requires the where field (validation blocks submit)', async () => {
    renderPage(<ToolCheckoutPage />)
    await userEvent.click(screen.getByRole('radio', { name: /taking outside/i }))
    await waitFor(() => expect(screen.getByText(/where are you taking it/i)).toBeInTheDocument())

    await fillCheckoutFields(/safety equipment/i, 'Goggles', '1')
    await userEvent.click(screen.getByRole('button', { name: /confirm checkout/i }))
    await waitFor(() => expect(screen.getByText(/please specify where you are taking the tool/i)).toBeInTheDocument())
    expect(createToolCheckoutCallable).not.toHaveBeenCalled()

    fireEvent.change(document.querySelector('[name="outsideLocation"]')!, { target: { value: 'H-Block Room 204' } })
    await userEvent.click(screen.getByRole('button', { name: /confirm checkout/i }))
    await waitFor(() => expect(createToolCheckoutCallable).toHaveBeenCalled())
    const payload = vi.mocked(createToolCheckoutCallable).mock.calls[0][0] as unknown as Record<string, unknown>
    expect(payload.locationOfUse).toBe('taking_outside')
    expect(payload.outsideLocation).toBe('H-Block Room 204')
  })

  it('return mode lists active checkouts and returns via the service', async () => {
    vi.spyOn(toolCheckouts, 'getActiveUserCheckouts').mockResolvedValue([{
      id: 'co1', toolName: 'Hammer', toolCategory: 'Hand Tools', quantity: 1,
      expectedReturnDate: '2099-07-01', locationOfUse: 'in_lab', action: 'checking_out',
      isOverdue: false, projectId: 'proj-1', userId: 'u1',
    }] as any)
    renderPage(<ToolCheckoutPage />)
    await userEvent.click(screen.getByRole('button', { name: /return/i }))
    await waitFor(() => expect(screen.getByText('Hammer')).toBeInTheDocument())
    await userEvent.click(screen.getByLabelText(/hammer/i))
    await userEvent.click(screen.getByRole('button', { name: /confirm return/i }))
    await waitFor(() => expect(mockFirestore.updateDoc).toHaveBeenCalled())
    const updates = mockFirestore.updateDoc.mock.calls.map((c: any[]) => c[1]) as Array<Record<string, unknown>>
    const returnUpdate = updates.find((u) => u.returnedAt !== undefined)
    expect(returnUpdate).toBeDefined()
    expect(returnUpdate!.action).toBe('returning')
    expect(mToast.success).toHaveBeenCalledWith(expect.stringContaining('returned'))
  })

  it('shows the overdue count banner', async () => {
    vi.spyOn(toolCheckouts, 'getActiveUserCheckouts').mockResolvedValue([{
      id: 'co2', toolName: 'File Set', toolCategory: 'Hand Tools', quantity: 1,
      expectedReturnDate: '2001-01-01', locationOfUse: 'in_lab', action: 'checking_out',
      isOverdue: true, projectId: 'proj-1', userId: 'u1',
    }] as any)
    renderPage(<ToolCheckoutPage />)
    await waitFor(() => expect(screen.getByText(/1 overdue checkout/i)).toBeInTheDocument())
  })
})

describe('IssueFormPage', () => {
  beforeEach(() => authStudent())

  it('submits an issue with enforced open status and server timestamp fields', async () => {
    renderPage(<IssueFormPage />)
    await waitFor(() => expect(document.querySelector('[name="description"]')).toBeTruthy())
    fireEvent.change(document.querySelector('[name="description"]')!, {
      target: { value: 'The laser cutter bed is misaligned and burns edges.' },
    })
    await userEvent.selectOptions(document.querySelector('[name="type"]')!, 'safety_concern')
    await userEvent.selectOptions(document.querySelector('[name="severity"]')!, 'high')

    await userEvent.click(screen.getByRole('button', { name: /submit report/i }))
    await waitFor(() => expect(mockFirestore.addDoc).toHaveBeenCalled())
    const payload = (mockFirestore.addDoc.mock.calls[0] as unknown[])[1] as Record<string, unknown>
    expect(payload.status).toBe('open')
    expect(payload.type).toBe('safety_concern')
    expect(payload.severity).toBe('high')
    expect(payload.userId).toBe('u1')
    expect(payload.createdAt).toEqual({ __sentinel: 'ts' })
    expect(payload.updatedAt).toEqual({ __sentinel: 'ts' })
    expect(mToast.success).toHaveBeenCalled()
  })

  it('blocks a description shorter than 20 characters', async () => {
    renderPage(<IssueFormPage />)
    await waitFor(() => expect(document.querySelector('[name="description"]')).toBeTruthy())
    fireEvent.change(document.querySelector('[name="description"]')!, { target: { value: 'too short' } })
    await userEvent.click(screen.getByRole('button', { name: /submit report/i }))
    await flush()
    expect(mockFirestore.addDoc).not.toHaveBeenCalled()
    expect(screen.getByText(/at least 20 characters/i)).toBeInTheDocument()
  })
})