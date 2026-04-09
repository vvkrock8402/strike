'use client'

import { useState } from 'react'
import type { Player } from '@/lib/types'

interface SquadPlayerWithDetails extends Player {
  is_captain: boolean
  is_vice_captain: boolean
}

interface Props {
  players: SquadPlayerWithDetails[]
  matchId: string | null
  matchLocked: boolean
  tokenTotal: number
  transfersRemaining: number
}

export default function SquadGrid({ players, matchId, matchLocked, tokenTotal, transfersRemaining }: Props) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [localPlayers, setLocalPlayers] = useState(players)

  async function setCaptain(playerId: string, type: 'captain' | 'vice_captain') {
    if (matchLocked || !matchId) return
    setUpdating(playerId)

    const res = await fetch('/api/squad/captain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, type, matchId }),
    })

    if (res.ok) {
      setLocalPlayers(prev =>
        prev.map(p => ({
          ...p,
          is_captain: type === 'captain' ? p.id === playerId : p.is_captain,
          is_vice_captain: type === 'vice_captain' ? p.id === playerId : p.is_vice_captain,
        }))
      )
    }
    setUpdating(null)
  }

  return (
    <div>
      <div className="flex items-center gap-6 mb-6 p-4 bg-gray-900 rounded-xl border border-gray-800">
        <div>
          <p className="text-gray-400 text-xs">Token Total</p>
          <p className="text-white font-bold text-lg">{tokenTotal} / 110</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Transfers Left</p>
          <p className="text-white font-bold text-lg">{transfersRemaining}</p>
        </div>
        {matchLocked && (
          <span className="ml-auto text-red-400 text-sm font-medium bg-red-950 px-3 py-1 rounded-full">
            Match locked — no changes
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {localPlayers.map(player => (
          <div
            key={player.id}
            className={`bg-gray-900 border rounded-xl p-4 flex items-center justify-between ${
              player.is_captain ? 'border-yellow-500' : player.is_vice_captain ? 'border-gray-400' : 'border-gray-800'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white text-sm">{player.name}</p>
                {player.is_captain && (
                  <span className="text-xs bg-yellow-700 text-yellow-200 px-1.5 py-0.5 rounded font-bold">C</span>
                )}
                {player.is_vice_captain && (
                  <span className="text-xs bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded font-bold">VC</span>
                )}
              </div>
              <p className="text-gray-500 text-xs">{player.ipl_team} · {player.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm bg-gray-800 px-2 py-1 rounded-lg">
                {player.token_value}
              </span>
              {!matchLocked && matchId && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setCaptain(player.id, 'captain')}
                    disabled={!!updating || player.is_captain}
                    className="text-xs px-2 py-1 bg-yellow-900 hover:bg-yellow-800 disabled:opacity-40 text-yellow-300 rounded transition-colors"
                  >
                    C
                  </button>
                  <button
                    onClick={() => setCaptain(player.id, 'vice_captain')}
                    disabled={!!updating || player.is_vice_captain}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded transition-colors"
                  >
                    VC
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
