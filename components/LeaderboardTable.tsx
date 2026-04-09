interface Row {
  user_id: string
  email: string
  total_points?: number
  match_points?: number
}

interface Props {
  rows: Row[]
  pointsKey: 'total_points' | 'match_points'
  currentUserId?: string
}

export default function LeaderboardTable({ rows, pointsKey, currentUserId }: Props) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">No scores yet</p>
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="grid grid-cols-12 px-4 py-2 border-b border-gray-800 text-gray-500 text-xs font-medium uppercase tracking-wide">
        <span className="col-span-1">#</span>
        <span className="col-span-9">Player</span>
        <span className="col-span-2 text-right">Pts</span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.user_id}
          className={`grid grid-cols-12 px-4 py-3 items-center ${
            i < rows.length - 1 ? 'border-b border-gray-800' : ''
          } ${row.user_id === currentUserId ? 'bg-blue-950' : ''}`}
        >
          <span className="col-span-1 text-gray-500 text-sm font-medium">{i + 1}</span>
          <span className="col-span-9 text-white text-sm">
            {row.email}
            {row.user_id === currentUserId && (
              <span className="ml-2 text-blue-400 text-xs">(you)</span>
            )}
          </span>
          <span className="col-span-2 text-white font-bold text-sm text-right">
            {row[pointsKey] ?? 0}
          </span>
        </div>
      ))}
    </div>
  )
}
