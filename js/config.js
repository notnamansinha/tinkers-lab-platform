// ============================================================
// Tinkerers' Lab Platform — Configuration
// ============================================================
// This is the ONLY file you need to edit for routine changes:
//   1. API_URL  — paste your Google Apps Script Web App URL
//   2. MACHINES — add/remove machines here
//   3. TOOL_CATEGORIES — for the checkout form
// ============================================================

const CONFIG = {

  // Paste your deployed Apps Script Web App URL here.
  // Leave empty ("") to run in DEMO MODE (sample data, stored in browser).
  API_URL: "",

  LAB_NAME: "Tinkerers' Lab",
  LAB_EMAIL: "tinkerslab@ahduni.edu.in",

  // Lab operating hours (24h) used by the booking slot picker
  OPEN_HOUR: 9,
  CLOSE_HOUR: 18,
  SLOT_MINUTES: 60,

  // ----------------------------------------------------------
  // MACHINES — Tier 1 bookable equipment
  // category: used for filtering and per-machine sheets
  // trained: true = requires training acknowledgement
  // ----------------------------------------------------------
  MACHINES: [
    { id: "bambu-x1c",    name: "Bambu Labs X-1C 3D Printer",      category: "Digital Fabrication", trained: true,  desc: "Multi-colour FDM printer, 256mm build volume." },
    { id: "creality-dual",name: "Creality Dual Nozzle 3D Printer", category: "Digital Fabrication", trained: true,  desc: "Dual-material FDM printing." },
    { id: "laser-cutter", name: "Success Laser Cutter",            category: "Digital Fabrication", trained: true,  desc: "CO₂ laser for acrylic, wood, cardboard." },
    { id: "muffle",       name: "Muffle Furnace S-900",            category: "Heavy Duty",          trained: true,  desc: "High-temperature furnace." },
    { id: "lathe",        name: "Lathe Machine KL-2",              category: "Heavy Duty",          trained: true,  desc: "ESSKAY metal lathe." },
    { id: "sheet-bender", name: "Manual Sheet Bender",             category: "Heavy Duty",          trained: false, desc: "Sheet-metal bending." },
    { id: "pillar-drill", name: "Pillar Drill 2HP",                category: "Heavy Duty",          trained: true,  desc: "Panchavati bench drill press." },
    { id: "table-saw",    name: "Table Saw GTS 10J",               category: "Tabletop Power",      trained: true,  desc: "Bosch table saw." },
    { id: "mitre-saw",    name: "Mitre Saw GCM 254",               category: "Tabletop Power",      trained: true,  desc: "Bosch mitre saw." },
    { id: "cutoff-saw",   name: "Metal Cut-off Saw GCO 220",       category: "Tabletop Power",      trained: true,  desc: "Bosch abrasive cut-off." },
    { id: "esd-station",  name: "ESD Workstation",                 category: "Electronics",         trained: false, desc: "Anti-static electronics bench." },
    { id: "oscilloscope", name: "Digital Oscilloscope SDS1022",    category: "Electronics",         trained: false, desc: "OWON 2-channel scope." },
    { id: "func-gen",     name: "Function Generator SFG1003",      category: "Electronics",         trained: false, desc: "GW Instek signal source." },
    { id: "solder",       name: "Soldering Station WE1010",        category: "Electronics",         trained: false, desc: "Weller temperature-controlled iron." }
  ],

  TOOL_CATEGORIES: [
    "Hand Tools", "Handheld Power Tools", "Measurement Tools", "Safety Equipment", "Other"
  ],

  USER_TYPES: [
    "Student", "Professor or Faculty", "Venture Studio Startup", "External Visitor"
  ]
};
