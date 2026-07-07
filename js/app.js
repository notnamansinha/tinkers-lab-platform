// ============================================================
// Tinkerers' Lab Platform — views + hash router (no framework)
// Every view is a function returning HTML; events bind after
// render. Data access ONLY via Api.* (see api.js).
// ============================================================

const $ = (sel, el = document) => el.querySelector(sel);
const app = $("#app");

function toast(msg, ms = 3200) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

// ---------- router ----------
const routes = {};
function route(path, fn) { routes[path] = fn; }

async function render() {
  const path = location.hash.replace(/^#/, "") || "/";
  const fn = routes[path] || routes["/"];
  document.querySelectorAll(".nav a").forEach(a =>
    a.classList.toggle("active", a.dataset.route === path));
  $("#nav").classList.remove("open");
  app.innerHTML = `<p class="empty">Loading…</p>`;
  try { await fn(); } catch (e) { app.innerHTML = `<div class="notice">Something went wrong: ${esc(e.message)}</div>`; }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);
$("#navToggle").addEventListener("click", () => $("#nav").classList.toggle("open"));


// ============================================================
// DASHBOARD
// ============================================================
route("/", async () => {
  const [bk, co] = await Promise.all([
    Api.getBookings(null, todayStr()),
    Api.getOpenCheckouts()
  ]);
  app.innerHTML = `
  <section class="hero">
    <div class="eyebrow">Innovation &amp; Tinkering Lab · Ahmedabad University</div>
    <h1>Build it. <em>Book it.</em> Bring it back.</h1>
    <p>One place to register your project, reserve machines, check out tools and keep the lab running smoothly — for students, faculty, venture-studio startups and visitors.</p>
    <div class="hero-actions">
      <a class="btn" href="#/book">Book a machine</a>
      <a class="btn ghost" style="color:#fff;border-color:#3A463F" href="#/register">Register a project</a>
    </div>
  </section>

  <div class="stats">
    <div class="stat"><b>${CONFIG.MACHINES.length}</b><span>Bookable machines</span></div>
    <div class="stat"><b>${bk.bookings.length}</b><span>Bookings today</span></div>
    <div class="stat"><b>${co.checkouts.length}</b><span>Tools checked out</span></div>
    <div class="stat"><b>${CONFIG.OPEN_HOUR}:00–${CONFIG.CLOSE_HOUR}:00</b><span>Lab hours</span></div>
  </div>

  <div class="eyebrow">Today's machine schedule</div>
  ${bk.bookings.length ? `
  <table class="tbl">
    <tr><th>Machine</th><th>Time</th><th>Booked by</th><th>Status</th></tr>
    ${bk.bookings.map(b => `
      <tr>
        <td>${esc(machineName(b.machineId))}</td>
        <td class="mono">${esc(b.start)}–${esc(b.end)}</td>
        <td>${esc(b.email)}</td>
        <td><span class="badge ${esc(b.status)}">${esc(b.status)}</span></td>
      </tr>`).join("")}
  </table>` : `<div class="empty">No bookings yet today — every machine is free.</div>`}
  `;
});

function machineName(id) {
  const m = CONFIG.MACHINES.find(x => x.id === id);
  return m ? m.name : id;
}


// ============================================================
// MACHINES
// ============================================================
route("/machines", async () => {
  const cats = [...new Set(CONFIG.MACHINES.map(m => m.category))];
  app.innerHTML = `
    <div class="eyebrow">Equipment</div>
    <h1 class="page-title">Machines</h1>
    <p class="page-sub">Tier-1 equipment needs a booking. Hand tools and small power tools go through <a href="#/checkout">tool checkout</a> instead.</p>
    ${cats.map(cat => `
      <h3 style="font-family:var(--display);margin:26px 0 12px">${esc(cat)}</h3>
      <div class="grid grid-3">
        ${CONFIG.MACHINES.filter(m => m.category === cat).map(m => `
          <div class="card plate">
            <span class="plate-id">${esc(m.id.toUpperCase())}</span>
            <h3>${esc(m.name)}</h3>
            <div class="cat">${esc(m.category)}</div>
            <p>${esc(m.desc)}</p>
            <span class="tag ${m.trained ? "" : "free"}">${m.trained ? "TRAINING REQUIRED" : "OPEN USE"}</span>
            <div style="margin-top:14px"><a class="btn small" href="#/book?m=${m.id}">Book this machine</a></div>
          </div>`).join("")}
      </div>`).join("")}
  `;
});


// ============================================================
// BOOK A MACHINE (with visual slot picker + conflict awareness)
// ============================================================
route("/book", async () => {
  const preselect = new URLSearchParams(location.hash.split("?")[1] || "").get("m") || "";
  app.innerHTML = `
    <div class="eyebrow">Reservation</div>
    <h1 class="page-title">Book a machine</h1>
    <p class="page-sub">Your project must be <a href="#/register">registered</a> first. Enter the email you registered with — we'll find your projects.</p>

    <form class="panel" id="bookForm">
      <div style="position:absolute;left:-9999px" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
      <div class="field">
        <label>Registered email <span class="req">*</span></label>
        <input type="email" name="email" required placeholder="you@ahduni.edu.in">
        <div class="hint">Press Tab or click away — your projects load automatically.</div>
      </div>
      <div class="field">
        <label>Project <span class="req">*</span></label>
        <select name="projectId" required disabled><option value="">Enter your email first</option></select>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Machine <span class="req">*</span></label>
          <select name="machineId" required>
            <option value="">Select machine…</option>
            ${CONFIG.MACHINES.map(m => `<option value="${m.id}" ${m.id === preselect ? "selected" : ""}>${esc(m.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Date <span class="req">*</span></label>
          <input type="date" name="date" required min="${todayStr()}" value="${todayStr()}">
        </div>
      </div>

      <div class="field">
        <label>Time slots <span class="req">*</span> <span class="hint" style="display:inline">— click one or more consecutive slots</span></label>
        <div class="slots" id="slots"><div class="hint">Pick a machine and date to see availability.</div></div>
      </div>

      <div class="field">
        <label>Purpose on this project <span class="req">*</span></label>
        <textarea name="purpose" required placeholder="e.g. Laser-cutting acrylic enclosure panels"></textarea>
      </div>
      <button class="btn" type="submit">Request booking</button>
    </form>
  `;

  const form = $("#bookForm");
  const slotBox = $("#slots");
  let selected = [];   // ["10:00", "11:00"]
  let taken = [];      // [{start,end}]

  async function loadProjects() {
    const email = form.email.value.trim();
    if (!email) return;
    const sel = form.projectId;
    sel.innerHTML = `<option>Loading…</option>`;
    try {
      const { projects } = await Api.getProjectsByEmail(email);
      if (!projects.length) {
        sel.innerHTML = `<option value="">No projects found — register first</option>`;
        sel.disabled = true;
        return;
      }
      sel.disabled = false;
      sel.innerHTML = projects.map(p => `<option value="${esc(p.id)}">${esc(p.id)} — ${esc(p.title)}</option>`).join("");
    } catch (e) { sel.innerHTML = `<option value="">${esc(e.message)}</option>`; }
  }

  async function loadSlots() {
    const m = form.machineId.value, d = form.date.value;
    selected = [];
    if (!m || !d) { slotBox.innerHTML = `<div class="hint">Pick a machine and date to see availability.</div>`; return; }
    slotBox.innerHTML = `<div class="hint">Checking availability…</div>`;
    const { bookings } = await Api.getBookings(m, d);
    taken = bookings.map(b => ({ start: b.start, end: b.end }));
    const slots = [];
    for (let h = CONFIG.OPEN_HOUR; h < CONFIG.CLOSE_HOUR; h++) {
      const s = String(h).padStart(2, "0") + ":00";
      const e = String(h + 1).padStart(2, "0") + ":00";
      const isTaken = taken.some(t => !(e <= t.start || s >= t.end));
      slots.push({ s, e, isTaken });
    }
    slotBox.innerHTML = slots.map(x =>
      `<div class="slot ${x.isTaken ? "taken" : ""}" data-s="${x.s}" data-e="${x.e}">${x.s}–${x.e}</div>`).join("");
    slotBox.querySelectorAll(".slot:not(.taken)").forEach(el => {
      el.addEventListener("click", () => {
        const s = el.dataset.s;
        if (selected.includes(s)) selected = selected.filter(x => x !== s);
        else selected.push(s);
        selected.sort();
        el.classList.toggle("sel");
      });
    });
  }

  form.email.addEventListener("blur", loadProjects);
  form.machineId.addEventListener("change", loadSlots);
  form.date.addEventListener("change", loadSlots);
  if (preselect) loadSlots();

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!selected.length) return toast("Pick at least one time slot.");
    // consecutive check
    for (let i = 1; i < selected.length; i++) {
      const prevEnd = String(parseInt(selected[i - 1]) + 1).padStart(2, "0") + ":00";
      if (selected[i] !== prevEnd) return toast("Slots must be consecutive.");
    }
    const start = selected[0];
    const end = String(parseInt(selected[selected.length - 1]) + 1).padStart(2, "0") + ":00";
    const btn = form.querySelector("button");
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      const r = await Api.createBooking({
        email: form.email.value.trim(),
        projectId: form.projectId.value,
        machineId: form.machineId.value,
        date: form.date.value,
        start, end,
        purpose: form.purpose.value.trim()
      });
      app.innerHTML = confirmationCard("Booking requested", `
        <p>Your booking <b class="mono">${esc(r.bookingId)}</b> for the <b>${esc(machineName(form.machineId.value))}</b> on <b>${esc(form.date.value)}</b>, <b class="mono">${start}–${end}</b> is now <span class="badge Pending">Pending</span> coordinator approval.</p>
        <p>You'll receive a confirmation email once approved.</p>`);
    } catch (e) {
      toast(e.message); btn.disabled = false; btn.textContent = "Request booking";
    }
  });
});

function confirmationCard(title, bodyHtml) {
  return `
    <div class="card" style="max-width:620px;margin:40px auto;border-top-color:var(--accent-2)">
      <div class="eyebrow">Done</div>
      <h1 class="page-title" style="font-size:26px">${esc(title)}</h1>
      <div style="display:grid;gap:10px;font-size:14.5px">${bodyHtml}</div>
      <div style="margin-top:20px;display:flex;gap:10px">
        <a class="btn" href="#/">Back to dashboard</a>
      </div>
    </div>`;
}


// ============================================================
// REGISTER PROJECT
// ============================================================
route("/register", async () => {
  app.innerHTML = `
    <div class="eyebrow">Step 1 of using the lab</div>
    <h1 class="page-title">Register a project</h1>
    <p class="page-sub">Register once per project. You'll get a Project ID by email — use it for all your machine bookings. To add teammates later, email the lab coordinator.</p>

    <form class="panel" id="regForm">
      <div style="position:absolute;left:-9999px" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
      <div class="field">
        <label>You are a… <span class="req">*</span></label>
        <select name="userType" required>
          ${CONFIG.USER_TYPES.map(t => `<option>${esc(t)}</option>`).join("")}
        </select>
      </div>
      <div class="field-row">
        <div class="field"><label>Full name <span class="req">*</span></label><input name="name" required></div>
        <div class="field"><label>Email <span class="req">*</span></label><input type="email" name="email" required></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Contact number <span class="req">*</span></label><input name="contact" required></div>
        <div class="field"><label id="orgLabel">Department / Organization <span class="req">*</span></label><input name="org" required></div>
      </div>
      <div class="field" id="uniIdField">
        <label>University ID</label><input name="uniId" placeholder="e.g. AU2440123">
      </div>
      <div class="field">
        <label>Team members</label>
        <input name="team" placeholder="Names and IDs, comma separated (optional)">
      </div>
      <div class="field">
        <label>Project title <span class="req">*</span></label><input name="title" required>
      </div>
      <div class="field">
        <label>Project abstract <span class="req">*</span></label>
        <textarea name="abstract" required placeholder="What are you building or researching?"></textarea>
      </div>
      <div class="field-row">
        <div class="field"><label>Start date <span class="req">*</span></label><input type="date" name="startDate" required></div>
        <div class="field"><label>Estimated end date</label><input type="date" name="endDate"></div>
      </div>
      <div class="field">
        <label>Resource link</label><input name="link" placeholder="GitHub / Drive / Notion link (optional)">
      </div>
      <div class="field">
        <label style="display:flex;gap:10px;align-items:flex-start;font-weight:500">
          <input type="checkbox" required style="width:auto;margin-top:3px">
          I agree to follow lab safety guidelines and return all tools and equipment after use.
        </label>
      </div>
      <button class="btn" type="submit">Register project</button>
    </form>
  `;

  const form = $("#regForm");
  form.userType.addEventListener("change", () => {
    const t = form.userType.value;
    $("#uniIdField").style.display = t === "Student" ? "" : "none";
    $("#orgLabel").firstChild.textContent =
      t === "Venture Studio Startup" ? "Startup name " :
      t === "External Visitor" ? "Organization " : "Department ";
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (form.endDate.value && form.endDate.value < form.startDate.value)
      return toast("End date can't be before start date.");
    const btn = form.querySelector("button");
    btn.disabled = true; btn.textContent = "Registering…";
    try {
      const r = await Api.registerProject({
        userType: form.userType.value, name: form.name.value.trim(),
        email: form.email.value.trim(), contact: form.contact.value.trim(),
        org: form.org.value.trim(), uniId: form.uniId.value.trim(),
        team: form.team.value.trim(), title: form.title.value.trim(),
        abstract: form.abstract.value.trim(), startDate: form.startDate.value,
        endDate: form.endDate.value, link: form.link.value.trim()
      });
      app.innerHTML = confirmationCard("Project registered", `
        <p>Your Project ID is <b class="mono" style="font-size:18px">${esc(r.projectId)}</b> — save it, you'll use it for every booking.</p>
        <p>A confirmation email is on its way. A coordinator will review your registration.</p>
        <p><a class="btn small" href="#/book">Book your first machine →</a></p>`);
    } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = "Register project"; }
  });
});


// ============================================================
// TOOL CHECKOUT
// ============================================================
route("/checkout", async () => {
  const { checkouts } = await Api.getOpenCheckouts();
  app.innerHTML = `
    <div class="eyebrow">Hand &amp; power tools</div>
    <h1 class="page-title">Tool checkout</h1>
    <p class="page-sub">For tools that don't need a time slot — take, use, return. Overdue items get automatic reminder emails.</p>

    <div class="grid grid-2" style="align-items:start">
      <form class="panel" id="coForm">
      <div style="position:absolute;left:-9999px" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="field">
          <label>Action <span class="req">*</span></label>
          <select name="action"><option value="out">Checking out</option><option value="return">Returning</option></select>
        </div>
        <div class="field-row">
          <div class="field"><label>Full name <span class="req">*</span></label><input name="name" required></div>
          <div class="field"><label>Email <span class="req">*</span></label><input type="email" name="email" required></div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Category <span class="req">*</span></label>
            <select name="category">${CONFIG.TOOL_CATEGORIES.map(c => `<option>${esc(c)}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Quantity <span class="req">*</span></label><input type="number" name="qty" min="1" value="1" required></div>
        </div>
        <div class="field">
          <label>Tool <span class="req">*</span></label>
          <input name="tool" required placeholder="e.g. Cordless Drill GSB 180-LI">
        </div>
        <div class="field" id="dueField">
          <label>Expected return date <span class="req">*</span></label>
          <input type="date" name="due" min="${todayStr()}" value="${todayStr()}">
        </div>
        <button class="btn" type="submit">Submit</button>
      </form>

      <div>
        <div class="eyebrow">Currently checked out</div>
        ${checkouts.length ? `
        <table class="tbl">
          <tr><th>Tool</th><th>Who</th><th>Due</th></tr>
          ${checkouts.map(c => `<tr><td>${esc(c.tool)} ×${esc(c.qty)}</td><td>${esc(c.name || c.email)}</td><td class="mono">${esc(c.due)}</td></tr>`).join("")}
        </table>` : `<div class="empty">Nothing is checked out right now.</div>`}
      </div>
    </div>
  `;

  const form = $("#coForm");
  form.action.addEventListener("change", () => {
    $("#dueField").style.display = form.action.value === "out" ? "" : "none";
  });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      if (form.action.value === "out") {
        await Api.checkoutTool({
          name: form.name.value.trim(), email: form.email.value.trim(),
          category: form.category.value, tool: form.tool.value.trim(),
          qty: form.qty.value, due: form.due.value
        });
        toast("Checked out — return it by " + form.due.value + ".");
      } else {
        await Api.returnTool({ email: form.email.value.trim(), tool: form.tool.value.trim() });
        toast("Marked as returned. Thanks!");
      }
      render();
    } catch (e) { toast(e.message); btn.disabled = false; }
  });
});


// ============================================================
// REPORT ISSUE / SUGGESTION
// ============================================================
route("/report", async () => {
  app.innerHTML = `
    <div class="eyebrow">Keep the lab running</div>
    <h1 class="page-title">Report an issue or suggest something</h1>
    <p class="page-sub">Machine acting up? Missing tool? Idea to improve the lab? Tell us — urgent reports alert the coordinator immediately.</p>

    <form class="panel" id="repForm">
      <div style="position:absolute;left:-9999px" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
      <div class="field-row">
        <div class="field"><label>Your name <span class="req">*</span></label><input name="name" required></div>
        <div class="field"><label>Email <span class="req">*</span></label><input type="email" name="email" required></div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Type <span class="req">*</span></label>
          <select name="type">
            <option>Machine Malfunction</option><option>Safety Concern</option>
            <option>Missing or Damaged Item</option><option>Suggestion</option><option>Other</option>
          </select>
        </div>
        <div class="field">
          <label>Severity <span class="req">*</span></label>
          <select name="severity"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
        </div>
      </div>
      <div class="field">
        <label>Related machine or tool</label>
        <input name="machine" list="machineList" placeholder="Start typing…">
        <datalist id="machineList">${CONFIG.MACHINES.map(m => `<option value="${esc(m.name)}">`).join("")}</datalist>
      </div>
      <div class="field">
        <label>Description <span class="req">*</span></label>
        <textarea name="desc" required placeholder="What happened / your suggestion"></textarea>
      </div>
      <button class="btn" type="submit">Send report</button>
    </form>
  `;
  const form = $("#repForm");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector("button"); btn.disabled = true;
    try {
      const r = await Api.reportIssue({
        name: form.name.value.trim(), email: form.email.value.trim(),
        type: form.type.value, severity: form.severity.value,
        machine: form.machine.value.trim(), desc: form.desc.value.trim(),
        date: todayStr()
      });
      app.innerHTML = confirmationCard("Report received", `
        <p>Ticket <b class="mono">${esc(r.issueId)}</b> logged. ${form.severity.value === "Urgent" ? "The coordinator has been alerted immediately." : "The coordinator will review it soon."}</p>`);
    } catch (e) { toast(e.message); btn.disabled = false; }
  });
});


// ============================================================
// ADMIN
// ============================================================
route("/admin", async () => {
  const key = sessionStorage.getItem("tl-admin-key");
  if (!key) {
    app.innerHTML = `
      <div class="eyebrow">Coordinator access</div>
      <h1 class="page-title">Admin</h1>
      <form class="panel" id="keyForm" style="max-width:420px">
        <div class="field"><label>Admin key</label><input type="password" name="key" required placeholder="Ask the lab coordinator"></div>
        <button class="btn">Enter</button>
        <div class="hint" style="margin-top:8px">In demo mode any key works. In production the key is checked by the backend.</div>
      </form>`;
    $("#keyForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const key = ev.target.key.value;
      const btn = ev.target.querySelector("button");
      btn.disabled = true; btn.textContent = "Checking…";
      try {
        const r = await Api.adminLogin(key);
        if (!r.ok) { toast(r.error || "Invalid key."); btn.disabled = false; btn.textContent = "Enter"; return; }
        sessionStorage.setItem("tl-admin-key", key);
        render();
      } catch (e) {
        toast(e.message); btn.disabled = false; btn.textContent = "Enter";
      }
    });
    return;
  }

  let data;
  try { data = await Api.adminGetAll(key); }
  catch (e) {
    sessionStorage.removeItem("tl-admin-key");
    app.innerHTML = `<div class="notice">Admin key rejected: ${esc(e.message)} — reload and try again.</div>`;
    return;
  }
  const overdue = data.checkouts.filter(c => c.status === "Out" && c.due < todayStr());

  app.innerHTML = `
    <div class="eyebrow">Coordinator panel</div>
    <h1 class="page-title">Admin</h1>
    <div class="stats">
      <div class="stat"><b>${data.bookings.filter(b => b.status === "Pending").length}</b><span>Bookings to approve</span></div>
      <div class="stat"><b>${data.checkouts.filter(c => c.status === "Out").length}</b><span>Tools out</span></div>
      <div class="stat"><b>${overdue.length}</b><span>Overdue returns</span></div>
      <div class="stat"><b>${data.issues.filter(i => i.status === "Open").length}</b><span>Open issues</span></div>
    </div>

    <div class="eyebrow">Booking requests</div>
    ${data.bookings.length ? `<table class="tbl">
      <tr><th>ID</th><th>Machine</th><th>Date · Time</th><th>Project</th><th>Status</th><th></th></tr>
      ${data.bookings.map(b => `<tr>
        <td class="mono">${esc(b.id)}</td>
        <td>${esc(machineName(b.machineId))}</td>
        <td class="mono">${esc(b.date)} ${esc(b.start)}–${esc(b.end)}</td>
        <td>${esc(b.projectId)}<br><small>${esc(b.email)}</small></td>
        <td><span class="badge ${esc(b.status)}">${esc(b.status)}</span></td>
        <td>${b.status === "Pending" ? `
          <button class="btn small" data-approve="${esc(b.id)}">Approve</button>
          <button class="btn small ghost" data-reject="${esc(b.id)}">Reject</button>` : ""}</td>
      </tr>`).join("")}
    </table>` : `<div class="empty">No bookings yet.</div>`}

    <div class="eyebrow" style="margin-top:32px">Projects</div>
    ${data.projects.length ? `<table class="tbl">
      <tr><th>ID</th><th>Title</th><th>Owner</th><th>Type</th><th>Status</th></tr>
      ${data.projects.map(p => `<tr>
        <td class="mono">${esc(p.id)}</td><td>${esc(p.title)}</td>
        <td>${esc(p.name)}<br><small>${esc(p.email)}</small></td>
        <td>${esc(p.userType)}</td>
        <td><span class="badge ${esc(p.status)}">${esc(p.status)}</span></td>
      </tr>`).join("")}
    </table>` : `<div class="empty">No projects yet.</div>`}

    <div class="eyebrow" style="margin-top:32px">Issues</div>
    ${data.issues.length ? `<table class="tbl">
      <tr><th>ID</th><th>Type</th><th>Severity</th><th>Machine</th><th>Description</th><th>Status</th><th></th></tr>
      ${data.issues.map(i => `<tr>
        <td class="mono">${esc(i.id)}</td><td>${esc(i.type)}</td>
        <td><span class="badge ${esc(i.severity)}">${esc(i.severity)}</span></td>
        <td>${esc(i.machine || "—")}</td><td>${esc(i.desc)}</td>
        <td><span class="badge ${esc(i.status)}">${esc(i.status)}</span></td>
        <td>${i.status === "Open" ? `<button class="btn small" data-resolve="${esc(i.id)}">Resolve</button>` : ""}</td>
      </tr>`).join("")}
    </table>` : `<div class="empty">No issues reported. Lovely.</div>`}

    <p style="margin-top:26px"><button class="btn ghost small" id="logout">Sign out of admin</button></p>
  `;

  app.querySelectorAll("[data-approve]").forEach(b => b.addEventListener("click", async () => {
    await Api.adminSetBookingStatus(key, b.dataset.approve, "Approved"); toast("Booking approved."); render();
  }));
  app.querySelectorAll("[data-reject]").forEach(b => b.addEventListener("click", async () => {
    await Api.adminSetBookingStatus(key, b.dataset.reject, "Rejected"); toast("Booking rejected."); render();
  }));
  app.querySelectorAll("[data-resolve]").forEach(b => b.addEventListener("click", async () => {
    await Api.adminSetIssueStatus(key, b.dataset.resolve, "Resolved"); toast("Issue resolved."); render();
  }));
  $("#logout").addEventListener("click", () => { sessionStorage.removeItem("tl-admin-key"); render(); });
});


// ---------- boot ----------
if (DEMO) $("#demoBadge").innerHTML = `<span class="badge Pending">DEMO MODE — set API_URL in js/config.js</span>`;
Api.ping();       // warm up Apps Script runtime so first submit is snappy
render();
