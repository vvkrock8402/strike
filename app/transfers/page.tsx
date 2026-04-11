import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TransferPanel from '@/components/TransferPanel'
import MatchCountdown from '@/components/MatchCountdown'
import type { Player } from '@/lib/types'

export default async function TransfersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: liveMatch } = await supabase
    .from('matches')
    .select('id, team_a, team_b')
    .eq('status', 'live')
    .maybeSingle()

  const { data: nextMatch } = await supabase
    .from('matches')
    .select('id, team_a, team_b, match_date')
    .eq('status', 'upcoming')
    .order('match_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: squad } = await supabase
    .from('squads')
    .select('id, transfers_used')
    .eq('user_id', user.id)
    .eq('season', 2026)
    .maybeSingle()

  const currentSquad: Player[] = []
  let captainId: string | undefined
  let viceCaptainId: string | undefined

  if (squad) {
    const { data: squadPlayers } = await supabase
      .from('squad_players')
      .select('player_id, players(*)')
      .eq('squad_id', squad.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentSquad.push(...(squadPlayers ?? []).map((sp: any) => sp.players as Player))

    // Fetch captain/VC for the next upcoming match
    if (nextMatch) {
      const { data: selections } = await supabase
        .from('match_selections')
        .select('player_id, is_captain, is_vice_captain')
        .eq('squad_id', squad.id)
        .eq('match_id', nextMatch.id)

      captainId = selections?.find((s: { is_captain: boolean }) => s.is_captain)?.player_id
      viceCaptainId = selections?.find((s: { is_vice_captain: boolean }) => s.is_vice_captain)?.player_id
    }
  }

  const { data: allPlayers } = await supabase
    .from('players')
    .select('*')
    .order('token_value', { ascending: false })

  const transfersRemaining = squad ? 220 - squad.transfers_used : 220
  const isFirstMatch = currentSquad.length < 11

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transfers</h1>
          {isFirstMatch && (
            <p className="text-green-400 text-sm mt-1">
              First match — transfers are free! Pick your initial 11.
            </p>
          )}
          {liveMatch && !isFirstMatch && (
            <p className="text-blue-400 text-sm mt-1">
              {liveMatch.team_a} vs {liveMatch.team_b} is live — changes apply to your next match.
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">Transfers remaining</p>
          <p className="text-white font-bold text-xl">{transfersRemaining} / 220</p>
        </div>
      </div>

      {nextMatch && (
        <MatchCountdown
          matchDate={nextMatch.match_date}
          teamA={nextMatch.team_a}
          teamB={nextMatch.team_b}
        />
      )}

      <TransferPanel
        allPlayers={allPlayers ?? []}
        currentSquad={currentSquad}
        transfersRemaining={transfersRemaining}
        isFirstMatch={isFirstMatch}
        captainId={captainId}
        viceCaptainId={viceCaptainId}
      />
    </div>
  )
}
