'use client'

import { useState, useRef, useEffect } from 'react'
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

const ALL_TEAMS = ['CSK', 'DC', 'GT', 'KKR', 'LSG', 'MI', 'PBKS', 'RCB', 'RR', 'SRH']

export default function TransferPanel({ allPlayers, currentSquad, isFirstMatch, captainId, viceCaptainId }: Props) {
  const router = useRouter()
  const [squad, setSquad] = useState<Player[]>(currentSquad)
  const [playerOut, setPlayerOut] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<PlayerRole | 'all'>('all')
  const [teamFilter, setTeamFilter] = useState<Set<string>>(new Set())
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTeamDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleTeam(team: string) {
    setTeamFilter(prev => {
      const next = new Set(prev)
      if (next.has(team)) next.delete(team)
      else next.add(team)
      return next
    })
  }

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

  const searchLower = search.toLowerCase()
  const filteredPlayers = allPlayers.filter(p =>
    !squadIds.has(p.id) &&
    (filter === 'all' || p.role === filter) &&
    (teamFilter.size === 0 || teamFilter.has(p.ipl_team)) &&
    (search === '' || p.name.toLowerCase().includes(searchLower))
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

          {/* Team filter dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setTeamDropdownOpen(o => !o)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                teamFilter.size > 0
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
              </svg>
              Teams{teamFilter.size > 0 ? ` (${teamFilter.size})` : ''}
            </button>

            {teamDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 w-44">
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wide">Filter by team</span>
                  {teamFilter.size > 0 && (
                    <button
                      onClick={() => setTeamFilter(new Set())}
                      className="text-[11px] text-blue-400 hover:text-blue-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {ALL_TEAMS.map(team => (
                  <button
                    key={team}
                    onClick={() => toggleTeam(team)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      teamFilter.has(team) ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${
                      teamFilter.has(team) ? 'bg-blue-600 border-blue-500' : 'border-gray-600'
                    }`}>
                      {teamFilter.has(team) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {team}
                  </button>
                ))}
              </div>
            )}
          </div>
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

        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              ✕
            </button>
          )}
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
