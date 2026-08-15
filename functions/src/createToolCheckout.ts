import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getUserProfile } from './lib/helpers'

const db = getFirestore()

const CHECKOUT_KEYS = [
  'projectId', 'toolCategory', 'toolName', 'quantity', 'locationOfUse',
  'outsideLocation', 'expectedReturnDate', 'expectedReturnTime',
  'conditionAtCheckout', 'notes',
] as const

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/
const TIME_PATTERN = /^[0-9]{2}:[0-9]{2}$/
const TOOL_CATEGORIES = ['Power Tools', 'Hand Tools', 'Measurement Tools', 'Safety Equipment', 'Other']
const CONDITIONS = ['good', 'fair', 'damaged']

interface CreateToolCheckoutInput {
  projectId: string
  toolCategory: string
  toolName: string
  quantity: number
  locationOfUse: 'in_lab' | 'taking_outside'
  outsideLocation?: string
  expectedReturnDate: string
  expectedReturnTime?: string
  conditionAtCheckout: 'good' | 'fair' | 'damaged'
  notes?: string
}

function todayInIndia(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const createToolCheckout = onCall(
  { maxInstances: 10, enforceAppCheck: false },
  async (request): Promise<{ checkoutId: string }> => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to check out a tool.')

    const input = (request.data ?? {}) as CreateToolCheckoutInput
    for (const key of Object.keys(input)) {
      if (!CHECKOUT_KEYS.includes(key as (typeof CHECKOUT_KEYS)[number])) {
        throw new HttpsError('invalid-argument', `Unexpected field: ${key}`)
      }
    }

    const user = await getUserProfile(request.auth.uid)
    if (!user) throw new HttpsError('failed-precondition', 'Profile not found. Complete onboarding first.')
    if (user.isActive === false) throw new HttpsError('permission-denied', 'Account is deactivated.')

    if (typeof input.projectId !== 'string' || typeof input.toolName !== 'string' || !input.toolName.trim() || input.toolName.trim().length > 200) {
      throw new HttpsError('invalid-argument', 'Project and tool name are required.')
    }
    if (typeof input.toolCategory !== 'string' || !TOOL_CATEGORIES.includes(input.toolCategory)) {
      throw new HttpsError('invalid-argument', 'Invalid tool category.')
    }
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 1000) {
      throw new HttpsError('invalid-argument', 'Quantity must be a positive integer.')
    }
    if (!['in_lab', 'taking_outside'].includes(input.locationOfUse)) {
      throw new HttpsError('invalid-argument', 'Invalid location of use.')
    }
    if (input.outsideLocation !== undefined && typeof input.outsideLocation !== 'string') {
      throw new HttpsError('invalid-argument', 'outsideLocation must be text.')
    }
    if (input.locationOfUse === 'taking_outside' && !input.outsideLocation?.trim()) {
      throw new HttpsError('invalid-argument', 'Outside location is required.')
    }
    if (typeof input.expectedReturnDate !== 'string' || !isRealDate(input.expectedReturnDate) || input.expectedReturnDate < todayInIndia()) {
      throw new HttpsError('invalid-argument', 'Return date must be today or later.')
    }
    if (input.expectedReturnTime !== undefined && typeof input.expectedReturnTime !== 'string') {
      throw new HttpsError('invalid-argument', 'Return time must be text.')
    }
    if (input.expectedReturnTime && (!TIME_PATTERN.test(input.expectedReturnTime) || input.expectedReturnTime > '23:59')) {
      throw new HttpsError('invalid-argument', 'Return time must be HH:MM.')
    }
    if (input.notes !== undefined && typeof input.notes !== 'string') {
      throw new HttpsError('invalid-argument', 'Notes must be text.')
    }
    if (!CONDITIONS.includes(input.conditionAtCheckout)) {
      throw new HttpsError('invalid-argument', 'Invalid checkout condition.')
    }

    const projectRef = db.collection('projects').doc(input.projectId)
    const projectSnap = await projectRef.get()
    if (!projectSnap.exists || projectSnap.data()?.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Checkout requires a project you own.')
    }
    const project = projectSnap.data()!
    if (project.status !== 'active') {
      throw new HttpsError('failed-precondition', 'Project must be active to check out tools.')
    }

    const checkoutRef = projectRef.collection('checkouts').doc()
    const logRef = projectRef.collection('activityLog').doc()
    await db.runTransaction(async (tx) => {
      tx.set(checkoutRef, {
        userId: request.auth!.uid,
        userEmail: user.email ?? '',
        userName: user.displayName ?? '',
        universityId: user.universityId ?? null,
        projectId: input.projectId,
        projectTitle: project.title ?? '',
        action: 'checking_out',
        toolCategory: input.toolCategory,
        toolName: input.toolName.trim(),
        quantity: input.quantity,
        locationOfUse: input.locationOfUse,
        outsideLocation: input.outsideLocation?.trim() ?? null,
        expectedReturnDate: input.expectedReturnDate,
        expectedReturnTime: input.expectedReturnTime ?? null,
        conditionAtCheckout: input.conditionAtCheckout,
        notes: input.notes?.trim() ?? null,
        isOverdue: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      tx.set(logRef, {
        type: 'checkout',
        summary: `Checked out ${input.toolName.trim()} (qty: ${input.quantity}) — due ${input.expectedReturnDate}`,
        resourceId: checkoutRef.id,
        userId: request.auth!.uid,
        userName: user.displayName ?? '',
        userEmail: user.email ?? '',
        createdAt: FieldValue.serverTimestamp(),
      })
    })

    return { checkoutId: checkoutRef.id }
  },
)
