import type { PlayerMatchPoints } from './types'

export function calculatePlayerPoints(stats: PlayerMatchPoints): number {
  let points = 0

  // Batting
  points += stats.runs * 1
  points += stats.fours * 6
  points += stats.sixes * 8

  // Run milestones (100 supersedes 50)
  if (stats.runs >= 100) {
    points += 40
  } else if (stats.runs >= 50) {
    points += 20
  }

  // Bowling
  points += stats.wickets * 25

  // Fielding
  points += stats.catches * 15
  points += stats.stumpings * 15
  points += stats.run_outs_direct * 20
  points += stats.run_outs_indirect * 10

  // Award
  if (stats.is_motm) {
    points += 75
  }

  return points
}

export function applyMultiplier(
  points: number,
  role: 'captain' | 'vice_captain' | 'normal'
): number {
  if (role === 'captain') return points * 3
  if (role === 'vice_captain') return points * 2
  return points
}
