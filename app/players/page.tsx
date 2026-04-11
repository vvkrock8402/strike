import { createClient } from '@/lib/supabase/server'
import PlayerCard from '@/components/PlayerCard'
import type { Player, PlayerRole } from '@/lib/types'

const roles: PlayerRole[] = ['keeper', 'batsman', 'allrounder', 'bowler']

export default async function PlayersPage() {
  const supabase = createClient()
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('token_value', { ascending: false })

  const grouped = roles.reduce((acc, role) => {
    acc[role] = (players ?? []).filter((p: Player) => p.role === role)
    return acc
  }, {} as Record<PlayerRole, Player[]>)

  const roleLabels: Record<PlayerRole, string> = {
    keeper: 'Wicket Keepers',
    batsman: 'Batsmen',
    allrounder: 'All-Rounders',
    bowler: 'Bowlers',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-white mb-6">All Players</h1>
      {roles.map(role => (
        <div key={role} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-300 mb-3">{roleLabels[role]}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {grouped[role].map((player: Player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
