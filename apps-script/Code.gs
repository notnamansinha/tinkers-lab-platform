// ============================================================
// Tinkerers' Lab Platform — Backend API (Google Apps Script)
// ============================================================
// SETUP:
// 1. Open your "Tinker's Lab Management" Google Sheet
// 2. Extensions → Apps Script → paste this whole file
// 3. Set ADMIN_KEY below to a secret only coordinators know
// 4. Deploy → New deployment → type "Web app"
//      - Execute as: Me
//      - Who has access: Anyone
// 5. Copy the Web App URL into js/config.js → API_URL
//
// The script auto-creates any sheet tabs it needs.
// ============================================================

var ADMIN_KEY = "CHANGE-ME-to-a-secret";   // <— change this!
var LAB_EMAIL = "tinkerslab@ahduni.edu.in"; // coordinator alerts go here
var LAB_NAME  = "Tinkerers' Lab, Ahmedabad University";
var LAB_LOCATION = "Innovation & Tinkering Lab, Ahmedabad University";

// ---------- Rate limiting & abuse protection ----------
// Public endpoints: max N calls per identifier per window (minutes).
var LIMITS = {
  registerProject: { max: 5,  windowMin: 1440 }, // 5 per day per email
  createBooking:   { max: 3,  windowMin: 60   }, // 3 per hour per email
  reportIssue:     { max: 5,  windowMin: 60   }, // 5 per hour per email
  checkoutTool:    { max: 20, windowMin: 60   }  // 20 per hour per email (generous)
};

// Admin lockout: after N wrong keys from same clientId, lock for M minutes.
var ADMIN_LOCKOUT = { maxAttempts: 5, lockoutMin: 30 };

// Booking sanity limits
var BOOKING_MAX_HOURS_AHEAD = 24 * 30;   // no bookings > 30 days ahead
var BOOKING_MAX_LENGTH_HRS  = 4;         // no slot longer than 4 hours

// Human-readable machine names — keep in sync with js/config.js MACHINES.
var MACHINE_NAMES = {
  "bambu-x1c":    "Bambu Labs X-1C 3D Printer",
  "creality-dual":"Creality Dual Nozzle 3D Printer",
  "laser-cutter": "Success Laser Cutter",
  "muffle":       "Muffle Furnace S-900",
  "lathe":        "Lathe Machine KL-2",
  "sheet-bender": "Manual Sheet Bender",
  "pillar-drill": "Pillar Drill 2HP",
  "table-saw":    "Table Saw GTS 10J",
  "mitre-saw":    "Mitre Saw GCM 254",
  "cutoff-saw":   "Metal Cut-off Saw GCO 220",
  "esd-station":  "ESD Workstation",
  "oscilloscope": "Digital Oscilloscope SDS1022",
  "func-gen":     "Function Generator SFG1003",
  "solder":       "Soldering Station WE1010"
};
function machineName(id) { return MACHINE_NAMES[id] || id; }

// ---------- HTTP entry point ----------
function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    out = handle(req.action, req.payload || {});
  } catch (err) {
    out = { error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: "Tinkerers' Lab API" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- router ----------
function handle(action, p) {
  // Honeypot — bots fill hidden fields, humans don't
  if (p && p.website && p.website.length > 0) throw new Error("Rejected.");

  // Rate limit public actions (keyed by lowercase email)
  if (LIMITS[action] && p && p.email) {
    checkRate(action, String(p.email).toLowerCase().trim());
  }

  switch (action) {
    case "registerProject":      return registerProject(p);
    case "getProjectsByEmail":   return getProjectsByEmail(p);
    case "getBookings":          return getBookings(p);
    case "createBooking":        return createBooking(p);
    case "checkoutTool":         return checkoutTool(p);
    case "returnTool":           return returnTool(p);
    case "getOpenCheckouts":     return getOpenCheckouts();
    case "reportIssue":          return reportIssue(p);
    case "adminLogin":           return adminLogin(p);
    case "adminGetAll":          requireAdmin(p); return adminGetAll();
    case "adminSetBookingStatus":requireAdmin(p); return setStatus("Platform Bookings", p.id, p.status, true);
    case "adminSetIssueStatus":  requireAdmin(p); return setStatus("Platform Issues", p.id, p.status, false);
    case "ping":                 return { ok: true, ts: new Date().toISOString() };
    default: throw new Error("Unknown action: " + action);
  }
}

// ---------- rate limiting ----------
function checkRate(action, key) {
  var lim = LIMITS[action];
  var s = sheet(SHEETS.rate.name, SHEETS.rate.headers);
  var cutoff = Date.now() - lim.windowMin * 60 * 1000;
  var data = rows(s);
  var count = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === action && data[i][1] === key && new Date(data[i][2]).getTime() > cutoff) count++;
  }
  if (count >= lim.max) {
    throw new Error("You've hit the rate limit for this action. Try again later.");
  }
  s.appendRow([action, key, new Date()]);
  // Occasional cleanup of very old entries
  if (Math.random() < 0.02) cleanupOldRateEntries(s);
}
function cleanupOldRateEntries(s) {
  var oldCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
  var data = rows(s);
  for (var i = data.length - 1; i >= 0; i--) {
    if (new Date(data[i][2]).getTime() < oldCutoff) s.deleteRow(i + 2);
  }
}

// ---------- admin auth + lockout ----------
function requireAdmin(p) {
  if (isLockedOut(p.clientId)) throw new Error("Too many failed attempts. Locked out — try again later.");
  if (p.key !== ADMIN_KEY) {
    logAdmin(p.clientId, "FAIL", "auth", "invalid key");
    throw new Error("Invalid admin key");
  }
}

function adminLogin(p) {
  if (isLockedOut(p.clientId)) {
    return { ok: false, error: "Locked out. Too many failed attempts. Try again in " + ADMIN_LOCKOUT.lockoutMin + " minutes." };
  }
  if (p.key !== ADMIN_KEY) {
    logAdmin(p.clientId, "FAIL", "login", "invalid key");
    var remaining = ADMIN_LOCKOUT.maxAttempts - recentFailCount(p.clientId);
    if (remaining <= 0) {
      safeMail(LAB_EMAIL, "⚠ Admin lockout triggered",
        "Client " + p.clientId + " hit the admin lockout threshold at " + new Date() + ".");
      return { ok: false, error: "Too many failed attempts. Locked out for " + ADMIN_LOCKOUT.lockoutMin + " minutes." };
    }
    return { ok: false, error: "Invalid key. " + remaining + " attempts remaining." };
  }
  logAdmin(p.clientId, "OK", "login", "");
  return { ok: true };
}

function isLockedOut(clientId) {
  if (!clientId) return false;
  return recentFailCount(clientId) >= ADMIN_LOCKOUT.maxAttempts;
}
function recentFailCount(clientId) {
  var s = sheet(SHEETS.adminLog.name, SHEETS.adminLog.headers);
  var cutoff = Date.now() - ADMIN_LOCKOUT.lockoutMin * 60 * 1000;
  var data = rows(s);
  var n = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i][1] === clientId && data[i][2] === "FAIL" && new Date(data[i][0]).getTime() > cutoff) n++;
  }
  return n;
}
function logAdmin(clientId, result, action, detail) {
  var s = sheet(SHEETS.adminLog.name, SHEETS.adminLog.headers);
  s.appendRow([new Date(), clientId || "unknown", result, action, detail || ""]);
}

// ---------- sheet helpers ----------
function sheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange(1, 1, 1, headers.length).setValues([headers]);
    s.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold").setBackground("#16211B").setFontColor("#FFFFFF");
    s.setFrozenRows(1);
  }
  return s;
}

function rows(s) {
  var last = s.getLastRow();
  if (last <= 1) return [];
  return s.getRange(2, 1, last - 1, s.getLastColumn()).getValues();
}

function nextId(s, prefix) {
  return prefix + "-" + String(Math.max(0, s.getLastRow() - 1) + 1).padStart(3, "0");
}

var SHEETS = {
  projects:  { name: "Platform Projects",  headers: ["ID","Timestamp","User Type","Name","Email","Contact","Org","Uni ID","Team","Title","Abstract","Start","End","Link","Status"] },
  bookings:  { name: "Platform Bookings",  headers: ["ID","Timestamp","Project ID","Email","Machine ID","Date","Start","End","Purpose","Status"] },
  checkouts: { name: "Platform Checkouts", headers: ["ID","Timestamp","Name","Email","Category","Tool","Qty","Due","Status"] },
  issues:    { name: "Platform Issues",    headers: ["ID","Timestamp","Name","Email","Type","Severity","Machine","Description","Date","Status"] },
  rate:      { name: "Platform RateLimits",headers: ["Action","Key","Timestamp"] },
  adminLog:  { name: "Platform Admin Log", headers: ["Timestamp","Client ID","Result","Action","Detail"] }
};

// ---------- actions ----------
function registerProject(p) {
  var s = sheet(SHEETS.projects.name, SHEETS.projects.headers);
  var id = nextId(s, "TL");
  s.appendRow([id, new Date(), p.userType, p.name, p.email, p.contact, p.org,
               p.uniId || "", p.team || "", p.title, p.abstract,
               p.startDate, p.endDate || "", p.link || "", "Pending"]);
  safeMail(p.email, "Tinkerers' Lab — Project Registered (" + id + ")",
    "Dear " + p.name + ",\n\nYour project \"" + p.title + "\" is registered.\n\n" +
    "Project ID: " + id + "\n\nUse this ID when booking machines.\n" +
    "A coordinator will review your registration.\n\n— Tinkerers' Lab, Ahmedabad University");
  return { ok: true, projectId: id };
}

function getProjectsByEmail(p) {
  var s = sheet(SHEETS.projects.name, SHEETS.projects.headers);
  var out = [];
  rows(s).forEach(function (r) {
    if (String(r[4]).toLowerCase() === String(p.email).toLowerCase()) {
      out.push({ id: r[0], title: r[9], status: r[14] });
    }
  });
  return { projects: out };
}

function getBookings(p) {
  var s = sheet(SHEETS.bookings.name, SHEETS.bookings.headers);
  var out = [];
  rows(s).forEach(function (r) {
    var date = r[5] instanceof Date ? Utilities.formatDate(r[5], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(r[5]);
    var status = r[9];
    if (status === "Rejected" || status === "Cancelled") return;
    if (p.machineId && r[4] !== p.machineId) return;
    if (p.date && date !== p.date) return;
    out.push({ id: r[0], projectId: r[2], email: r[3], machineId: r[4],
               date: date, start: fmtTime(r[6]), end: fmtTime(r[7]), status: status });
  });
  return { bookings: out };
}

function createBooking(p) {
  // Sanity checks
  var start = new Date(p.date + "T" + p.start + ":00");
  var end   = new Date(p.date + "T" + p.end   + ":00");
  var now   = new Date();
  if (isNaN(start) || isNaN(end))      throw new Error("Invalid date/time.");
  if (end <= start)                    throw new Error("End time must be after start time.");
  if (start < now)                     throw new Error("Cannot book in the past.");
  var hoursAhead = (start - now) / 3600000;
  if (hoursAhead > BOOKING_MAX_HOURS_AHEAD) throw new Error("Bookings must be within " + Math.floor(BOOKING_MAX_HOURS_AHEAD/24) + " days.");
  var lengthHrs = (end - start) / 3600000;
  if (lengthHrs > BOOKING_MAX_LENGTH_HRS)   throw new Error("Single booking cannot exceed " + BOOKING_MAX_LENGTH_HRS + " hours.");
  if (!p.projectId)                    throw new Error("Project ID required — register a project first.");

  // Verify projectId belongs to this email
  var pr = sheet(SHEETS.projects.name, SHEETS.projects.headers);
  var owns = rows(pr).some(function (r) {
    return r[0] === p.projectId && String(r[4]).toLowerCase() === String(p.email).toLowerCase();
  });
  if (!owns) throw new Error("Project ID does not match this email.");

  // Conflict check
  var existing = getBookings({ machineId: p.machineId, date: p.date }).bookings;
  for (var i = 0; i < existing.length; i++) {
    var b = existing[i];
    if (!(p.end <= b.start || p.start >= b.end)) {
      throw new Error("That slot overlaps an existing booking (" + b.start + "–" + b.end + ").");
    }
  }
  var s = sheet(SHEETS.bookings.name, SHEETS.bookings.headers);
  var id = nextId(s, "B");
  s.appendRow([id, new Date(), p.projectId, p.email, p.machineId, p.date, p.start, p.end, p.purpose, "Pending"]);
  sendBookingEmail(id, p, "Pending");
  return { ok: true, bookingId: id };
}

// ============================================================
// BOOKING EMAILS — HTML confirmation + calendar (.ics) attachment
// ============================================================
// Sends a nicely formatted email to the user with an .ics file
// so they can add the slot to Google Calendar in one click.
// CC's the lab coordinator on every booking so nothing slips.
function sendBookingEmail(bookingId, p, status) {
  var mName = machineName(p.machineId);
  var statusText = status === "Approved" ? "APPROVED"
                 : status === "Rejected" ? "REJECTED"
                 : "PENDING APPROVAL";
  var accent = status === "Approved" ? "#1F5F3F"
             : status === "Rejected" ? "#B3261E"
             : "#E85D26";

  var subject = "[" + LAB_NAME + "] " + mName + " — " +
                p.date + " " + p.start + "–" + p.end + " (" + bookingId + ")";

  var html =
    '<div style="font-family:Arial,sans-serif;max-width:560px;color:#16211B">' +
      '<div style="background:#16211B;color:#fff;padding:18px 22px;border-left:6px solid ' + accent + '">' +
        '<div style="font-size:11px;letter-spacing:1.5px;color:' + accent + '">BOOKING ' + statusText + '</div>' +
        '<div style="font-size:20px;font-weight:800;margin-top:4px">' + mName + '</div>' +
      '</div>' +
      '<div style="border:1px solid #CBD3CC;border-top:none;padding:22px">' +
        '<p>Hi,</p>' +
        '<p>' + bookingSummary(status) + '</p>' +
        '<table style="border-collapse:collapse;font-size:14px;margin:14px 0">' +
          row("Booking ID", bookingId) +
          row("Machine",    mName) +
          row("Date",       p.date) +
          row("Time",       p.start + " – " + p.end) +
          row("Project ID", p.projectId) +
          row("Purpose",    escapeHtml(p.purpose || "—")) +
          row("Status",     '<b style="color:' + accent + '">' + statusText + '</b>') +
        '</table>' +
        (status !== "Rejected"
          ? '<p style="margin-top:18px">📅 <b>Add to your calendar:</b> use the attached <code>.ics</code> file — Gmail will show an "Add to Calendar" button.</p>'
          : '<p style="margin-top:18px">If you believe this was rejected in error, please contact the lab coordinator.</p>') +
        '<p style="margin-top:22px;color:#45524B;font-size:13px">' +
          LAB_LOCATION + '<br>' +
          'Reply to this email to reach the lab coordinator.' +
        '</p>' +
      '</div>' +
    '</div>';

  var options = { htmlBody: html, cc: LAB_EMAIL, name: LAB_NAME, replyTo: LAB_EMAIL };
  if (status !== "Rejected") {
    options.attachments = [ makeIcsAttachment(bookingId, p, status) ];
  }
  try {
    MailApp.sendEmail(p.email, subject, "See HTML version.", options);
  } catch (err) {
    Logger.log("booking mail failed: " + err.message);
  }
}

function bookingSummary(status) {
  if (status === "Approved") return "Your booking is <b>confirmed</b>. See you at the lab.";
  if (status === "Rejected") return "Unfortunately your booking request has been <b>rejected</b>.";
  return "Your booking request has been received and is <b>pending coordinator approval</b>. You'll receive another email once it's reviewed.";
}
function row(k, v) {
  return '<tr>' +
    '<td style="padding:6px 14px 6px 0;color:#45524B;vertical-align:top">' + k + '</td>' +
    '<td style="padding:6px 0;font-family:monospace">' + v + '</td>' +
  '</tr>';
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// Build an .ics calendar attachment. Gmail turns this into an
// "Add to Calendar" button in the message header.
function makeIcsAttachment(bookingId, p, status) {
  var tz = Session.getScriptTimeZone();
  // p.date = "YYYY-MM-DD", p.start/end = "HH:MM"
  var dtStart = p.date.replace(/-/g, "") + "T" + p.start.replace(":", "") + "00";
  var dtEnd   = p.date.replace(/-/g, "") + "T" + p.end.replace(":", "")   + "00";
  var stamp   = Utilities.formatDate(new Date(), "UTC", "yyyyMMdd'T'HHmmss'Z'");
  var mName   = machineName(p.machineId);
  var summary = "Lab: " + mName + " (" + (status === "Approved" ? "Confirmed" : "Pending") + ")";

  var ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tinkerers Lab//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + bookingId + "@tinkerslab.ahduni",
    "DTSTAMP:" + stamp,
    "DTSTART;TZID=" + tz + ":" + dtStart,
    "DTEND;TZID="   + tz + ":" + dtEnd,
    "SUMMARY:" + summary,
    "LOCATION:" + LAB_LOCATION,
    "DESCRIPTION:" +
      "Booking ID: " + bookingId + "\\n" +
      "Machine: " + mName + "\\n" +
      "Project: " + (p.projectId || "") + "\\n" +
      "Purpose: " + (p.purpose || "").replace(/\n/g, " ") + "\\n" +
      "Status: " + status,
    "STATUS:" + (status === "Approved" ? "CONFIRMED" : "TENTATIVE"),
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  return Utilities.newBlob(ics, "text/calendar", "booking-" + bookingId + ".ics");
}

function checkoutTool(p) {
  var s = sheet(SHEETS.checkouts.name, SHEETS.checkouts.headers);
  var id = nextId(s, "C");
  s.appendRow([id, new Date(), p.name, p.email, p.category, p.tool, p.qty, p.due, "Out"]);
  return { ok: true, checkoutId: id };
}

function returnTool(p) {
  var s = sheet(SHEETS.checkouts.name, SHEETS.checkouts.headers);
  var data = rows(s);
  for (var i = data.length - 1; i >= 0; i--) {
    if (String(data[i][3]).toLowerCase() === String(p.email).toLowerCase() &&
        String(data[i][5]).toLowerCase() === String(p.tool).toLowerCase() &&
        data[i][8] === "Out") {
      s.getRange(i + 2, 9).setValue("Returned");
      return { ok: true };
    }
  }
  throw new Error("No open checkout found for that email + tool.");
}

function getOpenCheckouts() {
  var s = sheet(SHEETS.checkouts.name, SHEETS.checkouts.headers);
  var out = [];
  rows(s).forEach(function (r) {
    if (r[8] === "Out") {
      var due = r[7] instanceof Date ? Utilities.formatDate(r[7], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(r[7]);
      out.push({ id: r[0], name: r[2], email: r[3], category: r[4], tool: r[5], qty: r[6], due: due, status: "Out" });
    }
  });
  return { checkouts: out };
}

function reportIssue(p) {
  var s = sheet(SHEETS.issues.name, SHEETS.issues.headers);
  var id = nextId(s, "R");
  s.appendRow([id, new Date(), p.name, p.email, p.type, p.severity, p.machine || "", p.desc, p.date, "Open"]);
  if (p.severity === "Urgent" || p.severity === "High") {
    safeMail(LAB_EMAIL, "⚠ " + p.severity + " lab issue reported (" + id + ")",
      p.type + " — " + (p.machine || "general") + "\n\n" + p.desc + "\n\nReported by " + p.name + " (" + p.email + ")");
  }
  return { ok: true, issueId: id };
}

function adminGetAll() {
  var pr = sheet(SHEETS.projects.name, SHEETS.projects.headers);
  var bk = sheet(SHEETS.bookings.name, SHEETS.bookings.headers);
  var iss = sheet(SHEETS.issues.name, SHEETS.issues.headers);
  return {
    projects: rows(pr).map(function (r) { return { id: r[0], userType: r[2], name: r[3], email: r[4], title: r[9], status: r[14] }; }),
    bookings: getBookingsAllStatuses(bk),
    checkouts: getOpenCheckouts().checkouts,
    issues: rows(iss).map(function (r) { return { id: r[0], name: r[2], email: r[3], type: r[4], severity: r[5], machine: r[6], desc: r[7], status: r[9] }; })
  };
}

function getBookingsAllStatuses(s) {
  return rows(s).map(function (r) {
    var date = r[5] instanceof Date ? Utilities.formatDate(r[5], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(r[5]);
    return { id: r[0], projectId: r[2], email: r[3], machineId: r[4], date: date,
             start: fmtTime(r[6]), end: fmtTime(r[7]), status: r[9] };
  });
}

function setStatus(sheetName, id, status, isBooking) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(sheetName);
  var data = rows(s);
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === id) {
      var col = isBooking ? 10 : 10; // status column for both sheets
      s.getRange(i + 2, col).setValue(status);
      if (isBooking && (status === "Approved" || status === "Rejected")) {
        var dateStr = data[i][5] instanceof Date
          ? Utilities.formatDate(data[i][5], Session.getScriptTimeZone(), "yyyy-MM-dd")
          : String(data[i][5]);
        sendBookingEmail(id, {
          email:     data[i][3],
          projectId: data[i][2],
          machineId: data[i][4],
          date:      dateStr,
          start:     fmtTime(data[i][6]),
          end:       fmtTime(data[i][7]),
          purpose:   data[i][8]
        }, status);
      }
      return { ok: true };
    }
  }
  throw new Error("Record " + id + " not found");
}

// ---------- utilities ----------
function fmtTime(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "HH:mm");
  return String(v);
}

function safeMail(to, subject, body) {
  try { MailApp.sendEmail(to, subject, body); }
  catch (e) { Logger.log("mail failed: " + e.message); }
}

// ---------- daily reminders (optional) ----------
// Run setupDailyTrigger() once to enable:
//  - reminds users of tomorrow's approved bookings
//  - nags overdue tool checkouts
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "dailyReminders") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("dailyReminders").timeBased().everyDays(1).atHour(8).create();
}

function dailyReminders() {
  var tz = Session.getScriptTimeZone();
  var tomorrow = Utilities.formatDate(new Date(Date.now() + 86400000), tz, "yyyy-MM-dd");
  var today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");

  getBookings({ date: tomorrow }).bookings.forEach(function (b) {
    if (b.status === "Approved") {
      safeMail(b.email,
        "Reminder: " + machineName(b.machineId) + " booked tomorrow " + b.start + "–" + b.end,
        "Hi,\n\nJust a reminder that you have the " + machineName(b.machineId) +
        " booked tomorrow (" + tomorrow + "), " + b.start + "–" + b.end + ".\n\n" +
        "Booking ID: " + b.id + "\n\n" +
        "— " + LAB_NAME);
    }
  });

  getOpenCheckouts().checkouts.forEach(function (c) {
    if (c.due < today) {
      safeMail(c.email, "Overdue: please return " + c.tool,
        "Hi " + c.name + ",\n\nOur records show " + c.tool + " (×" + c.qty + ") was due back on " + c.due + ". Please return it to the lab.\n\n— Tinkerers' Lab");
    }
  });
}
