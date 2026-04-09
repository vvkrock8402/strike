'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PlayerCard from './PlayerCard'
import type { Player, PlayerRole } from '@/lib/types'
import { getTokenTotal, validateSquadComposition } from '@/lib/squad'

interface Props {
  allPlayers: Player[]
  currentSquad: Player[]
  transfersRemaining: number
  isFirstMatch: boolean
}

const roles: PlayerRole[] = ['keeper', 'batsman', 'allrounder', 'bowler']

export default function TransferPanel({ allPlayers, currentSquad, isFirstMatch }: Props) {
  const router = useRouter()
  const [squad, setSquad] = useState<Player[]>(currentSquad)
  const [playerOut, setPlayerOut] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<PlayerRole | 'all'>('all')

  const tokenTotal = getTokenTotal(squad)
  const isInitialSetup = squad.length < 11
  const composition = validateSquadComposition(squad)
  const squadIds = new Set(squad.map(p => p.id))

  const filteredPlayers = allPlayers.filter(p =>
    !squadIds.has(p.id) && (filter === 'all' || p.role === filter)
  )

  async function handlePlayerClick(player: Player) {
    setError(null)

    if (isInitialSetup) {
      if (squad.length >= 11) return
      const newSquad = [...squad, player]
      const newTotal = getTokenTotal(newSquad)
      if (newTotal > 110) {
        setError(`Adding ${player.name} would exceed 110 token budget (${newTotal}/110)`)
        return
      }
      const res = await fetch('/api/squad/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerInId: player.id, isFirstMatch: true }),
      })
      if (res.ok) setSquad(newSquad)
      return
    }

    if (!playerOut) {
      if (squadIds.has(player.id)) {
        setPlayerOut(player)
      }
      return
    }

    const res = await fetch('/api/squad/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerOutId: playerOut.id,
        playerInId: player.id,
        isFirstMatch,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      return
    }

    setSquad(prev => prev.map(p => p.id === playerOut.id ? player : p))
    setPlayerOut(null)
    router.refresh()
  }

  function removeFromSquad(player: Player) {
    setSquad(prev => prev.filter(p => p.id !== player.id))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Your Squad ({squad.length}/11)
          </h2>
          <span className={`text-sm font-medium ${tokenTotal > 110 ? 'text-red-400' : 'text-gray-400'}`}>
            {tokenTotal}/110 tokens
          </span>
        </div>

        {playerOut && (
          <div className="mb-3 p-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-300">
            Selling: <strong>{playerOut.name}</strong> — click a player on the right to buy
            <button onClick={() => setPlayerOut(null)} className="ml-2 text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {error && <p className="mb-3 text-red-400 text-sm">{error}</p>}

        {!composition.valid && squad.length === 11 && (
          <div className="mb-3 p-3 bg-yellow-950 border border-yellow-800 rounded-lg">
            {composition.errors.map(e => (
              <p key={e} className="text-yellow-300 text-xs">{e}</p>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {squad.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              selected={playerOut?.id === player.id}
              onClick={() => isInitialSetup ? removeFromSquad(player) : handlePlayerClick(player)}
              showSelect={false}
            />
          ))}
          {squad.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">
              Click players on the right to add them to your squad
            </p>
          )}
        </div>

        {squad.length === 11 && composition.valid && (
          <button
            onClick={() => router.push('/squad')}
            className="mt-4 w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Done — View Squad
          </button>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Available Players</h2>
          <div className="flex gap-1">
            {(['all', ...roles] as const).map(r => (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`text-xs px-2 py-1 rounded-lg capitalize transition-colors ${
                  filter === r ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filteredPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onClick={() => handlePlayerClick(player)}
              showSelect
              selected={false}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
