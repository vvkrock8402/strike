import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeaderboardTable from '@/components/LeaderboardTable'
type MatchRow = { id: string; team_a: string; team_b: string; match_date: string }

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { tab?: string; match?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tab = searchParams.tab ?? 'season'

  const { data: completedMatches } = await supabase
    .from('matches')
    .select('id, team_a, team_b, match_date')
    .eq('status', 'completed')
    .order('match_date', { ascending: false })

  const selectedMatchId = searchParams.match ?? completedMatches?.[0]?.id

  const [seasonData, matchData] = await Promise.all([
    supabase.rpc('get_season_leaderboard'),
    selectedMatchId
      ? supabase.rpc('get_match_leaderboard', { p_match_id: selectedMatchId })
      : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Leaderboard</h1>

      <div className="flex gap-2 mb-6">
        <a
          href="/leaderboard?tab=season"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'season' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Season
        </a>
        <a
          href="/leaderboard?tab=match"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'match' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Per Match
        </a>
      </div>

      {tab === 'season' ? (
        <LeaderboardTable
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rows={(seasonData.data ?? []) as any[]}
          pointsKey="total_points"
          currentUserId={user.id}
        />
      ) : (
        <>
          {completedMatches && completedMatches.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {completedMatches.map((m: MatchRow) => (
                  <a
                    key={m.id}
                    href={`/leaderboard?tab=match&match=${m.id}`}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      selectedMatchId === m.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {m.team_a} vs {m.team_b}
                  </a>
                ))}
              </div>
              <LeaderboardTable
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rows={(matchData.data ?? []) as any[]}
                pointsKey="match_points"
                currentUserId={user.id}
              />
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No completed matches yet</p>
          )}
        </>
      )}
    </div>
  )
}
