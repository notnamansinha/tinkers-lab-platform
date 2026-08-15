import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { app } from '@/lib/firebase'

// ============================================================
// CLOUD FUNCTIONS CLIENT — server-enforced operations
// createBooking  → transactional conflict-free booking (Form 2A)
// submitFeedback → server-side 5-minute rate limit
// Requires the functions emulator (dev) or deployed functions
// (production). See docs/firebase/DEPLOYMENT.md.
// ============================================================

const functions = getFunctions(app)

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001)
}

export interface CreateBookingInput {
  equipmentId: string
  machineId: string
  machineName?: string
  projectId: string
  projectTitle?: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  consumables?: Record<string, unknown>
  safetyAgreementAccepted: boolean
}

export interface CreateBookingResult {
  bookingId: string
}

export const createBookingCallable = httpsCallable<CreateBookingInput, CreateBookingResult>(
  functions,
  'createBooking',
)

export const submitFeedbackCallable = httpsCallable<{ message: string }, { feedbackId: string }>(
  functions,
  'submitFeedback',
)
