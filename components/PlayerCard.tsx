import type { Player } from '@/lib/types'

const roleColors: Record<string, string> = {
  batsman: 'bg-blue-900 text-blue-300',
  bowler: 'bg-green-900 text-green-300',
  keeper: 'bg-purple-900 text-purple-300',
  allrounder: 'bg-orange-900 text-orange-300',
}

interface Props {
  player: Player
  selected?: boolean
  onClick?: () => void
  showSelect?: boolean
}

export default function PlayerCard({ player, selected, onClick, showSelect }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 border rounded-xl p-4 flex items-center justify-between transition-all ${
        selected ? 'border-blue-500 bg-blue-950' : 'border-gray-800 hover:border-gray-600'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div>
          <p className="font-semibold text-white text-sm">{player.name}</p>
          <p className="text-gray-500 text-xs">{player.ipl_team}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[player.role]}`}>
          {player.role}
        </span>
        <span className="text-white font-bold text-sm bg-gray-800 px-2 py-1 rounded-lg">
          {player.token_value}
        </span>
        {showSelect && (
          <span className={`text-xs font-medium ml-1 ${selected ? 'text-blue-400' : 'text-gray-600'}`}>
            {selected ? '✓' : '+'}
          </span>
        )}
      </div>
    </div>
  )
}
