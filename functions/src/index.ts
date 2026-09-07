import { initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()

// Run functions in the region closest to the lab (Ahmedabad) — the
// default is us-central1 which adds ~150-300ms latency for IST users.
setGlobalOptions({ region: 'asia-south1' })

// Server-side enforcement & automation:
//  - createProject: atomic TL-XXX counter + project + timeline + roster (Form 1)
//  - createBooking: transactional, conflict-free booking creation (Form 2A)
//  - createToolCheckout: validated, project-owned checkout creation (Form 2B)
//  - sweepOverdueCheckouts: daily overdue sweep + notifications (Asia/Kolkata)
//  - notifyOnProjectUpdate / notifyOnBookingUpdate: in-app notifications
//  - submitFeedback: server-enforced 1-per-5-min feedback rate limit
//  - appendActivityLog: server-stamped, forge-proof project timeline appends
//  - syncBookingSlot / cleanupBookingSlot: privacy-safe slot occupancy sync
//  - deleteMyAccount: full user-requested data deletion cascade
export { createProject } from './createProject'
export { createBooking } from './createBooking'
export { createToolCheckout } from './createToolCheckout'
export { sweepOverdueCheckouts } from './overdue'
export { notifyOnProjectUpdate, notifyOnBookingUpdate } from './notifications'
export { submitFeedback } from './submitFeedback'
export { appendActivityLog } from './appendActivityLog'
export { syncBookingSlot, cleanupBookingSlot } from './syncBookingSlot'
export { registerForWorkshop } from './registerForWorkshop'
export { deleteMyAccount } from './deleteMyAccount'