'use client'

import { useState } from 'react'
import PitchView from './PitchView'
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
  const [updating, setUpdating] = useState(false)
  const [localPlayers, setLocalPlayers] = useState(players)
  const [selected, setSelected] = useState<SquadPlayerWithDetails | null>(null)

  const captain = localPlayers.find(p => p.is_captain)
  const viceCaptain = localPlayers.find(p => p.is_vice_captain)

  async function setCaptain(playerId: string, type: 'captain' | 'vice_captain') {
    if (matchLocked || !matchId || updating) return
    setUpdating(true)

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
          // Clear the opposite role if same player was holding it
          ...(type === 'captain' && p.id !== playerId ? { is_captain: false } : {}),
          ...(type === 'vice_captain' && p.id !== playerId ? { is_vice_captain: false } : {}),
        }))
      )
    }
    setUpdating(false)
    setSelected(null)
  }

  function handlePlayerClick(player: Player) {
    if (matchLocked || !matchId) return
    const full = localPlayers.find(p => p.id === player.id) ?? null
    setSelected(prev => (prev?.id === player.id ? null : full))
  }

  const overBudget = tokenTotal > 110

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-4 p-4 bg-gray-900 rounded-xl border border-gray-800">
        <div>
          <p className="text-gray-400 text-xs">Token Total</p>
          <p className={`font-bold text-lg ${overBudget ? 'text-red-400' : 'text-white'}`}>
            {tokenTotal} / 110
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Transfers Left</p>
          <p className="text-white font-bold text-lg">{transfersRemaining}</p>
        </div>
        {matchLocked && (
          <span className="ml-auto text-red-400 text-sm font-medium bg-red-950 px-3 py-1 rounded-full">
            Match locked
          </span>
        )}
      </div>

      {overBudget && (
        <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-xl text-sm text-red-300">
          Your squad exceeds the 110 Cr token limit. Go to Transfers and swap out a player.
        </div>
      )}

      {!matchLocked && matchId && (
        <p className="text-gray-500 text-xs mb-3 text-center">
          Tap a player on the pitch to set as Captain or Vice Captain
        </p>
      )}

      {/* Captain/VC summary */}
      {(captain || viceCaptain) && (
        <div className="flex gap-3 mb-4">
          {captain && (
            <div className="flex items-center gap-2 bg-yellow-950 border border-yellow-800 rounded-lg px-3 py-2 text-sm">
              <span className="text-yellow-400 font-bold">C</span>
              <span className="text-white">{captain.name}</span>
            </div>
          )}
          {viceCaptain && (
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-300 font-bold">VC</span>
              <span className="text-white">{viceCaptain.name}</span>
            </div>
          )}
        </div>
      )}

      <PitchView
        players={localPlayers}
        selectedPlayer={selected}
        onPlayerClick={handlePlayerClick}
        captainId={captain?.id}
        viceCaptainId={viceCaptain?.id}
      />

      {/* Action panel when player selected */}
      {selected && !matchLocked && matchId && (
        <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-xl">
          <p className="text-white font-semibold mb-3">{selected.name}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setCaptain(selected.id, 'captain')}
              disabled={updating || selected.is_captain}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white transition-colors"
            >
              {selected.is_captain ? 'Already Captain' : 'Set as Captain (C)'}
            </button>
            <button
              onClick={() => setCaptain(selected.id, 'vice_captain')}
              disabled={updating || selected.is_vice_captain}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white transition-colors"
            >
              {selected.is_vice_captain ? 'Already VC' : 'Set as Vice Captain (VC)'}
            </button>
            <button
              onClick={() => setSelected(null)}
              className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
