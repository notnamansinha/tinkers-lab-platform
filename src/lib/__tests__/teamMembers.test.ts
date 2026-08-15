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
