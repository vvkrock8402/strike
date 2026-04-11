import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')!
const RAPIDAPI_HOST = Deno.env.get('RAPIDAPI_HOST') ?? 'cricbuzz-cricket.p.rapidapi.com'

interface Batsman {
  id: number
  name: string
  runs: number
  fours: number
  sixes: number
}

interface Bowler {
  id: number
  name: string
  wickets: number
}

interface ScorecardResponse {
  ismatchcomplete: boolean
  status: string
  scorecard: Array<{
    batsman: Batsman[]
    bowler: Bowler[]
  }>
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
  return pts
}

async function fetchScorecard(rapidapiMatchId: string): Promise<ScorecardResponse | null> {
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
  const { data: allMatches } = await supabase
    .from('matches')
    .select('id, rapidapi_match_id, status, match_date')
    .in('status', ['upcoming', 'live'])
    .order('match_date', { ascending: true })
    .limit(10)

  const now = Date.now()
  const thirtyMin = 30 * 60 * 1000

  // Only poll: live matches (always) + upcoming matches starting within 30 minutes
  const matches = (allMatches ?? []).filter((m: { status: string; match_date: string }) => {
    if (m.status === 'live') return true
    const startsIn = new Date(m.match_date).getTime() - now
    return startsIn <= thirtyMin
  })

  if (matches.length === 0) {
    return new Response(JSON.stringify({ message: 'No matches to poll right now' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results: string[] = []

  for (const match of matches) {
    const scorecard = await fetchScorecard(match.rapidapi_match_id)
    if (!scorecard) continue

    const isComplete = scorecard.ismatchcomplete === true
    const statusText = (scorecard.status ?? '').toLowerCase()
    const isAbandoned = statusText.includes('abandon') ||
      statusText.includes('cancel') ||
      statusText.includes('no result') ||
      statusText.includes('called off')
    const hasStarted = (scorecard.scorecard ?? []).some(
      inn => (inn.batsman ?? []).length > 0
    )
    const isLive = !isComplete && !isAbandoned && hasStarted

    // If abandoned/cancelled, mark completed and stop polling
    if (isAbandoned && match.status !== 'completed') {
      await supabase
        .from('matches')
        .update({ status: 'completed', result: scorecard.status })
        .eq('id', match.id)
      results.push(`Match ${match.id}: abandoned/cancelled — marked completed`)
      continue
    }

    // Transition upcoming → live
    if (isLive && match.status === 'upcoming') {
      await supabase
        .from('matches')
        .update({ status: 'live' })
        .eq('id', match.id)

      // Snapshot squad_players into match_selections for all squads
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

    // Transition live → completed
    if (isComplete && match.status === 'live') {
      await supabase
        .from('matches')
        .update({ status: 'completed', result: scorecard.status })
        .eq('id', match.id)
      results.push(`Match ${match.id}: set to completed — ${scorecard.status}`)
    }

    // Parse batting stats (accumulate across both innings per player)
    const battingStats: Record<string, { runs: number; fours: number; sixes: number }> = {}
    for (const innings of scorecard.scorecard ?? []) {
      for (const batsman of innings.batsman ?? []) {
        const key = batsman.id.toString()
        if (!battingStats[key]) {
          battingStats[key] = { runs: 0, fours: 0, sixes: 0 }
        }
        battingStats[key].runs += batsman.runs ?? 0
        battingStats[key].fours += batsman.fours ?? 0
        battingStats[key].sixes += batsman.sixes ?? 0
      }
    }

    // Parse bowling stats
    const bowlingStats: Record<string, { wickets: number }> = {}
    for (const innings of scorecard.scorecard ?? []) {
      for (const bowler of innings.bowler ?? []) {
        const key = bowler.id.toString()
        if (!bowlingStats[key]) {
          bowlingStats[key] = { wickets: 0 }
        }
        bowlingStats[key].wickets += bowler.wickets ?? 0
      }
    }

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
        is_motm: false,
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
