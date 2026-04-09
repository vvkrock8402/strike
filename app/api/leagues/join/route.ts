import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteCode } = await req.json()
  if (!inviteCode) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('invite_code', inviteCode.toUpperCase().trim())
    .maybeSingle()

  if (!league) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  const { error } = await supabase
    .from('league_members')
    .insert({ league_id: league.id, user_id: user.id })

  if (error?.code === '23505') {
    return NextResponse.json({ error: 'Already a member of this league' }, { status: 400 })
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ league })
}
