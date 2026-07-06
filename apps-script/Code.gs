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
  switch (action) {
    case "registerProject":      return registerProject(p);
    case "getProjectsByEmail":   return getProjectsByEmail(p);
    case "getBookings":          return getBookings(p);
    case "createBooking":        return createBooking(p);
    case "checkoutTool":         return checkoutTool(p);
    case "returnTool":           return returnTool(p);
    case "getOpenCheckouts":     return getOpenCheckouts();
    case "reportIssue":          return reportIssue(p);
    case "adminGetAll":          requireAdmin(p); return adminGetAll();
    case "adminSetBookingStatus":requireAdmin(p); return setStatus("Platform Bookings", p.id, p.status, true);
    case "adminSetIssueStatus":  requireAdmin(p); return setStatus("Platform Issues", p.id, p.status, false);
    default: throw new Error("Unknown action: " + action);
  }
}

function requireAdmin(p) {
  if (p.key !== ADMIN_KEY) throw new Error("Invalid admin key");
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
  issues:    { name: "Platform Issues",    headers: ["ID","Timestamp","Name","Email","Type","Severity","Machine","Description","Date","Status"] }
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
  // conflict check
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
  safeMail(p.email, "Tinkerers' Lab — Booking Requested (" + id + ")",
    "Your booking request:\n\nBooking ID: " + id + "\nMachine: " + p.machineId +
    "\nDate: " + p.date + "\nTime: " + p.start + "–" + p.end +
    "\n\nStatus: Pending coordinator approval. You'll get another email once approved.\n\n— Tinkerers' Lab");
  return { ok: true, bookingId: id };
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
        safeMail(data[i][3], "Tinkerers' Lab — Booking " + status + " (" + id + ")",
          "Your booking " + id + " (" + data[i][4] + ", " + data[i][5] + " " + fmtTime(data[i][6]) + "–" + fmtTime(data[i][7]) + ") has been " + status.toLowerCase() + ".\n\n— Tinkerers' Lab");
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
      safeMail(b.email, "Reminder: your lab booking tomorrow",
        "You have the " + b.machineId + " booked tomorrow " + b.start + "–" + b.end + ".\n\n— Tinkerers' Lab");
    }
  });

  getOpenCheckouts().checkouts.forEach(function (c) {
    if (c.due < today) {
      safeMail(c.email, "Overdue: please return " + c.tool,
        "Hi " + c.name + ",\n\nOur records show " + c.tool + " (×" + c.qty + ") was due back on " + c.due + ". Please return it to the lab.\n\n— Tinkerers' Lab");
    }
  });
}
