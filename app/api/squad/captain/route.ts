import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerId, type, matchId } = await req.json()

  const { data: match } = await supabase
    .from('matches')
    .select('status')
    .eq('id', matchId)
    .single()

  if (!match || match.status === 'live' || match.status === 'completed') {
    return NextResponse.json({ error: 'Match is locked' }, { status: 400 })
  }

  const { data: squad } = await supabase
    .from('squads')
    .select('id')
    .eq('user_id', user.id)
    .eq('season', 2026)
    .single()

  if (!squad) return NextResponse.json({ error: 'No squad found' }, { status: 404 })

  if (type === 'captain') {
    await supabase
      .from('match_selections')
      .update({ is_captain: false })
      .eq('squad_id', squad.id)
      .eq('match_id', matchId)

    await supabase
      .from('match_selections')
      .update({ is_captain: true })
      .eq('squad_id', squad.id)
      .eq('match_id', matchId)
      .eq('player_id', playerId)
  } else {
    await supabase
      .from('match_selections')
      .update({ is_vice_captain: false })
      .eq('squad_id', squad.id)
      .eq('match_id', matchId)

    await supabase
      .from('match_selections')
      .update({ is_vice_captain: true })
      .eq('squad_id', squad.id)
      .eq('match_id', matchId)
      .eq('player_id', playerId)
  }

  return NextResponse.json({ ok: true })
}
