import { describe, it, expect } from 'vitest'
import { buildConsumablesPayload } from '@/lib/consumables'

describe('buildConsumablesPayload', () => {
  it('drops undefined, null and empty-string members', () => {
    expect(buildConsumablesPayload({
      filamentType: 'PLA',
      filamentColor: undefined,
      filamentQuantityGrams: undefined,
      materialType: '',
      materialSize: null as unknown as string | undefined,
    })).toEqual({ filamentType: 'PLA' })
  })

  it('keeps numeric and string values', () => {
    expect(buildConsumablesPayload({
      filamentType: 'PETG',
      filamentColor: 'Black',
      filamentQuantityGrams: 250,
    })).toEqual({ filamentType: 'PETG', filamentColor: 'Black', filamentQuantityGrams: 250 })
  })

  it('returns an empty object when nothing is filled', () => {
    expect(buildConsumablesPayload({
      filamentType: '', filamentColor: undefined, materialSize: '',
    })).toEqual({})
  })

  it('never emits null or undefined — the server rejects both', () => {
    const out = buildConsumablesPayload({ filamentType: 'ABS', filamentQuantityGrams: undefined })
    for (const v of Object.values(out)) {
      expect(v).not.toBeNull()
      expect(v).not.toBeUndefined()
    }
  })
})