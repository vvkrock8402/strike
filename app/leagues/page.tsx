'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface League {
  id: string
  name: string
  invite_code: string
}

export default function LeaguesPage() {
  const router = useRouter()
  const [leagues, setLeagues] = useState<League[]>([])
  const [newLeagueName, setNewLeagueName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadLeagues() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('league_members')
        .select('leagues(id, name, invite_code)')
        .eq('user_id', user.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLeagues((data ?? []).map((row: any) => row.leagues as League))
    }
    loadLeagues()
  }, [])

  async function createLeague(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLeagueName }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    setLeagues(prev => [...prev, data.league])
    setNewLeagueName('')
    setLoading(false)
  }

  async function joinLeague(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/leagues/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: joinCode }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    setLeagues(prev => [...prev, data.league])
    setJoinCode('')
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-8">Private Leagues</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <form onSubmit={createLeague} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Create League</h2>
          <input
            type="text"
            value={newLeagueName}
            onChange={e => setNewLeagueName(e.target.value)}
            placeholder="League name"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-3"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            Create
          </button>
        </form>

        <form onSubmit={joinLeague} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Join League</h2>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            placeholder="6-character invite code"
            required
            maxLength={6}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-3 uppercase tracking-widest"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            Join
          </button>
        </form>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <h2 className="text-lg font-semibold text-white mb-4">Your Leagues</h2>
      {leagues.length === 0 ? (
        <p className="text-gray-500 text-sm">You haven&apos;t joined any leagues yet.</p>
      ) : (
        <div className="space-y-2">
          {leagues.map(league => (
            <div
              key={league.id}
              onClick={() => router.push(`/leagues/${league.id}`)}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl px-4 py-3 cursor-pointer transition-colors"
            >
              <span className="text-white font-medium">{league.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs font-mono tracking-widest">{league.invite_code}</span>
                <span className="text-gray-500 text-sm">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
