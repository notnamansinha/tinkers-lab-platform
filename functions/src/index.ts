import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Server-side enforcement & automation:
//  - createProject: atomic TL-XXX counter + project + timeline + roster (Form 1)
//  - createBooking: transactional, conflict-free booking creation (Form 2A)
//  - createToolCheckout: validated, project-owned checkout creation (Form 2B)
//  - sweepOverdueCheckouts: daily overdue sweep + notifications
//  - notifyOnProjectUpdate / notifyOnBookingUpdate: in-app notifications
//  - submitFeedback: server-enforced 1-per-5-min feedback rate limit
export { createProject } from './createProject'
export { createBooking } from './createBooking'
export { createToolCheckout } from './createToolCheckout'
export { sweepOverdueCheckouts } from './overdue'
export { notifyOnProjectUpdate, notifyOnBookingUpdate } from './notifications'
export { submitFeedback } from './submitFeedback'
