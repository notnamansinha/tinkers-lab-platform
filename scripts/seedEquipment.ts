/**
 * Tinkerers' Lab — Equipment Seed Script
 *
 * Seeds the Firestore `equipment` collection with every machine and tool
 * from both spec files (Device Management System + Tool Access System).
 *
 * Usage:
 *   npx ts-node scripts/seedEquipment.ts
 *
 * Or run via the admin panel "Seed Equipment" button (reads this data inline).
 *
 * IMPORTANT: Only run once, or re-run with force=true to overwrite existing docs.
 *
 * Tier system:
 *   bookable         — Tier 1: single-unit machines, calendar time-slot booking
 *   checkout         — Tier 2: multi-unit tools, borrow/return log
 *   freely_available — Tier 3: no booking needed, inventory tracking only
 *
 * confirmed:
 *   true  = physically present in the lab (Spec 2: 4 confirmed)
 *   false = from quotation, not yet physically present
 *   NOTE: ALL tools (Tier 2/3) are confirmed=true since they are physically in the lab.
 *         confirmed=false only applies to unconfirmed Tier 1 machines.
 */

export const EQUIPMENT_SEED = [
  // =========================================================
  // TIER 1 — BOOKABLE MACHINES (Calendar booking required)
  // =========================================================

  // ─── Digital Fabrication ─────────────────────────────────
  {
    machineId: 'bambu-x1c',
    name: 'Bambu Lab X1 Carbon (3D Printer)',
    tier: 'bookable',
    confirmed: true,           // Spec 2: physically confirmed
    category: 'Digital Fabrication',
    manufacturer: 'Bambu Labs',
    modelNumber: 'X-1C MultiColour',
    description: 'High-speed multi-colour FDM 3D printer. Supports PLA, ABS, PETG, TPU, ASA. Built-in AI failure detection.',
    location: 'Digital Fabrication Zone',
    status: 'available',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'creality-ender3v3',
    name: 'Creality Ender 3 V3+ (3D Printer)',
    tier: 'bookable',
    confirmed: true,           // Spec 2: physically confirmed
    category: 'Digital Fabrication',
    manufacturer: 'Creality',
    modelNumber: 'V3 Scanner / Dual Nozzle',
    description: 'Dual nozzle FDM 3D printer with auto-levelling. Great for multi-material prints.',
    location: 'Digital Fabrication Zone',
    status: 'available',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'phrozen-sonic-12k',
    name: 'Phrozen Sonic Mighty 12K (Resin Printer)',
    tier: 'bookable',
    confirmed: true,           // Spec 2: confirmed (added after quotation)
    category: 'Digital Fabrication',
    manufacturer: 'Phrozen',
    modelNumber: 'Sonic Mighty 12K',
    description: 'High-resolution MSLA resin 3D printer. 12K mono LCD. For detailed engineering and artistic prints.',
    location: 'Digital Fabrication Zone',
    status: 'available',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'laser-cutter',
    name: 'Laser Cutter',
    tier: 'bookable',
    confirmed: true,           // Spec 2: physically confirmed
    category: 'Digital Fabrication',
    manufacturer: 'SUCCESS',
    modelNumber: '—',
    description: 'CO2 laser cutter/engraver. Works on acrylic, MDF, plywood, cardboard, leather. Do NOT use on PVC or metals.',
    location: 'Digital Fabrication Zone',
    status: 'available',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },

  // ─── Heavy Duty / Furnace (from quotation — not yet confirmed) ──
  {
    machineId: 'muffle-furnace',
    name: 'Muffle Furnace (S-900)',
    tier: 'bookable',
    confirmed: false,
    category: 'Heavy Duty',
    manufacturer: 'Surya',
    modelNumber: 'S-900',
    description: 'High-temperature furnace for heat treatment, sintering, and annealing. Max temperature: 900°C.',
    location: 'Heavy Duty Zone',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'lathe-kl2',
    name: 'Lathe Machine (KL-2)',
    tier: 'bookable',
    confirmed: false,
    category: 'Heavy Duty',
    manufacturer: 'ESSKAY',
    modelNumber: 'KL-2',
    description: 'Centre lathe for turning, facing, threading, and boring operations on metal and wood.',
    location: 'Heavy Duty Zone',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'sheet-bender',
    name: 'Manual Sheet Bending Machine',
    tier: 'bookable',
    confirmed: false,
    category: 'Heavy Duty',
    manufacturer: 'ESSKAY',
    modelNumber: '—',
    description: 'Manual sheet metal bender for creating accurate bends in thin sheet metal.',
    location: 'Heavy Duty Zone',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'acrylic-bender',
    name: 'Acrylic Bending Machine',
    tier: 'bookable',
    confirmed: false,
    category: 'Digital Fabrication',
    manufacturer: '—',
    modelNumber: '—',
    description: 'Strip heater for bending acrylic and thermoplastic sheets into precise angles.',
    location: 'Digital Fabrication Zone',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: false,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },

  // ─── Tabletop Power (from quotation) ─────────────────────
  {
    machineId: 'pillar-drill',
    name: 'Pillar Drill (2HP)',
    tier: 'bookable',
    confirmed: false,
    category: 'Tabletop Power',
    manufacturer: 'Panchavati',
    modelNumber: '2HP',
    description: 'Floor-standing pillar drill press for precise vertical drilling in metal, wood, and plastic.',
    location: 'Tabletop Power Zone',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'table-saw',
    name: 'Table Saw (GTS 10J)',
    tier: 'bookable',
    confirmed: false,
    category: 'Tabletop Power',
    manufacturer: 'BOSCH',
    modelNumber: 'GTS 10J',
    description: '10-inch table saw with rip fence and mitre gauge. For precise straight cuts in wood.',
    location: 'Tabletop Power Zone',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'mitre-saw',
    name: 'Mitre Saw (GCM 254)',
    tier: 'bookable',
    confirmed: false,
    category: 'Tabletop Power',
    manufacturer: 'BOSCH',
    modelNumber: 'GCM 254',
    description: '10-inch sliding compound mitre saw. For angled cross-cuts in wood and moulding.',
    location: 'Tabletop Power Zone',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'cutoff-saw',
    name: 'Metal Cut-off Saw (GCO 220)',
    tier: 'bookable',
    confirmed: false,
    category: 'Heavy Duty',
    manufacturer: 'BOSCH',
    modelNumber: 'GCO 220',
    description: 'Abrasive cut-off saw for cutting mild steel, rebar, and pipe. Max disc: 355mm.',
    location: 'Heavy Duty Zone',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: true,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },

  // ─── Electronics (from quotation) ────────────────────────
  {
    machineId: 'esd-workstation',
    name: 'ESD Workstation (AWS 12060SP)',
    tier: 'bookable',
    confirmed: false,
    category: 'Electronics',
    manufacturer: 'Shrang',
    modelNumber: 'AWS 12060SP',
    description: 'Anti-static workstation for sensitive electronics assembly and repair work.',
    location: 'Electronics Lab',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: false,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'oscilloscope',
    name: 'Digital Oscilloscope (SDS1022)',
    tier: 'bookable',
    confirmed: false,
    category: 'Electronics',
    manufacturer: 'OWON',
    modelNumber: 'SDS1022',
    description: '2-channel 25MHz digital storage oscilloscope for signal visualization and debugging.',
    location: 'Electronics Lab',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: false,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'function-generator',
    name: 'Function Generator (SFG1003)',
    tier: 'bookable',
    confirmed: false,
    category: 'Electronics',
    manufacturer: 'GW INSTEK',
    modelNumber: 'SFG1003',
    description: '3MHz function generator for generating sine, square, and triangle waveforms.',
    location: 'Electronics Lab',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: false,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },
  {
    machineId: 'soldering-weller',
    name: 'Soldering Station (WE1010)',
    tier: 'bookable',
    confirmed: false,
    category: 'Electronics',
    manufacturer: 'Weller',
    modelNumber: 'WE1010',
    description: 'Digital soldering station with temperature control. 70W output. ESD-safe.',
    location: 'Electronics Lab',
    status: 'out_of_service',
    healthStatus: 'good',
    requiresTraining: false,
    imageUrls: [], manualUrls: [], safetyDocUrls: [],
  },

  // =========================================================
  // TIER 2 — CHECKOUT ITEMS (Borrow & Return log)
  // All confirmed=true — physically in the lab
  // =========================================================

  // ─── Power Tools ─────────────────────────────────────────
  { machineId: 'angle-grinder',   name: 'Angle Grinder',            tier: 'checkout', confirmed: true, category: 'Tabletop Power', description: 'Handheld grinder for cutting, grinding, and polishing. Use with correct disc for material.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: true, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'bench-grinder',   name: 'Bench Grinder',            tier: 'checkout', confirmed: true, category: 'Tabletop Power', description: 'Bench-mounted grinder for sharpening tools and shaping metal.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: true, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'jig-saw',         name: 'Jig Saw',                  tier: 'checkout', confirmed: true, category: 'Tabletop Power', description: 'Reciprocating saw for curved and irregular cuts in wood, metal, plastic.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'cordless-drill',  name: 'Cordless Drilling Machine', tier: 'checkout', confirmed: true, category: 'Tabletop Power', description: 'Battery-powered drill/driver. Ideal for drilling holes and driving screws.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'air-blower',      name: 'Air Blower',               tier: 'checkout', confirmed: true, category: 'Tabletop Power', description: 'Compressed air blower for cleaning dust from workpieces and equipment.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'heat-gun',        name: 'Heat Gun',                 tier: 'checkout', confirmed: true, category: 'Tabletop Power', description: 'Hot air gun for heat shrink, paint stripping, and bending plastic.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'orbit-sander',    name: 'Random Orbit Sander',      tier: 'checkout', confirmed: true, category: 'Tabletop Power', description: 'Random orbit sander for smooth finishing on wood surfaces.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'impact-drill',    name: 'Impact Drill',             tier: 'checkout', confirmed: true, category: 'Tabletop Power', description: 'Hammer drill for drilling into masonry, concrete, and brick.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: true, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'planner',         name: 'Planner',                  tier: 'checkout', confirmed: true, category: 'Tabletop Power', description: 'Electric hand planer for smoothing and reducing thickness of wood.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: true, imageUrls: [], manualUrls: [], safetyDocUrls: [] },

  // ─── Hand Tools ──────────────────────────────────────────
  { machineId: 'hacksaw',         name: 'Hacksaw',                  tier: 'checkout', confirmed: true, category: 'Other', description: 'Fine-toothed saw for cutting metal pipes, rods, and profiles.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'hammer',          name: 'Hammer',                   tier: 'checkout', confirmed: true, category: 'Other', description: 'Claw hammer for driving nails and general striking tasks.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'mallet',          name: 'Mallet',                   tier: 'checkout', confirmed: true, category: 'Other', description: 'Rubber or wooden mallet for assembly without damage to surfaces.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'spanner-set',     name: 'Spanner Set',              tier: 'checkout', confirmed: true, category: 'Other', description: 'Set of open-end and ring spanners for tightening/loosening nuts and bolts.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'pliers-set',      name: 'Pliers Set',               tier: 'checkout', confirmed: true, category: 'Other', description: 'Combination, needle-nose, and cutting pliers set.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'circlip-tools',   name: 'Circlip Tools',            tier: 'checkout', confirmed: true, category: 'Other', description: 'Internal and external circlip pliers set for retaining rings.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'cutters',         name: 'Cutters',                  tier: 'checkout', confirmed: true, category: 'Other', description: 'Side cutters and bolt cutters for cutting wire and fasteners.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'wrench-set',      name: 'Wrench Set',               tier: 'checkout', confirmed: true, category: 'Other', description: 'Adjustable and combination wrench set.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'clamps',          name: 'Clamps',                   tier: 'checkout', confirmed: true, category: 'Other', description: 'C-clamps and quick-grip clamps for holding workpieces during assembly or gluing.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'utility-knife',   name: 'Utility Knife',            tier: 'checkout', confirmed: true, category: 'Other', description: 'Box cutter / utility knife for scoring, trimming, and cutting sheet materials.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'screwdriver-set', name: 'Screwdriver Set',          tier: 'checkout', confirmed: true, category: 'Other', description: 'Phillips, flathead, Torx, and hex screwdriver set.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'snip-cutters',    name: 'Snip Cutters',             tier: 'checkout', confirmed: true, category: 'Other', description: 'Aviation tin snips for cutting sheet metal.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'pipe-cutters',    name: 'Pipe Cutters',             tier: 'checkout', confirmed: true, category: 'Other', description: 'Rotary pipe cutter for clean cuts on copper, PVC, and thin metal tubes.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'glue-guns',       name: 'Glue Guns',                tier: 'checkout', confirmed: true, category: 'Other', description: 'Hot glue guns (full and mini size) with glue sticks.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'file-set',        name: 'File Set',                 tier: 'checkout', confirmed: true, category: 'Other', description: 'Bastard, second-cut, and smooth metal files in various profiles.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'chisels',         name: 'Chisels',                  tier: 'checkout', confirmed: true, category: 'Other', description: 'Wood and cold chisels for chipping, carving, and mortising.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'punch-sets',      name: 'Punch Sets',               tier: 'checkout', confirmed: true, category: 'Other', description: 'Centre punch and letter/number stamp sets.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'drill-bit-set',   name: 'Drill Bit Sets',           tier: 'checkout', confirmed: true, category: 'Other', description: 'HSS and cobalt drill bit sets (1–13mm) for metal, wood, and plastic.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'stapler-gun',     name: 'Stapler Guns',             tier: 'checkout', confirmed: true, category: 'Other', description: 'Pneumatic stapler for upholstery, fabric, and thin wood joining.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },

  // ─── Measurement Tools ────────────────────────────────────
  { machineId: 'vernier-caliper', name: 'Digital Vernier Caliper',  tier: 'checkout', confirmed: true, category: 'Electronics', description: 'Digital vernier caliper (150mm, 0.01mm resolution) for precision measurement.', location: 'Measurement Area', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'micrometer',      name: 'Micrometer',               tier: 'checkout', confirmed: true, category: 'Electronics', description: 'Outside micrometer for precise measurement of small dimensions.', location: 'Measurement Area', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'steel-rules',     name: 'Steel Rules',              tier: 'checkout', confirmed: true, category: 'Electronics', description: '150mm and 300mm hardened steel rules.', location: 'Measurement Area', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'protractor',      name: 'Degree Protractor',        tier: 'checkout', confirmed: true, category: 'Electronics', description: 'Bevel protractor for measuring and marking angles.', location: 'Measurement Area', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'calipers-inside', name: 'Inside/Outside Calipers',  tier: 'checkout', confirmed: true, category: 'Electronics', description: 'Traditional spring calipers for inside and outside measurements.', location: 'Measurement Area', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'eng-square',      name: 'Engineering Square',       tier: 'checkout', confirmed: true, category: 'Electronics', description: 'Try square for checking and marking 90° angles.', location: 'Measurement Area', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'measuring-tape',  name: 'Measuring Tape',           tier: 'checkout', confirmed: true, category: 'Electronics', description: '5m and 8m retractable measuring tapes.', location: 'Measurement Area', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'spirit-level',    name: 'Spirit Level',             tier: 'checkout', confirmed: true, category: 'Electronics', description: '600mm aluminium spirit level for checking horizontal and vertical alignment.', location: 'Measurement Area', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'weighing-scale',  name: 'Weighing Scale',           tier: 'checkout', confirmed: true, category: 'Electronics', description: 'Digital precision scale (max 5kg, 0.1g resolution) for material weighing.', location: 'Measurement Area', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },

  // ─── Electronics Checkout ────────────────────────────────
  { machineId: 'power-supply',    name: 'Power Supply 60V 10A',     tier: 'checkout', confirmed: true, category: 'Electronics', description: 'Bench power supply (0–60V, 0–10A) for circuit testing and prototyping.', location: 'Electronics Lab', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'multimeter',      name: 'Digital Multimeter (Fluke 15B+)', tier: 'checkout', confirmed: true, category: 'Electronics', description: 'True RMS digital multimeter for measuring voltage, current, resistance, continuity.', location: 'Electronics Lab', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'vacuum-cleaner',  name: 'Vacuum Cleaner',           tier: 'checkout', confirmed: true, category: 'Other', description: 'Wet/dry vacuum cleaner for cleaning the workspace after use.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },

  // =========================================================
  // TIER 3 — FREELY AVAILABLE (no booking needed)
  // Inventory tracking only
  // =========================================================

  // ─── Safety Equipment ─────────────────────────────────────
  { machineId: 'safety-goggles',  name: 'Safety Goggles',           tier: 'freely_available', confirmed: true, category: 'Other', description: 'ANSI Z87.1 safety glasses and full-face goggles. Must be worn during all machining.', location: 'Safety Station', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'ear-protection',  name: 'Ear Protection',           tier: 'freely_available', confirmed: true, category: 'Other', description: 'Foam earplugs and ear muffs. Required when operating loud machinery.', location: 'Safety Station', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'gloves',          name: 'Gloves',                   tier: 'freely_available', confirmed: true, category: 'Other', description: 'Cut-resistant and heat-resistant gloves.', location: 'Safety Station', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'first-aid-kit',   name: 'First Aid Kit',            tier: 'freely_available', confirmed: true, category: 'Other', description: 'Standard first aid kit. Located near the entrance. Report if anything is used.', location: 'Entrance / Safety Station', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'aprons',          name: 'Aprons',                   tier: 'freely_available', confirmed: true, category: 'Other', description: 'Leather welding aprons and canvas shop aprons for PPE.', location: 'Safety Station', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'masks',           name: 'Masks',                    tier: 'freely_available', confirmed: true, category: 'Other', description: 'N95 dust masks and respirators for use during sanding, painting, or resin printing.', location: 'Safety Station', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },

  // ─── Infrastructure ───────────────────────────────────────
  { machineId: 'mech-workbench',  name: 'Mechanical Workbench',     tier: 'freely_available', confirmed: true, category: 'Other', description: 'Heavy-duty steel workbench with vice. Use for assembly, grinding, and metalwork.', location: 'Workshop Floor', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'storage',         name: 'Storage',                  tier: 'freely_available', confirmed: true, category: 'Other', description: 'Shelving units and project storage cubbies. Label your project storage.', location: 'Workshop Floor', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'component-org',   name: 'Component Organizer',      tier: 'freely_available', confirmed: true, category: 'Electronics', description: 'Parts bins and organizer drawers for electronic components and small hardware.', location: 'Electronics Lab', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'whiteboard',      name: 'Portable Whiteboard',      tier: 'freely_available', confirmed: true, category: 'Other', description: 'Rolling whiteboard for sketching, planning, and presentations.', location: 'Common Area', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'cutting-mat',     name: 'Cutting Mat',              tier: 'freely_available', confirmed: true, category: 'Other', description: 'Self-healing A2/A1 cutting mats for precise craft and design cutting work.', location: 'Digital Fabrication Zone', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
  { machineId: 'pegboard',        name: 'Pegboard',                 tier: 'freely_available', confirmed: true, category: 'Other', description: 'Wall-mounted pegboard for organizing frequently used hand tools.', location: 'Tool Storage', status: 'available', healthStatus: 'good', requiresTraining: false, imageUrls: [], manualUrls: [], safetyDocUrls: [] },
]
