// ============================================================
// TEAM ROSTER PARSING
// Converts free-text team member input ("Names and IDs" from
// Form 1) into a structured, relational roster stored under
// projects/{projectId}/projectMembers/{memberId}.
// Accepts "Name (ID)", "Name, ID", newline/semicolon/comma
// separated lists, and plain names.
// ============================================================

export interface TeamMember {
  name: string
  universityId?: string
}

/** "Name (ID)" → name + id */
const PAREN_PATTERN = /^(.+?)\s*\(([^)]+)\)$/
/** Rough ID heuristic — tokens containing digits are treated as an ID */
const ID_LIKE_PATTERN = /\d/

export function parseTeamRoster(input: string): TeamMember[] {
  if (!input || !input.trim()) return []

  const members: TeamMember[] = []

  // Newlines and semicolons separate members; commas either separate
  // members or pair a name with an ID — handled per-token below.
  for (const chunk of input.split(/[\n;]+/)) {
    for (const rawToken of chunk.split(',')) {
      const token = rawToken.trim()
      if (!token) continue

      const paren = token.match(PAREN_PATTERN)
      if (paren) {
        members.push({ name: paren[1].trim(), universityId: paren[2].trim() })
        continue
      }

      // "Name, ID" — an ID-looking token attaches to the previous member.
      const last = members[members.length - 1]
      if (ID_LIKE_PATTERN.test(token) && last && !last.universityId) {
        last.universityId = token
        continue
      }

      members.push({ name: token })
    }
  }

  return members
}
