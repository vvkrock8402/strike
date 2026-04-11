export type PlayerRole = 'batsman' | 'bowler' | 'keeper' | 'allrounder'
export type MatchStatus = 'upcoming' | 'live' | 'completed'

export interface Player {
  id: string
  name: string
  ipl_team: string
  role: PlayerRole
  token_value: number
  image_url?: string
}

export interface Squad {
  id: string
  user_id: string
  season: number
  transfers_used: number
}

export interface SquadPlayer {
  squad_id: string
  player_id: string
}

export interface MatchSelection {
  id: string
  squad_id: string
  match_id: string
  player_id: string
  is_captain: boolean
  is_vice_captain: boolean
}

export interface Match {
  id: string
  team_a: string
  team_b: string
  match_date: string
  status: MatchStatus
  rapidapi_match_id: string
}

export interface PlayerMatchPoints {
  id: string
  match_id: string
  player_id: string
  runs: number
  fours: number
  sixes: number
  wickets: number
  catches: number
  stumpings: number
  run_outs_direct: number
  run_outs_indirect: number
  is_motm: boolean
  total_points: number
}

export interface League {
  id: string
  name: string
  invite_code: string
  created_by: string
}

export interface LeagueMember {
  league_id: string
  user_id: string
  joined_at: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface TransferResult {
  valid: boolean
  error?: string
  newTokenTotal: number
}
