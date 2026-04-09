import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')!
const RAPIDAPI_HOST = Deno.env.get('RAPIDAPI_HOST') ?? 'cricbuzz-cricket.p.rapidapi.com'

interface RapidAPIBatsman {
  batId: number
  batName: string
  runs: number
  fours: number
  sixes: number
}

interface RapidAPIBowler {
  bowlId: number
  bowlName: string
  wickets: number
}

interface RapidAPIScorecard {
  scorecard: Array<{
    batTeamDetails: {
      batsmenData: Record<string, RapidAPIBatsman>
    }
    bowlTeamDetails: {
      bowlersData: Record<string, RapidAPIBowler>
    }
  }>
  matchHeader: {
    state: string // 'Inprogress' | 'Complete'
    momId?: number
    momName?: string
  }
}

function computePoints(stats: {
  runs: number
  fours: number
  sixes: number
  wickets: number
  catches: number
  stumpings: number
  run_outs_direct: number
  run_outs_indirect: number
  is_motm: boolean
}): number {
  let pts = 0
  pts += stats.runs * 1
  pts += stats.fours * 6
  pts += stats.sixes * 8
  if (stats.runs >= 100) pts += 40
  else if (stats.runs >= 50) pts += 20
  pts += stats.wickets * 25
  pts += stats.catches * 15
  pts += stats.stumpings * 15
  pts += stats.run_outs_direct * 20
  pts += stats.run_outs_indirect * 10
  if (stats.is_motm) pts += 75
  return pts
}

async function fetchScorecard(rapidapiMatchId: string): Promise<RapidAPIScorecard | null> {
  const url = `https://${RAPIDAPI_HOST}/mcenter/v1/${rapidapiMatchId}/scard`
  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  })
  if (!res.ok) {
    console.error(`RapidAPI error: ${res.status} for match ${rapidapiMatchId}`)
    return null
  }
  return res.json()
}

Deno.serve(async (_req) => {
  const { data: matches } = await supabase
    .from('matches')
    .select('id, rapidapi_match_id, status, match_date')
    .in('status', ['upcoming', 'live'])
    .order('match_date', { ascending: true })
    .limit(5)

  if (!matches || matches.length === 0) {
    return new Response(JSON.stringify({ message: 'No active matches' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results: string[] = []

  for (const match of matches) {
    const scorecard = await fetchScorecard(match.rapidapi_match_id)
    if (!scorecard) continue

    const state = scorecard.matchHeader.state
    const isLive = state === 'Inprogress'
    const isComplete = state === 'Complete'

    if (isLive && match.status === 'upcoming') {
      await supabase
        .from('matches')
        .update({ status: 'live' })
        .eq('id', match.id)

      // Snapshot match_selections from squad_players for all users
      const { data: squads } = await supabase
        .from('squads')
        .select('id')
        .eq('season', 2026)

      for (const squad of squads ?? []) {
        const { data: squadPlayers } = await supabase
          .from('squad_players')
          .select('player_id')
          .eq('squad_id', squad.id)

        const { data: existing } = await supabase
          .from('match_selections')
          .select('player_id')
          .eq('squad_id', squad.id)
          .eq('match_id', match.id)
          .limit(1)

        if (!existing || existing.length === 0) {
          const rows = (squadPlayers ?? []).map((sp: { player_id: string }) => ({
            squad_id: squad.id,
            match_id: match.id,
            player_id: sp.player_id,
            is_captain: false,
            is_vice_captain: false,
          }))
          if (rows.length > 0) {
            await supabase.from('match_selections').insert(rows)
          }
        }
      }

      results.push(`Match ${match.id}: set to live, snapshots created`)
    }

    if (isComplete && match.status === 'live') {
      await supabase
        .from('matches')
        .update({ status: 'completed' })
        .eq('id', match.id)
      results.push(`Match ${match.id}: set to completed`)
    }

    // Parse batting stats
    const battingStats: Record<string, { runs: number; fours: number; sixes: number }> = {}
    for (const innings of scorecard.scorecard ?? []) {
      for (const batsman of Object.values(innings.batTeamDetails.batsmenData)) {
        battingStats[batsman.batId] = {
          runs: batsman.runs ?? 0,
          fours: batsman.fours ?? 0,
          sixes: batsman.sixes ?? 0,
        }
      }
    }

    // Parse bowling stats
    const bowlingStats: Record<string, { wickets: number }> = {}
    for (const innings of scorecard.scorecard ?? []) {
      for (const bowler of Object.values(innings.bowlTeamDetails.bowlersData)) {
        bowlingStats[bowler.bowlId] = { wickets: bowler.wickets ?? 0 }
      }
    }

    const momId = scorecard.matchHeader.momId

    const { data: players } = await supabase
      .from('players')
      .select('id, rapidapi_player_id')

    const playerMap = new Map(
      (players ?? [])
        .filter((p: { rapidapi_player_id: number | null }) => p.rapidapi_player_id)
        .map((p: { id: string; rapidapi_player_id: number }) => [p.rapidapi_player_id.toString(), p.id])
    )

    for (const [rapidId, internalId] of playerMap) {
      const batting = battingStats[rapidId] ?? { runs: 0, fours: 0, sixes: 0 }
      const bowling = bowlingStats[rapidId] ?? { wickets: 0 }
      const is_motm = momId?.toString() === rapidId

      const stats = {
        match_id: match.id,
        player_id: internalId,
        runs: batting.runs,
        fours: batting.fours,
        sixes: batting.sixes,
        wickets: bowling.wickets,
        catches: 0,
        stumpings: 0,
        run_outs_direct: 0,
        run_outs_indirect: 0,
        is_motm,
        total_points: 0,
      }

      stats.total_points = computePoints(stats)

      await supabase
        .from('player_match_points')
        .upsert(stats, { onConflict: 'match_id,player_id' })
    }

    results.push(`Match ${match.id}: points updated for ${playerMap.size} players`)
  }

  return new Response(JSON.stringify({ updated: results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
