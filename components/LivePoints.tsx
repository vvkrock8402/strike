'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculatePlayerPoints, applyMultiplier } from '@/lib/scoring'
import type { Player, PlayerMatchPoints } from '@/lib/types'

interface PlayerWithSelection extends Player {
  is_captain: boolean
  is_vice_captain: boolean
  points?: PlayerMatchPoints
}

interface Props {
  initialPlayers: PlayerWithSelection[]
  matchId: string | null
}

export default function LivePoints({ initialPlayers, matchId }: Props) {
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

  const totalMatchPoints = players.reduce((sum, p) => {
    const raw = p.points ? calculatePlayerPoints(p.points) : 0
    const role = p.is_captain ? 'captain' : p.is_vice_captain ? 'vice_captain' : 'normal'
    return sum + applyMultiplier(raw, role)
  }, 0)

  const captain = players.find(p => p.is_captain)
  const viceCaptain = players.find(p => p.is_vice_captain)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">Live Squad Points</h2>
        <span className="text-2xl font-black text-white">{totalMatchPoints} pts</span>
      </div>

      {(captain || viceCaptain) && (
        <div className="flex gap-3 mb-4">
          {captain && (
            <div className="flex items-center gap-2 bg-yellow-950 border border-yellow-800 rounded-lg px-3 py-2 text-sm">
              <span className="text-yellow-400 font-bold">C</span>
              <span className="text-white">{captain.name}</span>
              <span className="text-yellow-400 text-xs font-medium">×2</span>
            </div>
          )}
          {viceCaptain && (
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-300 font-bold">VC</span>
              <span className="text-white">{viceCaptain.name}</span>
              <span className="text-gray-400 text-xs font-medium">×1.5</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {players
          .slice()
          .sort((a, b) => {
            const aRaw = a.points ? calculatePlayerPoints(a.points) : 0
            const bRaw = b.points ? calculatePlayerPoints(b.points) : 0
            const aRole = a.is_captain ? 'captain' : a.is_vice_captain ? 'vice_captain' : 'normal'
            const bRole = b.is_captain ? 'captain' : b.is_vice_captain ? 'vice_captain' : 'normal'
            return applyMultiplier(bRaw, bRole) - applyMultiplier(aRaw, aRole)
          })
          .map(player => {
            const raw = player.points ? calculatePlayerPoints(player.points) : 0
            const role = player.is_captain ? 'captain' : player.is_vice_captain ? 'vice_captain' : 'normal'
            const scored = applyMultiplier(raw, role)
            return (
              <div key={player.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{player.name}</span>
                    {player.is_captain && <span className="text-xs bg-yellow-700 text-yellow-200 px-1.5 py-0.5 rounded font-bold">C</span>}
                    {player.is_vice_captain && <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-bold">VC</span>}
                  </div>
                  <span className="text-gray-500 text-xs">{player.ipl_team}</span>
                </div>
                <span className="text-white font-bold">{scored}</span>
              </div>
            )
          })}
      </div>
    </div>
  )
}
