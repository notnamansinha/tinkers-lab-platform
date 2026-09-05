import { describe, it, expect } from 'vitest'
import { parseTeamRoster } from '@/lib/teamMembers'

describe('parseTeamRoster', () => {
  it('parses comma-separated "Name (ID)" entries', () => {
    expect(parseTeamRoster('Alice (AU2023001), Bob (AU2023002)')).toEqual([
      { name: 'Alice', universityId: 'AU2023001' },
      { name: 'Bob', universityId: 'AU2023002' },
    ])
  })

  it('parses "Name, ID" format', () => {
    expect(parseTeamRoster('Alice, AU2023001')).toEqual([
      { name: 'Alice', universityId: 'AU2023001' },
    ])
  })

  it('parses newline-separated names without IDs', () => {
    expect(parseTeamRoster('Alice\nBob')).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
  })

  it('parses semicolon-separated entries', () => {
    expect(parseTeamRoster('Alice (AU1); Bob')).toEqual([
      { name: 'Alice', universityId: 'AU1' },
      { name: 'Bob' },
    ])
  })

  it('returns an empty array for empty/blank input', () => {
    expect(parseTeamRoster('')).toEqual([])
    expect(parseTeamRoster('   ')).toEqual([])
    expect(parseTeamRoster('\n\n')).toEqual([])
  })

  it('trims whitespace around names', () => {
    expect(parseTeamRoster('  Alice (AU1)  ,  Bob  ')).toEqual([
      { name: 'Alice', universityId: 'AU1' },
      { name: 'Bob' },
    ])
  })

  it('drops empty entries between separators', () => {
    expect(parseTeamRoster('Alice,,Bob')).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
  })
})

describe('parseTeamRoster — additional formats', () => {
  it('parses a single plain name', () => {
    expect(parseTeamRoster('Alice')).toEqual([{ name: 'Alice' }])
  })

  it('parses a single "Name (ID)" entry', () => {
    expect(parseTeamRoster('Alice (A001)')).toEqual([{ name: 'Alice', universityId: 'A001' }])
  })

  it('parses "Eve, F001" as name + id pair', () => {
    expect(parseTeamRoster('Eve, F001')).toEqual([{ name: 'Eve', universityId: 'F001' }])
  })

  it('parses a mixed multi-line roster', () => {
    expect(parseTeamRoster('Alice (A001), Bob (B002)\nCarol\nDave')).toEqual([
      { name: 'Alice', universityId: 'A001' },
      { name: 'Bob', universityId: 'B002' },
      { name: 'Carol' },
      { name: 'Dave' },
    ])
  })

  it('parses IDs attached after names mixed with parens', () => {
    expect(parseTeamRoster('Alice (A001), Bob\nCarol, C003')).toEqual([
      { name: 'Alice', universityId: 'A001' },
      { name: 'Bob' },
      { name: 'Carol', universityId: 'C003' },
    ])
  })

  it('handles heavy whitespace and stray separators', () => {
    expect(parseTeamRoster('  Alice (A001) ;  Bob  , \n  Carol  ')).toEqual([
      { name: 'Alice', universityId: 'A001' },
      { name: 'Bob' },
      { name: 'Carol' },
    ])
  })

  it('an id-like token without a preceding member is treated as a name', () => {
    expect(parseTeamRoster('F001')).toEqual([{ name: 'F001' }])
  })

  it('an extra id-like token after an id-attached member becomes its own member', () => {
    expect(parseTeamRoster('Alice (A001), 12345')).toEqual([
      { name: 'Alice', universityId: 'A001' },
      { name: '12345' },
    ])
  })
})
