# Tinkerers' Lab Platform

A free, zero-server makerspace management platform for the **Innovation & Tinkering Lab, Ahmedabad University**.

Machine booking · Project registry · Tool checkout · Issue reporting · Admin panel

**Live site:** enable GitHub Pages (see below) → `https://vrucando.github.io/tinkers-lab-platform./`

---

## How it works

```
Browser (this repo, GitHub Pages — free)
        │  JSON over HTTPS
        ▼
Google Apps Script Web App (apps-script/Code.gs — free)
        │
        ▼
Google Sheets = database (your existing "Tinker's Lab Management" sheet)
        │
        ▼
Gmail (confirmations, approvals, reminders, overdue alerts)
```

No servers, no hosting bills, no frameworks, no build step. Any student who knows
basic HTML/JS can maintain it with just a text editor.

The site runs in **DEMO MODE** (sample data, stored only in your browser) until you
connect the backend — so you can try every feature right away.

---

## Setup (one time, ~15 minutes)

### 1. Deploy the backend
1. Open your **Tinker's Lab Management** Google Sheet
2. `Extensions → Apps Script`, create a file, paste **`apps-script/Code.gs`**
3. Change `ADMIN_KEY` at the top to a secret only coordinators know
4. `Deploy → New deployment → Web app`
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
5. Copy the Web App URL
6. (Optional) run `setupDailyTrigger` once → enables booking reminders + overdue emails

### 2. Connect the frontend
1. Edit **`js/config.js`** → paste the URL into `API_URL`
2. Commit and push

### 3. Enable GitHub Pages
Repo `Settings → Pages → Source: Deploy from a branch → main / root → Save`.
Your platform is live a minute later.

---

## Everyday maintenance

| Task | Where |
|---|---|
| Add / remove a machine | `js/config.js` → `MACHINES` |
| Change lab hours or slot length | `js/config.js` → `OPEN_HOUR` etc. |
| Change email wording | `apps-script/Code.gs` |
| Approve bookings, resolve issues | `/#/admin` on the site |
| Raw data | the Google Sheet tabs starting with `Platform ` |

## Project structure

```
index.html          app shell + nav
css/style.css       all styling
js/config.js        ← the only file you edit routinely
js/api.js           API layer + demo mode (swap for Supabase later)
js/app.js           router + all views
apps-script/Code.gs backend API + emails + daily reminders
```

## Scaling path (when you outgrow Sheets)

The UI only ever calls `Api.*` in `js/api.js`. To migrate to Supabase/Firebase/
a real backend, re-implement those ~10 functions and change nothing else.

## Contributing

1. Fork / branch
2. Keep it dependency-free (no npm) so future students can maintain it
3. Test in demo mode (`API_URL: ""`)
4. PR with a clear description

---

Built for the Tinkerers' Lab community. Maintained by lab coordinators & students.
