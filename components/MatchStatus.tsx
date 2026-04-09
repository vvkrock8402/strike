'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/lib/types'

interface Props {
  initialMatch: Match | null
}

export default function MatchStatus({ initialMatch }: Props) {
  const [match, setMatch] = useState(initialMatch)

  useEffect(() => {
    if (!match) return
    const supabase = createClient()
    const matchId = match.id
    const channel = supabase
      .channel('match-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      }, payload => {
        setMatch(payload.new as Match)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id])

  if (!match) {
    return (
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center">
        <p className="text-gray-500">No upcoming match scheduled</p>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-xl border ${match.status === 'live' ? 'bg-red-950 border-red-800' : 'bg-gray-900 border-gray-800'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-lg">
            {match.team_a} vs {match.team_b}
          </p>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date(match.match_date).toLocaleString()}
          </p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
          match.status === 'live' ? 'bg-red-600 text-white animate-pulse' :
          match.status === 'completed' ? 'bg-gray-700 text-gray-300' :
          'bg-blue-900 text-blue-300'
        }`}>
          {match.status === 'live' ? '● LIVE' : match.status.toUpperCase()}
        </span>
      </div>
    </div>
  )
}
