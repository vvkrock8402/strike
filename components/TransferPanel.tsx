'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PlayerCard from './PlayerCard'
import PitchView from './PitchView'
import type { Player, PlayerRole } from '@/lib/types'
import { getTokenTotal, validateSquadComposition } from '@/lib/squad'

interface Props {
  allPlayers: Player[]
  currentSquad: Player[]
  transfersRemaining: number
  isFirstMatch: boolean
  captainId?: string
  viceCaptainId?: string
}

const roles: PlayerRole[] = ['keeper', 'batsman', 'allrounder', 'bowler']
const roleLabels: Record<PlayerRole, string> = {
  keeper: 'WK',
  batsman: 'BAT',
  allrounder: 'ALL',
  bowler: 'BOWL',
}

export default function TransferPanel({ allPlayers, currentSquad, isFirstMatch, captainId, viceCaptainId }: Props) {
  const router = useRouter()
  const [squad, setSquad] = useState<Player[]>(currentSquad)
  const [playerOut, setPlayerOut] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<PlayerRole | 'all'>('all')

  const tokenTotal = getTokenTotal(squad)
  const isInitialSetup = squad.length < 11
  const overBudget = tokenTotal > 110
  const composition = validateSquadComposition(squad)
  const squadIds = new Set(squad.map(p => p.id))

  async function clearTeam() {
    if (!confirm('Clear your entire squad and start over?')) return
    const res = await fetch('/api/squad/clear', { method: 'POST' })
    if (res.ok) {
      setSquad([])
      setPlayerOut(null)
      setError(null)
    }
  }

  const filteredPlayers = allPlayers.filter(
    p => !squadIds.has(p.id) && (filter === 'all' || p.role === filter)
  )

  async function handlePitchClick(player: Player) {
    setError(null)
    if (isInitialSetup) {
      // Remove from squad during initial setup
      const res = await fetch('/api/squad/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerOutId: player.id, isFirstMatch: true, remove: true }),
      })
      if (res.ok) setSquad(prev => prev.filter(p => p.id !== player.id))
      return
    }
    // Select player to transfer out
    setPlayerOut(prev => (prev?.id === player.id ? null : player))
  }

  async function handleAvailableClick(player: Player) {
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
      setError('First tap a player on the pitch to transfer out, then pick a replacement here.')
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

    setSquad(prev => prev.map(p => (p.id === playerOut.id ? player : p)))
    setPlayerOut(null)
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      {/* Pitch view */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">
            Your Squad{' '}
            <span className="text-gray-400 font-normal text-sm">({squad.length}/11)</span>
          </h2>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${overBudget ? 'text-red-400' : 'text-gray-400'}`}>
              {tokenTotal} / 110 Cr
            </span>
            {squad.length > 0 && (
              <button
                onClick={clearTeam}
                className="text-xs text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 px-2 py-1 rounded-lg transition-colors"
              >
                Clear Team
              </button>
            )}
          </div>
        </div>

        {overBudget && (
          <div className="mb-3 p-3 bg-red-950 border border-red-800 rounded-lg text-xs text-red-300">
            Your squad exceeds the 110 Cr limit. Clear your team and rebuild, or swap out expensive players.
          </div>
        )}

        {playerOut && (
          <div className="mb-3 p-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-300 flex items-center justify-between">
            <span>
              Transferring out: <strong>{playerOut.name}</strong> — pick a replacement →
            </span>
            <button onClick={() => setPlayerOut(null)} className="text-red-400 hover:text-red-200 ml-2">✕</button>
          </div>
        )}

        {isInitialSetup && (
          <div className="mb-3 p-3 bg-blue-950 border border-blue-800 rounded-lg text-xs text-blue-300">
            Tap a player on the right to add. Tap a player on the pitch to remove.
          </div>
        )}

        {error && (
          <p className="mb-3 text-red-400 text-sm">{error}</p>
        )}

        {!composition.valid && squad.length === 11 && (
          <div className="mb-3 p-3 bg-yellow-950 border border-yellow-800 rounded-lg">
            {composition.errors.map(e => (
              <p key={e} className="text-yellow-300 text-xs">{e}</p>
            ))}
          </div>
        )}

        <PitchView
          players={squad}
          selectedPlayer={playerOut}
          onPlayerClick={handlePitchClick}
          captainId={captainId}
          viceCaptainId={viceCaptainId}
        />

        {squad.length === 11 && composition.valid && (
          <button
            onClick={() => router.push('/squad')}
            className="mt-4 w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Done — View Squad
          </button>
        )}
      </div>

      {/* Available players */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Available Players</h2>
        </div>

        <div className="flex gap-1 mb-3 flex-wrap">
          {(['all', ...roles] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                filter === r ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {r === 'all' ? 'All' : roleLabels[r]}
            </button>
          ))}
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filteredPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onClick={() => handleAvailableClick(player)}
              showSelect
              selected={false}
            />
          ))}
          {filteredPlayers.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">No players available</p>
          )}
        </div>
      </div>
    </div>
  )
}
