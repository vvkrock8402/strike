import { describe, it, expect } from 'vitest'
import { calculatePlayerPoints, applyMultiplier } from '../lib/scoring'
import type { PlayerMatchPoints } from '../lib/types'

const emptyStats: PlayerMatchPoints = {
  id: '1',
  match_id: 'm1',
  player_id: 'p1',
  runs: 0,
  fours: 0,
  sixes: 0,
  wickets: 0,
  catches: 0,
  stumpings: 0,
  run_outs_direct: 0,
  run_outs_indirect: 0,
  is_motm: false,
  total_points: 0,
}

describe('calculatePlayerPoints', () => {
  it('returns 0 for empty stats', () => {
    expect(calculatePlayerPoints(emptyStats)).toBe(0)
  })

  it('scores 1pt per run', () => {
    expect(calculatePlayerPoints({ ...emptyStats, runs: 30 })).toBe(30)
  })

  it('scores 6pts per four (on top of 1pt run)', () => {
    // 1 four = 1 run + 6 bonus = 7
    expect(calculatePlayerPoints({ ...emptyStats, runs: 1, fours: 1 })).toBe(7)
  })

  it('scores 8pts per six (on top of 1pt run)', () => {
    // 1 six = 1 run + 8 bonus = 9
    expect(calculatePlayerPoints({ ...emptyStats, runs: 1, sixes: 1 })).toBe(9)
  })

  it('scores 25pts per wicket', () => {
    expect(calculatePlayerPoints({ ...emptyStats, wickets: 3 })).toBe(75)
  })

  it('scores 15pts per catch', () => {
    expect(calculatePlayerPoints({ ...emptyStats, catches: 2 })).toBe(30)
  })

  it('scores 15pts per stumping', () => {
    expect(calculatePlayerPoints({ ...emptyStats, stumpings: 1 })).toBe(15)
  })

  it('scores 20pts for direct run out', () => {
    expect(calculatePlayerPoints({ ...emptyStats, run_outs_direct: 1 })).toBe(20)
  })

  it('scores 10pts for indirect run out', () => {
    expect(calculatePlayerPoints({ ...emptyStats, run_outs_indirect: 1 })).toBe(10)
  })

  it('awards 20pt bonus for 50 runs (once)', () => {
    // 50 runs + 20 bonus = 70
    expect(calculatePlayerPoints({ ...emptyStats, runs: 50 })).toBe(70)
  })

  it('awards 40pt bonus for 100 runs (not 50 bonus too)', () => {
    // 100 runs + 40 bonus (100 supersedes 50) = 140
    expect(calculatePlayerPoints({ ...emptyStats, runs: 100 })).toBe(140)
  })

  it('awards 75pts for Man of the Match', () => {
    expect(calculatePlayerPoints({ ...emptyStats, is_motm: true })).toBe(75)
  })

  it('calculates combined stats correctly', () => {
    // 45 runs + 2 fours (12) + 1 six (8) + 2 wickets (50) + 1 catch (15) = 130
    expect(calculatePlayerPoints({
      ...emptyStats,
      runs: 45,
      fours: 2,
      sixes: 1,
      wickets: 2,
      catches: 1,
    })).toBe(130)
  })
})

describe('applyMultiplier', () => {
  it('triples points for captain', () => {
    expect(applyMultiplier(100, 'captain')).toBe(300)
  })

  it('doubles points for vice_captain', () => {
    expect(applyMultiplier(100, 'vice_captain')).toBe(200)
  })

  it('leaves points unchanged for normal', () => {
    expect(applyMultiplier(100, 'normal')).toBe(100)
  })
})
