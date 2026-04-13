'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/lib/types'

interface Props {
  initialMatch: Match | null
}

export default function MatchStatus({ initialMatch }: Props) {
  const [match, setMatch] = useState(initialMatch)
  const router = useRouter()

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
        const updated = payload.new as Match
        setMatch(updated)
        // Reload server component data so nextUpcomingMatch, live squad, etc. all update
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id])

  // When upcoming: render nothing but keep subscription alive so we react when it goes live
  if (!match || match.status === 'upcoming') return null

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
