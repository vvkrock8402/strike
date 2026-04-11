'use client'

import type { Player } from '@/lib/types'

const roleAvatarColors: Record<string, string> = {
  keeper: 'bg-purple-600',
  batsman: 'bg-blue-600',
  allrounder: 'bg-orange-500',
  bowler: 'bg-green-600',
}

const teamBadgeColors: Record<string, string> = {
  MI: 'bg-blue-700',
  CSK: 'bg-yellow-500',
  RCB: 'bg-red-600',
  KKR: 'bg-violet-700',
  DC: 'bg-blue-500',
  SRH: 'bg-orange-500',
  PBKS: 'bg-red-500',
  RR: 'bg-pink-500',
  LSG: 'bg-teal-500',
  GT: 'bg-slate-500',
}

const roleLabels: Record<string, string> = {
  keeper: 'WICKET KEEPERS',
  batsman: 'BATSMEN',
  allrounder: 'ALL-ROUNDERS',
  bowler: 'BOWLERS',
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getLastName(name: string): string {
  const parts = name.trim().split(' ')
  return parts[parts.length - 1]
}

interface PlayerCircleProps {
  player: Player
  selected?: boolean
  isCaptain?: boolean
  isViceCaptain?: boolean
  onClick?: () => void
  scored?: number
}

function PlayerCircle({ player, selected, isCaptain, isViceCaptain, onClick, scored }: PlayerCircleProps) {
  const initials = getInitials(player.name)
  const avatarColor = roleAvatarColors[player.role] ?? 'bg-gray-600'
  const badgeColor = teamBadgeColors[player.ipl_team] ?? 'bg-gray-600'
  const ringClass = selected
    ? 'ring-4 ring-yellow-400 opacity-80'
    : isCaptain
    ? 'ring-4 ring-yellow-400'
    : isViceCaptain
    ? 'ring-4 ring-gray-300'
    : 'ring-2 ring-white/40 group-hover:ring-white/80'

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center gap-1 cursor-pointer group select-none"
    >
      <div className="relative">
        <div
          className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs sm:text-sm transition-all group-hover:scale-110 ${player.image_url ? 'bg-gray-700' : avatarColor} ${ringClass}`}
        >
          {player.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.image_url} alt={player.name} className="w-full h-full object-cover object-top" />
          ) : (
            initials
          )}
        </div>
        {/* Team badge */}
        <div
          className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full ${badgeColor} border-2 border-[#1e5c2a] flex items-center justify-center`}
        >
          <span className="text-white font-bold leading-none" style={{ fontSize: '4px' }}>
            {player.ipl_team}
          </span>
        </div>
        {/* Captain / VC badge */}
        {(isCaptain || isViceCaptain) && (
          <div
            className={`absolute -top-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-[#1e5c2a] flex items-center justify-center text-[8px] sm:text-[9px] font-bold ${
              isCaptain ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-300 text-gray-800'
            }`}
          >
            {isCaptain ? 'C' : 'V'}
          </div>
        )}
      </div>
      <span className="text-white text-[10px] sm:text-xs font-semibold text-center leading-tight max-w-[56px] sm:max-w-[72px] truncate drop-shadow">
        {getLastName(player.name)}
      </span>
      {scored !== undefined ? (
        <span className={`text-[9px] sm:text-[11px] font-bold ${scored > 0 ? 'text-yellow-300' : 'text-emerald-200/60'}`}>
          {scored} pts
        </span>
      ) : (
        <span className="text-emerald-200 text-[9px] sm:text-[10px] font-medium">
          {player.token_value} Cr
        </span>
      )}
    </div>
  )
}

const ROLE_ORDER = ['keeper', 'batsman', 'allrounder', 'bowler'] as const

interface Props {
  players: Player[]
  selectedPlayer?: Player | null
  onPlayerClick?: (player: Player) => void
  captainId?: string
  viceCaptainId?: string
  pointsMap?: Record<string, number>
}

export default function PitchView({ players, selectedPlayer, onPlayerClick, captainId, viceCaptainId, pointsMap }: Props) {
  const byRole: Record<string, Player[]> = {
    keeper: [],
    batsman: [],
    allrounder: [],
    bowler: [],
  }
  for (const p of players) {
    if (byRole[p.role]) byRole[p.role].push(p)
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden min-h-[400px]"
      style={{
        background: 'linear-gradient(180deg, #1a5c2a 0%, #2e7d3a 40%, #2e7d3a 60%, #1a5c2a 100%)',
      }}
    >
      {/* Pitch strip */}
      <div className="absolute left-1/2 top-[10%] bottom-[10%] w-[22%] -translate-x-1/2 bg-[#c8a96e]/20 border border-[#c8a96e]/30 rounded" />
      {/* Boundary */}
      <div className="absolute inset-4 rounded-full border border-white/10 pointer-events-none" />

      <div className="relative z-10 px-4 py-6 space-y-5">
        {ROLE_ORDER.map((role) => {
          const rolePlayers = byRole[role]
          return (
            <div key={role} className="flex flex-col items-center gap-3">
              <span className="text-white/50 text-[9px] font-bold tracking-widest">
                {roleLabels[role]}
              </span>
              {rolePlayers.length > 0 ? (
                <div className="flex justify-center gap-2 sm:gap-5 flex-wrap">
                  {rolePlayers.map((player) => (
                    <PlayerCircle
                      key={player.id}
                      player={player}
                      selected={selectedPlayer?.id === player.id}
                      isCaptain={captainId === player.id}
                      isViceCaptain={viceCaptainId === player.id}
                      onClick={() => onPlayerClick?.(player)}
                      scored={pointsMap ? (pointsMap[player.id] ?? 0) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-14 flex items-center">
                  <span className="text-white/20 text-xs">Empty</span>
                </div>
              )}
            </div>
          )
        })}

        {players.length < 11 && (
          <p className="text-center text-emerald-200/50 text-xs pt-2">
            {11 - players.length} more player{11 - players.length !== 1 ? 's' : ''} needed
          </p>
        )}
      </div>
    </div>
  )
}
