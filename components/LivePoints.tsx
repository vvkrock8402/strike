'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculatePlayerPoints, applyMultiplier } from '@/lib/scoring'
import PitchView from './PitchView'
import Link from 'next/link'
import type { Player, PlayerMatchPoints } from '@/lib/types'

interface PlayerWithSelection extends Player {
  is_captain: boolean
  is_vice_captain: boolean
  points?: PlayerMatchPoints
}

interface Props {
  initialPlayers: PlayerWithSelection[]
  matchId: string | null
  isLive?: boolean
}

export default function LivePoints({ initialPlayers, matchId, isLive }: Props) {
  const [players, setPlayers] = useState(initialPlayers)

  useEffect(() => {
    if (!matchId) return
    const supabase = createClient()
    const channel = supabase
      .channel('live-points')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_match_points',
        filter: `match_id=eq.${matchId}`,
      }, payload => {
        const updated = payload.new as PlayerMatchPoints
        setPlayers(prev =>
          prev.map(p =>
            p.id === updated.player_id ? { ...p, points: updated } : p
          )
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  const captain = players.find(p => p.is_captain)
  const viceCaptain = players.find(p => p.is_vice_captain)

  const totalMatchPoints = players.reduce((sum, p) => {
    const raw = p.points ? calculatePlayerPoints(p.points) : 0
    const role = p.is_captain ? 'captain' : p.is_vice_captain ? 'vice_captain' : 'normal'
    return sum + applyMultiplier(raw, role)
  }, 0)

  const pointsMap: Record<string, number> = {}
  for (const p of players) {
    const raw = p.points ? calculatePlayerPoints(p.points) : 0
    const role = p.is_captain ? 'captain' : p.is_vice_captain ? 'vice_captain' : 'normal'
    pointsMap[p.id] = applyMultiplier(raw, role)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">
          {matchId ? 'Live Squad' : 'Your Squad'}
        </h2>
        {matchId && (
          <span className="text-2xl font-black text-white">{totalMatchPoints} pts</span>
        )}
      </div>

      {matchId && (captain || viceCaptain) && (
        <div className="flex gap-3 mb-4">
          {captain && (
            <div className="flex items-center gap-2 bg-yellow-950 border border-yellow-800 rounded-lg px-3 py-2 text-sm">
              <span className="text-yellow-400 font-bold">C</span>
              <span className="text-white">{captain.name}</span>
              <span className="text-yellow-400 text-xs font-medium">×3</span>
            </div>
          )}
          {viceCaptain && (
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-300 font-bold">VC</span>
              <span className="text-white">{viceCaptain.name}</span>
              <span className="text-gray-400 text-xs font-medium">×2</span>
            </div>
          )}
        </div>
      )}

      {matchId && !captain && !viceCaptain && (
        isLive ? (
          <div className="flex items-center gap-2 mb-4 p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-400">
            <span className="font-bold text-gray-500">C</span>
            <span>No captain was set before this match started — no multipliers applied</span>
          </div>
        ) : (
          <Link
            href="/squad"
            className="flex items-center gap-2 mb-4 p-3 bg-yellow-950 border border-yellow-800 rounded-xl text-sm text-yellow-300 hover:bg-yellow-900 transition-colors"
          >
            <span className="font-bold">C</span>
            <span className="flex-1">No captain set for this match — tap here to set your Captain &amp; Vice Captain</span>
            <span className="text-yellow-500">→</span>
          </Link>
        )
      )}

      <PitchView
        players={players}
        captainId={captain?.id}
        viceCaptainId={viceCaptain?.id}
        pointsMap={matchId ? pointsMap : undefined}
      />
    </div>
  )
}
