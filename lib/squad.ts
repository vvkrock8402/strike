import type { Player, ValidationResult, TransferResult } from './types'

export function validateSquadComposition(players: Player[]): ValidationResult {
  const errors: string[] = []

  if (players.length !== 11) {
    errors.push('Squad must have exactly 11 players')
  }

  const keepers = players.filter(p => p.role === 'keeper').length
  if (keepers < 1 || keepers > 2) {
    errors.push('Squad must have 1-2 wicket keepers')
  }

  const batsmen = players.filter(p => p.role === 'batsman').length
  if (batsmen < 3) {
    errors.push('Squad must have at least 3 batsmen')
  }

  const bowlers = players.filter(p => p.role === 'bowler').length
  if (bowlers < 3) {
    errors.push('Squad must have at least 3 bowlers')
  }

  const allRounders = players.filter(p => p.role === 'allrounder').length
  if (allRounders < 1) {
    errors.push('Squad must have at least 1 all-rounder')
  }

  return { valid: errors.length === 0, errors }
}

export function validateTokenBudget(players: Player[]): boolean {
  return getTokenTotal(players) <= 110
}

export function getTokenTotal(players: Player[]): number {
  return players.reduce((sum, p) => sum + p.token_value, 0)
}

export function validateTransfer(
  currentSquad: Player[],
  playerOut: Player,
  playerIn: Player
): TransferResult {
  const inSquad = currentSquad.some(p => p.id === playerOut.id)
  if (!inSquad) {
    return { valid: false, error: 'Player not in squad', newTokenTotal: 0 }
  }

  const newSquad = currentSquad.map(p => (p.id === playerOut.id ? playerIn : p))
  const newTotal = getTokenTotal(newSquad)

  if (newTotal > 110) {
    return {
      valid: false,
      error: `Token budget exceeded: ${newTotal}/110`,
      newTokenTotal: newTotal,
    }
  }

  return { valid: true, newTokenTotal: newTotal }
}
