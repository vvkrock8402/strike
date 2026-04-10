import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: liveMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'live')
    .limit(1)
    .maybeSingle()

  if (liveMatch) {
    return NextResponse.json({ error: 'Cannot clear squad during a live match' }, { status: 400 })
  }

  const { data: squad } = await supabase
    .from('squads')
    .select('id')
    .eq('user_id', user.id)
    .eq('season', 2026)
    .maybeSingle()

  if (!squad) return NextResponse.json({ ok: true })

  await supabase
    .from('squad_players')
    .delete()
    .eq('squad_id', squad.id)

  return NextResponse.json({ ok: true })
}
