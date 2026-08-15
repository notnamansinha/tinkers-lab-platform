# Gap-Fix Plan — Tinkers' Lab Platform

## Goal
Close every documented gap in the platform: server-side booking conflict detection, server-side overdue tracking, notifications, relational team members, project/workshop file uploads, project-creation activity log, automated tests, lint cleanup, and build optimization.

## Tasks

### Batch 1 — Hygiene (quick wins)
- [ ] 1. Fix lint warnings (unused imports in `ProfilePage.tsx`, `IssueFormPage.tsx`) → Verify: `npm run lint` clean
- [ ] 2. Split Firebase vendor chunk in `vite.config.ts` → Verify: `npm run build` no >600kB chunk

### Batch 2 — Project timeline completeness
- [ ] 3. Add `created` activity type (types + rules enum) and log "Project registered" on create → Verify: build passes, rules updated

### Batch 3 — Relational team members
- [ ] 4. `projectMembers` subcollection: types, rules, service, populated atomically in `createProject` → Verify: build passes, unit test green

### Batch 4 — Cloud Functions (server-side enforcement)
- [ ] 5. `functions/` package (firebase-admin + firebase-functions v2): `createBooking` callable — server-side conflict check, atomic write, activity log, notification → Verify: `tsc` in functions passes
- [ ] 6. `sweepOverdueCheckouts` scheduled daily → Verify: `tsc` passes
- [ ] 7. Notification triggers: project status change, booking rejected/completed, checkout overdue → Verify: `tsc` passes
- [ ] 8. Client: `BookingFormPage` calls callable; rules block direct client booking creates → Verify: build passes
- [ ] 9. `submitFeedback` callable with server-side 5-min window (feedbackWindows doc) → Verify: `tsc` passes

### Batch 5 — Uploads
- [ ] 10. Storage rules: `projects/{projectId}/**`, `workshops/{workshopId}/**` → Verify: rules parse
- [ ] 11. Services `projectFiles.ts`, `workshopMaterials.ts` + UI wiring → Verify: build passes

### Batch 6 — Emulators & tests
- [ ] 12. `firebase.json` emulators config + npm scripts (test:unit, test:rules) → Verify: scripts listed
- [ ] 13. Unit tests (vitest): utils (`cleanFirestoreData`, `formatDate`, `cn`), `isCheckoutOverdue`, team parsing → Verify: `npm test` green
- [ ] 14. Rules unit tests (`@firebase/rules-unit-testing`) — CI-runnable (Java), documented

### Batch 7 — CI & docs
- [ ] 15. CI: add `npm test` (+ Java for rules tests) → Verify: workflow YAML valid
- [ ] 16. Update docs: FIRESTORE, data-architecture, DEPLOYMENT, STORAGE, ENVIRONMENT, TESTING, SECURITY, README → Verify: no stale refs

### Batch 8 — Security review & final verification
- [ ] 17. 007 security audit pass on rules + functions → Verify: findings fixed
- [ ] 18. Final `npm run lint` + `npm run build` + `npm test`, then commit → Verify: all green

## Done When
- Every documented "Known Gap" in FIRESTORE.md is closed or has a working server-side implementation
- App builds, lints, and tests pass
- Docs reflect the implemented reality
