import { describe, it, expect } from 'vitest'
import { validateSquadComposition, validateTokenBudget, validateTransfer, getTokenTotal } from '../lib/squad'
import type { Player } from '../lib/types'

const makePlayer = (overrides: Partial<Player>): Player => ({
  id: Math.random().toString(),
  name: 'Test Player',
  ipl_team: 'CSK',
  role: 'batsman',
  token_value: 9,
  ...overrides,
})

// Valid 11: 1 keeper, 5 batsmen, 3 bowlers, 2 allrounders = 11
const validSquad: Player[] = [
  makePlayer({ role: 'keeper', token_value: 9 }),
  makePlayer({ role: 'batsman', token_value: 9 }),
  makePlayer({ role: 'batsman', token_value: 9 }),
  makePlayer({ role: 'batsman', token_value: 9 }),
  makePlayer({ role: 'bowler', token_value: 9 }),
  makePlayer({ role: 'bowler', token_value: 9 }),
  makePlayer({ role: 'bowler', token_value: 9 }),
  makePlayer({ role: 'allrounder', token_value: 9 }),
  makePlayer({ role: 'batsman', token_value: 9 }),
  makePlayer({ role: 'batsman', token_value: 8 }),
  makePlayer({ role: 'batsman', token_value: 8 }),
]
// Total: 9*9 + 8*2 = 81 + 16 = 97 tokens

describe('validateSquadComposition', () => {
  it('passes a valid squad', () => {
    const result = validateSquadComposition(validSquad)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails with fewer than 11 players', () => {
    const result = validateSquadComposition(validSquad.slice(0, 10))
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Squad must have exactly 11 players')
  })

  it('fails with more than 11 players', () => {
    const result = validateSquadComposition([...validSquad, makePlayer({ role: 'batsman' })])
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Squad must have exactly 11 players')
  })

  it('fails with no keeper', () => {
    const noKeeper = validSquad.map((p, i) =>
      i === 0 ? { ...p, role: 'batsman' as const } : p
    )
    const result = validateSquadComposition(noKeeper)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Squad must have 1-2 wicket keepers')
  })

  it('fails with more than 2 keepers', () => {
    const tooManyKeepers = validSquad.map((p, i) =>
      i <= 2 ? { ...p, role: 'keeper' as const } : p
    )
    const result = validateSquadComposition(tooManyKeepers)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Squad must have 1-2 wicket keepers')
  })

  it('fails with fewer than 3 batsmen', () => {
    // Change indices 1,2,3 and 8 to bowlers — leaves only 2 batsmen (indices 9,10)
    const fewBatsmen = validSquad.map((p, i) =>
      (i >= 1 && i <= 3) || i === 8 ? { ...p, role: 'bowler' as const } : p
    )
    const result = validateSquadComposition(fewBatsmen)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Squad must have at least 3 batsmen')
  })

  it('fails with fewer than 3 bowlers', () => {
    const fewBowlers = validSquad.map((p, i) =>
      i >= 4 && i <= 6 ? { ...p, role: 'batsman' as const } : p
    )
    const result = validateSquadComposition(fewBowlers)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Squad must have at least 3 bowlers')
  })

  it('fails with no all-rounder', () => {
    const noAllRounder = validSquad.map((p, i) =>
      i === 7 ? { ...p, role: 'batsman' as const } : p
    )
    const result = validateSquadComposition(noAllRounder)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Squad must have at least 1 all-rounder')
  })
})

describe('validateTokenBudget', () => {
  it('passes when total is under 110', () => {
    expect(validateTokenBudget(validSquad)).toBe(true)
  })

  it('fails when total exceeds 110', () => {
    const expensive = validSquad.map(p => ({ ...p, token_value: 13 }))
    // 11 * 13 = 143 > 110
    expect(validateTokenBudget(expensive)).toBe(false)
  })

  it('passes when total equals exactly 110', () => {
    const squad110 = [
      makePlayer({ role: 'keeper', token_value: 13 }),
      makePlayer({ role: 'batsman', token_value: 12 }),
      makePlayer({ role: 'batsman', token_value: 11 }),
      makePlayer({ role: 'batsman', token_value: 10 }),
      makePlayer({ role: 'bowler', token_value: 10 }),
      makePlayer({ role: 'bowler', token_value: 10 }),
      makePlayer({ role: 'bowler', token_value: 10 }),
      makePlayer({ role: 'allrounder', token_value: 10 }),
      makePlayer({ role: 'batsman', token_value: 9 }),
      makePlayer({ role: 'batsman', token_value: 8 }),
      makePlayer({ role: 'batsman', token_value: 7 }),
    ]
    // 13+12+11+10+10+10+10+10+9+8+7 = 110
    expect(validateTokenBudget(squad110)).toBe(true)
  })
})

describe('getTokenTotal', () => {
  it('returns the sum of all player token values', () => {
    expect(getTokenTotal(validSquad)).toBe(97)
  })
})

describe('validateTransfer', () => {
  const playerOut = validSquad[1] // batsman, token 9
  const playerIn = makePlayer({ id: 'new', role: 'batsman', token_value: 9 })

  it('allows a valid same-token transfer', () => {
    const result = validateTransfer(validSquad, playerOut, playerIn)
    expect(result.valid).toBe(true)
  })

  it('rejects transfer that breaks budget', () => {
    // Squad at 97, -9 +13 = 101, still valid. Use near-limit squad instead.
    // 10 * 11 = 110, -10 +13 = 113 > 110
    const nearLimitSquad = validSquad.map(p => ({ ...p, token_value: 10 }))
    const expensiveIn = makePlayer({ id: 'new', role: 'batsman', token_value: 13 })
    const result = validateTransfer(nearLimitSquad, nearLimitSquad[1], expensiveIn)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Token budget exceeded')
  })

  it('rejects transfer of player not in squad', () => {
    const notInSquad = makePlayer({ id: 'ghost' })
    const result = validateTransfer(validSquad, notInSquad, playerIn)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Player not in squad')
  })

  it('returns the new token total on success', () => {
    const cheapIn = makePlayer({ id: 'new', role: 'batsman', token_value: 7 })
    const result = validateTransfer(validSquad, playerOut, cheapIn)
    expect(result.valid).toBe(true)
    // 97 - 9 + 7 = 95
    expect(result.newTokenTotal).toBe(95)
  })
})
