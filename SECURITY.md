# Security & Administration Guide
## Tinkerers' Lab Platform — Ahmedabad University

> Last updated: 2026-07-07 | Maintainer: Lab Coordinator, Tinkerers' Lab

---

## Table of Contents

1. [Who is Admin](#who-is-admin)
2. [Admin Login & Lockout](#admin-login--lockout)
3. [Rate Limiting](#rate-limiting)
4. [Booking Sanity Checks](#booking-sanity-checks)
5. [Honeypot Bot Protection](#honeypot-bot-protection)
6. [Cache Busting](#cache-busting)
7. [Cold Start / Latency Fix](#cold-start--latency-fix)
8. [Audit Logs](#audit-logs)
9. [How to Change the Admin Key](#how-to-change-the-admin-key)
10. [How to Add or Remove an Admin](#how-to-add-or-remove-an-admin)
11. [What to Do if Compromised](#what-to-do-if-compromised)
12. [Scaling Beyond This Setup](#scaling-beyond-this-setup)

---

## Who is Admin

Access to the Admin panel (`/#/admin`) is controlled by a **single shared secret key** set in the
Apps Script backend.

| What | Where |
|---|---|
| Key is stored | Line 16 of `apps-script/Code.gs` → `var ADMIN_KEY = "..."` |
| Key is checked | On every admin action: login, approve, reject, resolve |
| Session stored | In `sessionStorage` of the coordinator's browser (cleared on tab close) |
| Logs stored | `Platform Admin Log` tab in your Google Sheet |

**There is no user account system.** Anyone who knows `ADMIN_KEY` can access the admin panel.
Keep it secret. Change it if it leaks.

---

## Admin Login & Lockout

To prevent brute-force guessing of the admin key:

| Setting | Value | Where to change |
|---|---|---|
| Max wrong attempts | 5 | `ADMIN_LOCKOUT.maxAttempts` in `Code.gs` |
| Lockout duration | 30 minutes | `ADMIN_LOCKOUT.lockoutMin` in `Code.gs` |
| Lockout scope | Per browser (persistent client ID) | `localStorage` key `tl-client-id` |

**What happens on lockout:**
- The offending browser is blocked from the admin panel for 30 minutes
- An alert email is sent immediately to `LAB_EMAIL`
- Every attempt (success or fail) is logged to the `Platform Admin Log` sheet tab

**False lockout** (you locked yourself out accidentally):
- Wait 30 minutes, or
- Open the `Platform Admin Log` tab, delete your recent FAIL rows, and try again

---

## Rate Limiting

Public endpoints are rate-limited **per email address** to prevent flooding and email quota abuse:

| Action | Limit | Window |
|---|---|---|
| Register a project | 5 submissions | per 24 hours |
| Book a machine | 3 bookings | per hour |
| Report an issue | 5 reports | per hour |
| Checkout a tool | 20 checkouts | per hour |

Rate-limit records are stored in the `Platform RateLimits` tab of your Google Sheet.
Old entries (> 30 days) are cleaned up automatically on a 2% random chance per request.

**To adjust limits:** edit the `LIMITS` object near the top of `Code.gs`, then redeploy.

```javascript
var LIMITS = {
  registerProject: { max: 5,  windowMin: 1440 }, // per day
  createBooking:   { max: 3,  windowMin: 60   }, // per hour
  reportIssue:     { max: 5,  windowMin: 60   },
  checkoutTool:    { max: 20, windowMin: 60   }
};
```

---

## Booking Sanity Checks

Every booking request is validated server-side before being accepted:

| Check | Rule |
|---|---|
| No past bookings | Start time must be after current time |
| No too-far-ahead bookings | Max 30 days in advance |
| No marathon slots | Single booking max 4 hours |
| Valid time range | End time must be after start time |
| Project ownership | Project ID must belong to the submitting email |
| No double-booking | Slot must not overlap any existing Approved or Pending booking |

**To adjust limits:** edit these constants at the top of `Code.gs`:

```javascript
var BOOKING_MAX_HOURS_AHEAD = 24 * 30;  // 30 days
var BOOKING_MAX_LENGTH_HRS  = 4;        // 4 hours max per slot
```

---

## Honeypot Bot Protection

All four public forms (Register Project, Book a Machine, Tool Checkout, Report Issue)
contain a **hidden field** called `website`:

```html
<div style="position:absolute;left:-9999px" aria-hidden="true">
  <label>Website<input type="text" name="website" ...></label>
</div>
```

- **Real users** never see it and never fill it in
- **Bots** fill in every visible and hidden field automatically
- **Backend** silently rejects any request where `website` is non-empty with a generic "Rejected." error

This stops ~90% of automated spam without CAPTCHAs or any friction for real users.

---

## Cache Busting

GitHub Pages caches static files aggressively. Without cache busting, users see old
versions of the site for up to 10 minutes after a deploy.

**How it works:** every JS and CSS file is loaded with a version query string:

```html
<script src="js/app.js?v=2026.07.07.2"></script>
<link rel="stylesheet" href="css/style.css?v=2026.07.07.2">
```

Browsers treat `app.js?v=2` and `app.js?v=3` as different resources and fetch fresh copies.

**When to bump the version:**
Whenever you push a meaningful update, change `VERSION` in `js/config.js`
and update the matching `?v=` strings in `index.html`:

```javascript
// js/config.js
VERSION: "2026.07.07.3",  // bump this
```

```html
<!-- index.html — update all three query strings to match -->
<link rel="stylesheet" href="css/style.css?v=2026.07.07.3">
<script src="js/config.js?v=2026.07.07.3"></script>
<script src="js/api.js?v=2026.07.07.3"></script>
<script src="js/app.js?v=2026.07.07.3"></script>
```

---

## Cold Start / Latency Fix

Google Apps Script has a **cold start delay** of 3–6 seconds when the runtime hasn't
been used for ~5 minutes. Without a fix, the first user of the morning waits on every
form submission.

**Fix:** the site fires a lightweight `ping` request to the backend the moment the page
loads. By the time the user fills a form and clicks submit, the runtime is warm.

```javascript
// js/app.js — runs on every page load
Api.ping();   // warm up Apps Script runtime
```

The ping returns `{ ok: true, ts: "..." }` and is silently discarded if it fails.
It adds zero visible delay for the user.

---

## Audit Logs

Every admin login attempt is recorded in the **`Platform Admin Log`** tab of your
Google Sheet:

| Column | Content |
|---|---|
| Timestamp | When the attempt happened |
| Client ID | Persistent browser identifier (`tl-client-id` in localStorage) |
| Result | `OK` or `FAIL` |
| Action | `login`, `auth` (for action-level checks) |
| Detail | Reason for failure or blank for success |

**To check if someone is probing the admin panel:** filter the log for `Result = FAIL`
and look for repeated `Client ID` values in a short time window.

**To manually unlock a locked-out browser:** delete all recent `FAIL` rows for that
Client ID from the log sheet. The lockout check counts recent FAIL rows, so removing
them releases the lock immediately.

---

## How to Change the Admin Key

1. Open your Google Sheet → **Extensions → Apps Script**
2. In `Code.gs`, find line 16:
   ```javascript
   var ADMIN_KEY = "your-current-key";
   ```
3. Replace the value with a new strong key (16+ random characters recommended)
4. **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**
5. Tell all coordinators the new key in person or via a password manager

> **Why redeploy?** The Apps Script web app caches the old version until you publish
> a new deployment. Saving the file alone is not enough.

**Recommended key format:** `TL-YYYY-[random]` e.g. `TL-2026-k9Xm2pQr7nBw`

---

## How to Add or Remove an Admin

There is no user list — access is controlled entirely by knowledge of `ADMIN_KEY`.

**To give someone admin access:** tell them the `ADMIN_KEY` in person.

**To revoke someone's access:** change the `ADMIN_KEY` (see above) and tell only the
people who should still have access. The old key stops working immediately after
redeployment. Anyone using the old key gets "Invalid admin key."

**To temporarily suspend all admin access:** change `ADMIN_KEY` to a random string,
redeploy, and don't tell anyone. Change it back (and redeploy again) when ready.

---

## What to Do if Compromised

If you suspect the admin key has leaked or someone has been approving/rejecting
bookings without your knowledge:

**Immediate steps:**
1. Change `ADMIN_KEY` and redeploy immediately (see above)
2. Check `Platform Admin Log` — filter `Result = OK` and look for timestamps
   outside normal lab hours or from unexpected Client IDs
3. Check `Platform Bookings` — look for Approved bookings you didn't make
4. If you find fraudulent approvals, change their status to `Cancelled` directly
   in the Google Sheet (the `Status` column)
5. Email affected users if their bookings were manipulated

**If your Google Sheet is tampered with:**
Google Sheets keeps full version history. Go to **File → Version history →
See version history** and restore to a clean state.

**If the Apps Script Web App URL leaks:**
The URL alone isn't enough — all destructive actions require the admin key.
Public actions are rate-limited. If you want extra protection, redeploy the
script as a new deployment to get a fresh URL, then update `API_URL` in
`js/config.js` and commit.

---

## Scaling Beyond This Setup

The current stack (GitHub Pages + Apps Script + Google Sheets) is free and handles
a university lab comfortably. If usage grows significantly, here's the upgrade path:

| When | Symptom | Upgrade to |
|---|---|---|
| > 500 bookings/month | Sheets becomes slow | Supabase (free tier, 500MB) |
| > 100 emails/day | Gmail quota exhausted | SendGrid free tier (100 emails/day) |
| Multiple campuses | Single admin key becomes risky | Supabase Auth (email/password per user) |
| Need mobile app | Users request native app | PWA wrapper (no code change needed) |
| Serious DDoS risk | Coordinated attack | Cloudflare Workers rate limiting |

The frontend (`js/api.js`) is the only file that needs updating when you swap the
backend. All views in `js/app.js` call `Api.*` — they never talk to the backend directly.

---

## Quick Reference

| Task | Where |
|---|---|
| Change admin key | Line 16 of `Code.gs` → redeploy |
| Adjust rate limits | `LIMITS` object in `Code.gs` → redeploy |
| Adjust lockout settings | `ADMIN_LOCKOUT` object in `Code.gs` → redeploy |
| Adjust booking limits | `BOOKING_MAX_*` constants in `Code.gs` → redeploy |
| View admin attempts | `Platform Admin Log` tab in Google Sheet |
| View rate limit hits | `Platform RateLimits` tab in Google Sheet |
| Bump cache version | `VERSION` in `js/config.js` + `?v=` strings in `index.html` |
| Manually unlock admin | Delete recent FAIL rows in `Platform Admin Log` |
| Revoke admin access | Change `ADMIN_KEY` → redeploy |
| Restore sheet data | File → Version history in Google Sheets |

---

*This document is part of the Tinkerers' Lab open-source platform.*
*Repository: https://github.com/vrucando/tinkers-lab-platform*
