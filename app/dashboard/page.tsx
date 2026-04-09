import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MatchStatus from '@/components/MatchStatus'
import LivePoints from '@/components/LivePoints'
import Link from 'next/link'
import type { Player, PlayerMatchPoints } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: squad } = await supabase
    .from('squads')
    .select('id')
    .eq('user_id', user.id)
    .eq('season', 2026)
    .maybeSingle()

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

  const { data: nextMatch } = await supabase
    .from('matches')
    .select('*')
    .in('status', ['upcoming', 'live'])
    .order('match_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: squadPlayers } = await supabase
    .from('squad_players')
    .select('player_id, players(*)')
    .eq('squad_id', squad.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const players = (squadPlayers ?? []).map((sp: any) => sp.players as Player)

  type PlayerWithData = Player & { is_captain: boolean; is_vice_captain: boolean; points?: PlayerMatchPoints }
  let playersWithData: PlayerWithData[] = players.map(p => ({ ...p, is_captain: false, is_vice_captain: false }))

  if (nextMatch) {
    const [{ data: selections }, { data: points }] = await Promise.all([
      supabase
        .from('match_selections')
        .select('player_id, is_captain, is_vice_captain')
        .eq('squad_id', squad.id)
        .eq('match_id', nextMatch.id),
      supabase
        .from('player_match_points')
        .select('*')
        .eq('match_id', nextMatch.id)
        .in('player_id', players.map(p => p.id)),
    ])

    const selMap = new Map((selections ?? []).map((s: { player_id: string; is_captain: boolean; is_vice_captain: boolean }) => [s.player_id, s]))
    const ptMap = new Map((points ?? []).map((pt: PlayerMatchPoints) => [pt.player_id, pt]))

    playersWithData = players.map(p => ({
      ...p,
      is_captain: selMap.get(p.id)?.is_captain ?? false,
      is_vice_captain: selMap.get(p.id)?.is_vice_captain ?? false,
      points: ptMap.get(p.id),
    }))
  }

  const { data: leaderboard } = await supabase.rpc('get_season_leaderboard')

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <MatchStatus initialMatch={nextMatch ?? null} />
      <LivePoints initialPlayers={playersWithData} matchId={nextMatch?.id ?? null} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Top 5 — Global</h2>
          <Link href="/leaderboard" className="text-blue-400 text-sm hover:text-blue-300">See all →</Link>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {(leaderboard ?? []).slice(0, 5).map((row: { user_id: string; email: string; total_points: number }, i: number) => (
            <div key={row.user_id} className={`flex items-center px-4 py-3 ${i < 4 ? 'border-b border-gray-800' : ''}`}>
              <span className="text-gray-500 text-sm w-6">{i + 1}</span>
              <span className="text-white text-sm flex-1 ml-3">{row.email}</span>
              <span className="text-white font-bold text-sm">{row.total_points}</span>
            </div>
          ))}
          {(!leaderboard || leaderboard.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-6">No scores yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
