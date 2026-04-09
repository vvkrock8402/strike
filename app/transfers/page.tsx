import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TransferPanel from '@/components/TransferPanel'
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

  const { data: squad } = await supabase
    .from('squads')
    .select('id, transfers_used')
    .eq('user_id', user.id)
    .eq('season', 2026)
    .maybeSingle()

  const currentSquad: Player[] = []
  if (squad) {
    const { data: squadPlayers } = await supabase
      .from('squad_players')
      .select('player_id, players(*)')
      .eq('squad_id', squad.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentSquad.push(...(squadPlayers ?? []).map((sp: any) => sp.players as Player))
  }

  const { data: allPlayers } = await supabase
    .from('players')
    .select('*')
    .order('token_value', { ascending: false })

  const transfersRemaining = squad ? 220 - squad.transfers_used : 220
  const isFirstMatch = !squad || squad.transfers_used === 0

  if (liveMatch) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-4">Transfers</h1>
        <div className="p-6 bg-red-950 border border-red-800 rounded-xl text-center">
          <p className="text-red-300 font-semibold text-lg mb-1">Transfers Locked</p>
          <p className="text-red-400 text-sm">
            {liveMatch.team_a} vs {liveMatch.team_b} is currently live. Transfers open after the match ends.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Transfers</h1>
          {isFirstMatch && (
            <p className="text-green-400 text-sm mt-1">
              First match — transfers are free! Pick your initial 11.
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">Transfers remaining</p>
          <p className="text-white font-bold text-xl">{transfersRemaining} / 220</p>
        </div>
      </div>

      <TransferPanel
        allPlayers={allPlayers ?? []}
        currentSquad={currentSquad}
        transfersRemaining={transfersRemaining}
        isFirstMatch={isFirstMatch}
      />
    </div>
  )
}
