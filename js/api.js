// ============================================================
// API layer — talks to the Google Apps Script Web App.
// If CONFIG.API_URL is empty, runs in DEMO MODE using
// browser localStorage so the site works out of the box.
// Swap this file for a Supabase/Firebase client later without
// touching any UI code — every view only calls Api.*
// ============================================================

const DEMO = !CONFIG.API_URL;

const Api = {

  // ---------- generic transport ----------
  async _post(action, payload) {
    if (DEMO) return Demo.handle(action, payload);
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight with Apps Script
      body: JSON.stringify({ action, payload })
    });
    if (!res.ok) throw new Error("Server error " + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  // ---------- public API ----------
  registerProject: (p)              => Api._post("registerProject", p),
  getProjectsByEmail: (email)       => Api._post("getProjectsByEmail", { email }),
  getBookings: (machineId, date)    => Api._post("getBookings", { machineId, date }),
  createBooking: (b)                => Api._post("createBooking", b),
  checkoutTool: (c)                 => Api._post("checkoutTool", c),
  returnTool: (c)                   => Api._post("returnTool", c),
  getOpenCheckouts: ()              => Api._post("getOpenCheckouts", {}),
  reportIssue: (r)                  => Api._post("reportIssue", r),
  // admin
  adminGetAll: (key)                => Api._post("adminGetAll", { key }),
  adminSetBookingStatus: (key, id, status) => Api._post("adminSetBookingStatus", { key, id, status }),
  adminSetIssueStatus: (key, id, status)   => Api._post("adminSetIssueStatus", { key, id, status })
};


// ============================================================
// DEMO MODE — in-browser store with a few seeded records.
// Lets the lab evaluate the UI before wiring the backend.
// ============================================================
const Demo = {
  load() {
    const raw = localStorage.getItem("tl-demo");
    if (raw) return JSON.parse(raw);
    const seed = {
      projects: [
        { id: "TL-001", name: "Vrushabh Zunjurkar", email: "vrushabh.zunjurkar@ahduni.edu.in", userType: "Student", title: "Smart Switch for TL Lab Machines", status: "Active" },
        { id: "TL-002", name: "Dhairya Sanathara", email: "dhairya.s7@ahduni.edu.in", userType: "Student", title: "Automatic boarding ramp system", status: "Active" }
      ],
      bookings: [
        { id: "B-001", projectId: "TL-001", email: "vrushabh.zunjurkar@ahduni.edu.in", machineId: "laser-cutter", date: Demo.todayStr(), start: "10:00", end: "12:00", purpose: "Cutting enclosure panels", status: "Approved" }
      ],
      checkouts: [
        { id: "C-001", name: "Yagnik Vanodiya", email: "yagnik.v@ahduni.edu.in", category: "Handheld Power Tools", tool: "Cordless Drill GSB 180-LI", qty: 1, due: Demo.todayStr(), status: "Out" }
      ],
      issues: []
    };
    localStorage.setItem("tl-demo", JSON.stringify(seed));
    return seed;
  },
  save(db) { localStorage.setItem("tl-demo", JSON.stringify(db)); },
  todayStr() { return new Date().toISOString().slice(0, 10); },
  nextId(list, prefix) {
    const n = list.length + 1;
    return prefix + "-" + String(n).padStart(3, "0");
  },

  handle(action, p) {
    const db = Demo.load();
    const done = (out) => { Demo.save(db); return Promise.resolve(out); };

    switch (action) {
      case "registerProject": {
        const id = Demo.nextId(db.projects, "TL");
        db.projects.push({ id, status: "Pending", ...p });
        return done({ ok: true, projectId: id });
      }
      case "getProjectsByEmail":
        return done({ projects: db.projects.filter(x => x.email.toLowerCase() === p.email.toLowerCase()) });

      case "getBookings":
        return done({ bookings: db.bookings.filter(b =>
          (!p.machineId || b.machineId === p.machineId) &&
          (!p.date || b.date === p.date) &&
          b.status !== "Rejected" && b.status !== "Cancelled") });

      case "createBooking": {
        // conflict check
        const clash = db.bookings.find(b =>
          b.machineId === p.machineId && b.date === p.date &&
          b.status !== "Rejected" && b.status !== "Cancelled" &&
          !(p.end <= b.start || p.start >= b.end));
        if (clash) return Promise.reject(new Error("That slot overlaps an existing booking (" + clash.start + "–" + clash.end + ")."));
        const id = Demo.nextId(db.bookings, "B");
        db.bookings.push({ id, status: "Pending", ...p });
        return done({ ok: true, bookingId: id });
      }
      case "checkoutTool": {
        const id = Demo.nextId(db.checkouts, "C");
        db.checkouts.push({ id, status: "Out", ...p });
        return done({ ok: true, checkoutId: id });
      }
      case "returnTool": {
        const c = db.checkouts.find(x => x.id === p.id || (x.email === p.email && x.tool === p.tool && x.status === "Out"));
        if (!c) return Promise.reject(new Error("No open checkout found for that item."));
        c.status = "Returned";
        return done({ ok: true });
      }
      case "getOpenCheckouts":
        return done({ checkouts: db.checkouts.filter(c => c.status === "Out") });

      case "reportIssue": {
        const id = Demo.nextId(db.issues, "R");
        db.issues.push({ id, status: "Open", ...p });
        return done({ ok: true, issueId: id });
      }
      case "adminGetAll":
        return done({ projects: db.projects, bookings: db.bookings, checkouts: db.checkouts, issues: db.issues });

      case "adminSetBookingStatus": {
        const b = db.bookings.find(x => x.id === p.id);
        if (b) b.status = p.status;
        return done({ ok: true });
      }
      case "adminSetIssueStatus": {
        const i = db.issues.find(x => x.id === p.id);
        if (i) i.status = p.status;
        return done({ ok: true });
      }
      default:
        return Promise.reject(new Error("Unknown action " + action));
    }
  }
};
