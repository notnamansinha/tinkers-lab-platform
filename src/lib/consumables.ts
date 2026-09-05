// ============================================================
// Booking consumables payload builder
// The createBooking Cloud Function validates consumables as a flat map of
// STRING/NUMBER values and rejects null. The callable serializer encodes
// undefined object members as null, so a form block with unfilled optional
// fields must be pruned before it leaves the client (Form 2A — 3D printer /
// laser cutter consumables).
// ============================================================

/** Fields a user can log against a booking (Spec 2: filament/material usage). */
export interface BookingConsumableFields {
  filamentType?: string
  filamentColor?: string
  filamentQuantityGrams?: number
  materialType?: string
  materialSize?: string
}

/**
 * Strip empty/unset fields so the server validator accepts the block.
 * Empty strings are omitted too (an untouched input registers as '').
 */
export function buildConsumablesPayload(fields: BookingConsumableFields): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  ) as Record<string, string | number>
}