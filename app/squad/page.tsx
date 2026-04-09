import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SquadGrid from '@/components/SquadGrid'
import Link from 'next/link'
import { getTokenTotal } from '@/lib/squad'
import type { Player } from '@/lib/types'

export default async function SquadPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: squad } = await supabase
    .from('squads')
    .select('id, transfers_used')
    .eq('user_id', user.id)
    .eq('season', 2026)
    .maybeSingle()

  if (!squad) redirect('/transfers')

  const { data: nextMatch } = await supabase
    .from('matches')
    .select('id, team_a, team_b, match_date, status')
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

  const { data: selections } = nextMatch
    ? await supabase
        .from('match_selections')
        .select('player_id, is_captain, is_vice_captain')
        .eq('squad_id', squad.id)
        .eq('match_id', nextMatch.id)
    : { data: [] }

  const selectionMap = new Map(
    (selections ?? []).map((s: { player_id: string; is_captain: boolean; is_vice_captain: boolean }) => [s.player_id, s])
  )

  const playersWithCaptain = players.map(p => ({
    ...p,
    is_captain: selectionMap.get(p.id)?.is_captain ?? false,
    is_vice_captain: selectionMap.get(p.id)?.is_vice_captain ?? false,
  }))

  const tokenTotal = getTokenTotal(players)
  const transfersRemaining = 220 - squad.transfers_used

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">My Squad</h1>
        <Link
          href="/transfers"
          className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Make Transfers
        </Link>
      </div>

      {nextMatch && (
        <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-gray-400 text-xs mb-1">Next Match</p>
          <p className="text-white font-semibold">
            {nextMatch.team_a} vs {nextMatch.team_b}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {new Date(nextMatch.match_date).toLocaleString()}
            {nextMatch.status === 'live' && (
              <span className="ml-2 text-red-400 font-medium">● LIVE</span>
            )}
          </p>
        </div>
      )}

      <SquadGrid
        players={playersWithCaptain}
        matchId={nextMatch?.id ?? null}
        matchLocked={nextMatch?.status === 'live' || nextMatch?.status === 'completed'}
        tokenTotal={tokenTotal}
        transfersRemaining={transfersRemaining}
      />
    </div>
  )
}
