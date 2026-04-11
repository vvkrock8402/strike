import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MatchStatus from '@/components/MatchStatus'
import MatchCountdown from '@/components/MatchCountdown'
import LivePoints from '@/components/LivePoints'
import Link from 'next/link'
import type { Player, PlayerMatchPoints } from '@/lib/types'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Run all independent queries in parallel
  const [
    { data: squad },
    { data: nextMatch },
    { data: nextUpcomingMatch },
    { data: lastMatch },
    { data: leaderboard },
    { data: profile },
  ] = await Promise.all([
    supabase.from('squads').select('id').eq('user_id', user.id).eq('season', 2026).maybeSingle(),
    supabase.from('matches').select('*').in('status', ['upcoming', 'live']).order('match_date', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('matches').select('id, team_a, team_b, match_date').eq('status', 'upcoming').order('match_date', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('matches').select('id, team_a, team_b, result').eq('status', 'completed').not('result', 'is', null).order('match_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc('get_season_leaderboard'),
    supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
  ])

  if (!squad) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Welcome to Strike</h1>
        <p className="text-gray-400 mb-8">You haven&apos;t picked your squad yet. Start by choosing your 11 players.</p>
        <Link href="/transfers" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
          Pick Your Squad
        </Link>
      </div>
    )
  }

  type PlayerWithData = Player & { is_captain: boolean; is_vice_captain: boolean; points?: PlayerMatchPoints }
  let playersWithData: PlayerWithData[] = []

  if (nextMatch?.status === 'live') {
    // Live match: read the snapshotted match_selections (not squad_players)
    const { data: liveSelections } = await supabase
      .from('match_selections')
      .select('player_id, is_captain, is_vice_captain, players(*)')
      .eq('squad_id', squad.id)
      .eq('match_id', nextMatch.id)

    const playerIds = (liveSelections ?? []).map((s: { player_id: string }) => s.player_id)
    const { data: points } = playerIds.length > 0
      ? await supabase.from('player_match_points').select('*').eq('match_id', nextMatch.id).in('player_id', playerIds)
      : { data: [] }

    const ptMap = new Map((points ?? []).map((pt: PlayerMatchPoints) => [pt.player_id, pt]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    playersWithData = (liveSelections ?? []).map((s: any) => ({
      ...(s.players as Player),
      is_captain: s.is_captain,
      is_vice_captain: s.is_vice_captain,
      points: ptMap.get(s.player_id),
    }))
  } else {
    // Upcoming or no match: fetch squad players + selections + points in parallel
    const [{ data: squadPlayers }, selectionsResult] = await Promise.all([
      supabase.from('squad_players').select('player_id, players(*)').eq('squad_id', squad.id),
      nextMatch
        ? supabase.from('match_selections').select('player_id, is_captain, is_vice_captain').eq('squad_id', squad.id).eq('match_id', nextMatch.id)
        : Promise.resolve({ data: [] }),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players = (squadPlayers ?? []).map((sp: any) => sp.players as Player)
    const selMap = new Map(((selectionsResult.data ?? []) as { player_id: string; is_captain: boolean; is_vice_captain: boolean }[]).map(s => [s.player_id, s]))

    if (nextMatch && players.length > 0) {
      const { data: points } = await supabase
        .from('player_match_points')
        .select('*')
        .eq('match_id', nextMatch.id)
        .in('player_id', players.map(p => p.id))

      const ptMap = new Map((points ?? []).map((pt: PlayerMatchPoints) => [pt.player_id, pt]))
      playersWithData = players.map(p => ({
        ...p,
        is_captain: selMap.get(p.id)?.is_captain ?? false,
        is_vice_captain: selMap.get(p.id)?.is_vice_captain ?? false,
        points: ptMap.get(p.id),
      }))
    } else {
      playersWithData = players.map(p => ({ ...p, is_captain: false, is_vice_captain: false }))
    }
  }

  return (
    <DashboardClient hasDisplayName={!!profile?.display_name}>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {lastMatch?.result && (
        <div className="bg-green-950 border border-green-800 rounded-xl px-5 py-4">
          <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-1">
            Match Result — {lastMatch.team_a} vs {lastMatch.team_b}
          </p>
          <p className="text-white font-bold text-lg">{lastMatch.result}</p>
        </div>
      )}
      <MatchStatus initialMatch={nextMatch ?? null} />
      {nextUpcomingMatch && (
        <MatchCountdown
          matchDate={nextUpcomingMatch.match_date}
          teamA={nextUpcomingMatch.team_a}
          teamB={nextUpcomingMatch.team_b}
        />
      )}
      <LivePoints initialPlayers={playersWithData} matchId={nextMatch?.id ?? null} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Top 5 — Global</h2>
          <Link href="/leaderboard" className="text-blue-400 text-sm hover:text-blue-300">See all →</Link>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {(leaderboard ?? []).slice(0, 5).map((row: { user_id: string; email: string; display_name?: string | null; total_points: number }, i: number) => (
            <div key={row.user_id} className={`flex items-center px-4 py-3 ${i < 4 ? 'border-b border-gray-800' : ''}`}>
              <span className="text-gray-500 text-sm w-6">{i + 1}</span>
              <span className="text-white text-sm flex-1 ml-3">{row.display_name ?? row.email.split('@')[0]}</span>
              <span className="text-white font-bold text-sm">{row.total_points}</span>
            </div>
          ))}
          {(!leaderboard || leaderboard.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-6">No scores yet</p>
          )}
        </div>
      </div>
    </div>
    </DashboardClient>
  )
}
